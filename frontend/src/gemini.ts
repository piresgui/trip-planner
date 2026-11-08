import { today } from "./utils";
import type { AiOption, AiResult, Destination, DiscoverResult, TransportPlan } from "./types";

/**
 * Pesquisa de passagens com a API gratuita do Gemini usando "grounding" com a Busca do Google.
 * A chave fica só no localStorage deste navegador e vai direto para a API do Google.
 */
const KEY_STORAGE = "trip-planner:gemini-key";
const MODEL = "gemini-2.5-flash";

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setApiKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key.trim());
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* storage bloqueado */
  }
}

function buildPrompt(p: TransportPlan): string {
  const trip = p.oneWay || !p.returnDate ? `somente ida em ${p.departDate}` : `ida em ${p.departDate} e volta em ${p.returnDate}`;
  return `Hoje é ${today()}. Você é um assistente de viagens no Brasil. Pesquise na web as opções MAIS BARATAS de transporte de "${p.origin}" para "${p.destination}", ${trip}, para ${p.passengers} passageiro(s).

Considere:
- Voos: Google Flights, Decolar, Skyscanner, Kayak e os sites das companhias (LATAM, GOL, Azul, e internacionais se for o caso), incluindo aeroportos próximos à origem e ao destino.
- Ônibus: ClickBus, Quero Passagem, Guichê Virtual, BuscaÔnibus e as viações da rota (se a rota fizer sentido por terra).
- Combinações (ex.: ônibus até um aeroporto maior + voo) quando puderem sair mais baratas.

Responda APENAS com um bloco \`\`\`json contendo:
{
  "summary": "2-3 frases em português com a recomendação principal",
  "options": [
    {
      "mode": "aviao" | "onibus" | "outro",
      "company": "companhia ou viação",
      "route": "trecho, ex.: NVT → GRU (1 escala)",
      "price": "preço por pessoa como texto, ex.: R$ 389 ou 'a partir de R$ 120'",
      "priceValue": número em reais por pessoa (0 se desconhecido),
      "duration": "duração aproximada",
      "details": "horário, escalas, bagagem ou observações",
      "url": "link da página onde comprar ou pesquisar esta opção"
    }
  ],
  "tips": ["dicas específicas desta rota e destas datas para economizar"]
}
Ordene "options" do mais barato para o mais caro e traga de 4 a 10 opções, misturando avião e ônibus quando fizer sentido. Use apenas preços que você encontrou na pesquisa; se forem estimativas, deixe claro em "price". Escreva texto puro, sem markdown. Não invente links: se não tiver a página exata, use a página de busca do site.`;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
  }[];
  error?: { message?: string; status?: string };
}

function parseJson(text: string): any {
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    return JSON.parse(block);
  } catch {
    return { summary: text.trim() };
  }
}

const MODES = new Set(["aviao", "onibus", "carro", "outro"]);
const safeUrl = (u: unknown) => (typeof u === "string" && /^https?:\/\//.test(u) ? u : "");
const clean = (t: unknown) => String(t ?? "").replace(/\*\*|__/g, "").trim();

async function callGemini(prompt: string, apiKey: string, signal?: AbortSignal) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.3 },
    }),
  });
  const data: GeminiResponse = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error?.message ?? `Erro ${res.status}`;
    if (res.status === 400 && /api key/i.test(msg)) throw new Error("Chave da API inválida. Confira a chave do Gemini.");
    if (res.status === 429) throw new Error("Limite gratuito do Gemini atingido. Tente de novo em alguns minutos.");
    throw new Error(msg);
  }
  const cand = data.candidates?.[0];
  const text = cand?.content?.parts?.map((x) => x.text ?? "").join("") ?? "";
  if (!text) throw new Error("O Gemini não retornou resultado. Tente novamente.");

  const seen = new Set<string>();
  const sources = (cand?.groundingMetadata?.groundingChunks ?? [])
    .map((c) => ({ title: c.web?.title ?? "", uri: safeUrl(c.web?.uri) }))
    .filter((s) => s.uri && !seen.has(s.title + s.uri) && seen.add(s.title + s.uri));

  return { parsed: parseJson(text), sources };
}

