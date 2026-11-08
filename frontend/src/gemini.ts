import { addDays, diffDays, today } from "./utils";
import type { AiOption, AiPackage, AiResult, Destination, DiscoverResult, TransportPlan } from "./types";

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
  const calStart = addDays(p.departDate, -3) < today() ? today() : addDays(p.departDate, -3);
  const calEnd = addDays(calStart, 6);
  const len = p.returnDate ? Math.max(0, diffDays(p.departDate, p.returnDate)) : 0;
  const trip = p.oneWay || !p.returnDate ? `somente ida em ${p.departDate}` : `ida em ${p.departDate} e volta em ${p.returnDate}`;
  return `Hoje é ${today()}. Você é um assistente de viagens no Brasil. Pesquise na web as opções MAIS BARATAS de transporte de "${p.origin}" para "${p.destination}", ${trip}, para ${p.passengers} passageiro(s).

Considere:
- Voos: Google Flights, Decolar, Skyscanner, Kayak e os sites das companhias (LATAM, GOL, Azul, e internacionais se for o caso), incluindo aeroportos próximos à origem e ao destino.
- Ônibus: ClickBus, Quero Passagem, Guichê Virtual, BuscaÔnibus e as viações da rota (se a rota fizer sentido por terra).
- Carro: carro próprio (combustível + pedágios ida e volta para o grupo, url do Google Maps) e aluguel de carro, quando a distância permitir.
- Carona (BlaBlaCar) e combinações (ex.: ônibus até um aeroporto maior + voo) quando puderem sair mais baratas.
- Vários horários e várias companhias/viações: cada companhia, viação, aeroporto alternativo ou combinação é uma opção separada.
- PACOTES prontos (passagem + hospedagem) para esse destino e período: Decolar, CVC, Hurb, Azul Viagens, LATAM Travel, Smiles Viagens, 123milhas, MaxMilhas, Booking e agências locais.
- CALENDÁRIO: o preço mais barato de ida e volta por pessoa saindo em cada dia de ${calStart} a ${calEnd}${p.oneWay || !p.returnDate ? "" : `, mantendo ${len} noite(s) de viagem`} (como o gráfico de datas do Google Flights). Preencha TODOS os 7 dias com um valor numérico: se não achar o preço exato de um dia, estime pelo preço típico da rota e pelo dia da semana (sexta e domingo mais caros) e marque "estimated": true. Nunca escreva "verificar".

Responda APENAS com um bloco \`\`\`json contendo:
{
  "summary": "2-3 frases em português com a recomendação principal",
  "options": [
    {
      "mode": "aviao" | "onibus" | "carro" | "outro",
      "company": "companhia ou viação",
      "route": "trecho, ex.: NVT → GRU (1 escala)",
      "price": "preço por pessoa como texto, ex.: R$ 389 ou 'a partir de R$ 120'",
      "priceValue": número em reais por pessoa (0 se desconhecido),
      "duration": "duração aproximada",
      "details": "horário, escalas, bagagem ou observações",
      "url": "link da página onde comprar ou pesquisar esta opção"
    }
  ],
  "calendar": [
    { "date": "AAAA-MM-DD (data de ida)", "priceValue": número por pessoa (mais barato do dia, avião ou ônibus), "mode": "aviao" | "onibus", "estimated": true | false }
  ],
  "packages": [
    { "name": "nome do pacote", "provider": "Decolar, CVC, Hurb…", "includes": "o que inclui (voo, hotel, café, transfer…)", "nights": número de noites, "price": "preço por pessoa", "priceValue": número por pessoa, "details": "hotel, datas, observações", "url": "link do pacote ou da busca de pacotes do site" }
  ],
  "tips": ["dicas específicas desta rota e destas datas para economizar"]
}
Ordene "options" do mais barato para o mais caro e traga O MÁXIMO de opções que encontrar (até 15), cobrindo todos os meios de transporte viáveis. Mínimos: 5 voos diferentes (companhias, aeroportos e horários) se houver aeroporto por perto, 3 ônibus se a rota existir por terra, carro próprio se for até ~1.200 km, e 3 pacotes em "packages". Use apenas preços que você encontrou na pesquisa; se forem estimativas, deixe claro em "price". Escreva texto puro, sem markdown. Não invente links: se não tiver a página exata, use a página de busca do site. Links: curtos (até 200 caracteres), sem repetir trechos; prefira a página da rota ou a busca do site.`;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
  }[];
  error?: { message?: string; status?: string };
}