function toOptions(list: unknown): AiOption[] {
  return (Array.isArray(list) ? list : [])
    .map((o: any) => ({
      mode: MODES.has(o?.mode) ? o.mode : "outro",
      company: clean(o?.company),
      route: clean(o?.route),
      price: clean(o?.price),
      priceValue: Number(o?.priceValue) || 0,
      duration: clean(o?.duration),
      details: clean(o?.details),
      url: safeUrl(o?.url),
    }))
    .sort((a, b) => (a.priceValue || Infinity) - (b.priceValue || Infinity));
}

export async function searchWithGemini(p: TransportPlan, apiKey: string, signal?: AbortSignal): Promise<AiResult> {
  const { parsed, sources } = await callGemini(buildPrompt(p), apiKey, signal);
  return {
    at: Date.now(),
    summary: clean(parsed.summary),
    options: toOptions(parsed.options),
    tips: (Array.isArray(parsed.tips) ? parsed.tips : []).map(clean),
    sources,
  };
}

/* ---------- Descobrir destinos a partir de um desejo em linguagem natural ---------- */

function discoverPrompt(p: TransportPlan, wish: string): string {
  const when = p.departDate
    ? p.oneWay || !p.returnDate ? `saindo em ${p.departDate}` : `de ${p.departDate} a ${p.returnDate}`
    : "em datas flexíveis";
  return `Hoje é ${today()}. Você é um consultor de viagens no Brasil. A pessoa mora em/sai de "${p.origin}", viaja ${when}, com ${p.passengers} pessoa(s), e descreveu assim o que quer:
"""${wish}"""

Pesquise na web e sugira de 3 a 5 DESTINOS que combinem com esse desejo (respeite orçamento, distância, clima e estilo pedidos). Para cada destino, pesquise como chegar a partir da origem por AVIÃO, ÔNIBUS e CARRO (só os que fizerem sentido) e o custo de cada um.
Para carro, estime combustível + pedágios ida e volta para o grupo e use como url o Google Maps (https://www.google.com/maps/dir/?api=1&origin=...&destination=...).

Responda APENAS com um bloco \`\`\`json, texto puro sem markdown:
{
  "summary": "1-2 frases resumindo as sugestões",
  "destinations": [
    {
      "name": "Cidade, UF ou Cidade, País",
      "emoji": "um emoji",
      "why": "por que combina com o pedido",
      "highlights": ["3 a 5 coisas para fazer"],
      "bestTime": "melhor época / como estará o clima nas datas",
      "estimatedTotal": "custo total estimado por pessoa (transporte + hospedagem + comida), ex.: R$ 1.200 a R$ 1.800",
      "options": [
        { "mode": "aviao" | "onibus" | "carro", "company": "companhia/viação ou 'Carro próprio'", "route": "trecho", "price": "preço por pessoa ida e volta", "priceValue": número em reais por pessoa, "duration": "duração", "details": "observações", "url": "link para comprar/pesquisar" }
      ]
    }
  ],
  "tips": ["dicas gerais"]
}
Use preços encontrados na pesquisa; se forem estimativas, diga em "price". Não invente links: na dúvida, use a página de busca do site.`;
}

export async function discoverWithGemini(p: TransportPlan, wish: string, apiKey: string, signal?: AbortSignal): Promise<DiscoverResult> {
  const { parsed, sources } = await callGemini(discoverPrompt(p, wish), apiKey, signal);
  const destinations: Destination[] = (Array.isArray(parsed.destinations) ? parsed.destinations : []).map((d: any) => ({
    name: clean(d?.name),
    emoji: clean(d?.emoji) || "📍",
    why: clean(d?.why),
    highlights: (Array.isArray(d?.highlights) ? d.highlights : []).map(clean),
    bestTime: clean(d?.bestTime),
    estimatedTotal: clean(d?.estimatedTotal),
    options: toOptions(d?.options),
  })).filter((d: Destination) => d.name);
  if (!destinations.length && !parsed.summary) throw new Error("Não consegui sugestões. Tente descrever de outro jeito.");
  return {
    at: Date.now(),
    wish,
    summary: clean(parsed.summary),
    destinations,
    tips: (Array.isArray(parsed.tips) ? parsed.tips : []).map(clean),
    sources,
  };
}