/** Objetos JSON completos dentro do array `key`, mesmo que o texto tenha sido cortado no meio. */
function salvageArray(text: string, key: string): unknown[] {
  const at = text.indexOf(`"${key}"`);
  if (at < 0) return [];
  const start = text.indexOf("[", at);
  if (start < 0) return [];
  const out: unknown[] = [];
  let depth = 0, inStr = false, esc = false, objStart = -1;
  for (let i = start + 1; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") { if (depth++ === 0) objStart = i; }
    else if (c === "}") {
      if (--depth === 0 && objStart >= 0) {
        try { out.push(JSON.parse(text.slice(objStart, i + 1))); } catch { /* objeto ruim: ignora */ }
        objStart = -1;
      }
    } else if (c === "]" && depth === 0) break;
  }
  return out;
}

function salvageObject(text: string, key: string): unknown {
  const m = text.match(new RegExp(`"${key}"\\s*:\\s*(\\{[^{}]*\\})`));
  try { return m ? JSON.parse(m[1]) : undefined; } catch { return undefined; }
}

export function parseJson(text: string): any {
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    return JSON.parse(block);
  } catch {
    // Resposta cortada ou com JSON inválido: aproveita o que veio completo.
    const str = (k: string) => text.match(new RegExp(`"${k}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`))?.[1] ?? "";
    return {
      summary: str("summary"),
      options: salvageArray(text, "options"),
      destinations: salvageArray(text, "destinations"),
      calendar: salvageArray(text, "calendar"),
      packages: salvageArray(text, "packages"),
      tips: [],
      dates: salvageObject(text, "dates"),
      truncated: true,
    };
  }
}

const MODES = new Set(["aviao", "onibus", "carro", "outro"]);
// Links longos demais quase sempre são lixo gerado pela IA (padrões repetidos)
const safeUrl = (u: unknown) => (typeof u === "string" && /^https?:\/\//.test(u) && u.length <= 400 && !/(\/[^/]{1,3})\1{5,}/.test(u) ? u : "");
const clean = (t: unknown) => String(t ?? "").replace(/\*\*|__/g, "").trim();

async function callGemini(prompt: string, apiKey: string, signal?: AbortSignal) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 24000 },
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
  if (parsed.truncated && !parsed.options?.length) throw new Error("A resposta da IA veio incompleta. Tente de novo.");
  const ISO_D = /^\d{4}-\d{2}-\d{2}$/;
  const calendar = (Array.isArray(parsed.calendar) ? parsed.calendar : [])
    .filter((c: any) => ISO_D.test(c?.date))
    .map((c: any) => ({ date: c.date, price: clean(c.price), priceValue: Number(c.priceValue) || 0, mode: c.mode === "onibus" ? "onibus" : "aviao", estimated: !!c.estimated }))
    .sort((a: any, b: any) => a.date.localeCompare(b.date));
  const packages: AiPackage[] = (Array.isArray(parsed.packages) ? parsed.packages : [])
    .map((k: any) => ({
      name: clean(k?.name), provider: clean(k?.provider), includes: clean(k?.includes), nights: Number(k?.nights) || 0,
      price: clean(k?.price), priceValue: Number(k?.priceValue) || 0, details: clean(k?.details), url: safeUrl(k?.url),
    }))
    .filter((k: AiPackage) => k.name || k.provider)
    .sort((a: AiPackage, b: AiPackage) => (a.priceValue || Infinity) - (b.priceValue || Infinity));
  return {
    calendar,
    packages,
    at: Date.now(),
    summary: clean(parsed.summary),
    options: toOptions(parsed.options),
    tips: (Array.isArray(parsed.tips) ? parsed.tips : []).map(clean),
    sources,
  };
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
function parseDates(d: any): DiscoverResult["dates"] {
  if (!d || !ISO.test(d.departDate)) return undefined;
  const returnDate = ISO.test(d.returnDate) && d.returnDate >= d.departDate ? d.returnDate : "";
  const passengers = Math.min(9, Math.max(1, Math.round(Number(d.passengers)) || 0)) || undefined;
  return { departDate: d.departDate, returnDate, passengers, fromText: !!d.fromText, note: clean(d.note) };
}

/* ---------- Descobrir destinos a partir de um desejo em linguagem natural ---------- */

function discoverPrompt(p: TransportPlan, wish: string): string {
  const when = p.departDate
    ? p.oneWay || !p.returnDate ? `saindo em ${p.departDate}` : `de ${p.departDate} a ${p.returnDate}`
    : "em datas flexíveis";
  return `Hoje é ${today()} (${new Date().toLocaleDateString("pt-BR", { weekday: "long" })}). Você é um consultor de viagens no Brasil. A pessoa sai de "${p.origin}". No formulário está: viagem ${when}, com ${p.passengers} pessoa(s). Ela descreveu assim o que quer:
"""${wish}"""

DATAS E PESSOAS: se o texto mencionar quando viajar ou por quanto tempo (ex.: "no carnaval", "próximo feriado", "em março por 5 dias", "fim de semana que vem", "15 dias nas férias de julho"), ISSO TEM PRIORIDADE sobre o formulário. Converta para datas exatas a partir de hoje (feriados do Brasil no ano correto; "fim de semana" = sexta a domingo). Faça o mesmo com o número de pessoas (ex.: "eu e minha esposa" = 2, "família de 4" = 4). Se o texto não falar disso, use o formulário. Use essas datas e pessoas em toda a pesquisa.

Pesquise na web e sugira O MÁXIMO de DESTINOS que combinem com esse desejo (6 a 8, do mais conhecido ao mais alternativo), respeitando orçamento, distância, clima e estilo pedidos. Para CADA destino, liste TODAS as formas viáveis de chegar a partir da origem: AVIÃO (cada companhia e aeroporto alternativo separados), ÔNIBUS (cada viação separada), CARRO próprio, aluguel de carro e carona, com o custo de cada uma.
Para carro, estime combustível + pedágios ida e volta para o grupo e use como url o Google Maps (https://www.google.com/maps/dir/?api=1&origin=...&destination=...).

Responda APENAS com um bloco \`\`\`json, texto puro sem markdown:
{
  "summary": "1-2 frases resumindo as sugestões",
  "dates": { "departDate": "AAAA-MM-DD", "returnDate": "AAAA-MM-DD", "passengers": número, "fromText": true se as datas/pessoas vieram do texto, "note": "como interpretou, ex.: Carnaval 2027: 6 a 10/02" },
  "destinations": [
    {
      "name": "Cidade, UF ou Cidade, País",
      "emoji": "um emoji",
      "why": "por que combina com o pedido",
      "highlights": ["3 a 5 coisas para fazer"],
      "bestTime": "melhor época / como estará o clima nas datas",
      "estimatedTotal": "custo total estimado por pessoa (transporte + hospedagem + comida), ex.: R$ 1.200 a R$ 1.800",
      "options": [
        { "mode": "aviao" | "onibus" | "carro" | "outro", "company": "companhia/viação ou 'Carro próprio'", "route": "trecho", "price": "preço por pessoa ida e volta", "priceValue": número em reais por pessoa, "duration": "duração", "details": "observações", "url": "link para comprar/pesquisar" }
      ]
    }
  ],
  "tips": ["dicas gerais"]
}
Use preços encontrados na pesquisa; se forem estimativas, diga em "price". Não invente links: na dúvida, use a página de busca do site. Links: curtos (até 200 caracteres), sem repetir trechos; prefira a página da rota ou a busca do site. Para caber tudo, seja objetivo nos textos (why, details e highlights curtos) e traga até 8 opções por destino.`;
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
  if (!destinations.length) throw new Error(parsed.truncated ? "A resposta da IA veio incompleta. Tente de novo." : "Não consegui sugestões. Tente descrever de outro jeito.");
  return {
    at: Date.now(),
    wish,
    summary: clean(parsed.summary),
    destinations,
    tips: (Array.isArray(parsed.tips) ? parsed.tips : []).map(clean),
    dates: parseDates(parsed.dates),
    sources,
  };
}
