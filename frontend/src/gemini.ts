import { today } from "./utils";
import type { AiOption, AiResult, TransportPlan } from "./types";

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

function parseJson(text: string): Partial<AiResult> {
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    return JSON.parse(block);
  } catch {
    return { summary: text.trim(), options: [], tips: [] };
  }
}

const MODES = new Set(["aviao", "onibus", "outro"]);
const safeUrl = (u: unknown) => (typeof u === "string" && /^https?:\/\//.test(u) ? u : "");

export async function searchWithGemini(p: TransportPlan, apiKey: string, signal?: AbortSignal): Promise<AiResult> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt(p) }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2 },
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
  const parsed = parseJson(text);

  const options: AiOption[] = (Array.isArray(parsed.options) ? parsed.options : [])
    .map((o) => ({
      mode: MODES.has(o?.mode) ? o.mode : "outro",
      company: String(o?.company ?? ""),
      route: String(o?.route ?? ""),
      price: String(o?.price ?? ""),
      priceValue: Number(o?.priceValue) || 0,
      duration: String(o?.duration ?? ""),
      details: String(o?.details ?? ""),
      url: safeUrl(o?.url),
    }))
    .sort((a, b) => (a.priceValue || Infinity) - (b.priceValue || Infinity));

  const seen = new Set<string>();
  const sources = (cand?.groundingMetadata?.groundingChunks ?? [])
    .map((c) => ({ title: c.web?.title ?? "", uri: safeUrl(c.web?.uri) }))
    .filter((s) => s.uri && !seen.has(s.title + s.uri) && seen.add(s.title + s.uri));

  return {
    at: Date.now(),
    summary: String(parsed.summary ?? "").replace(/\*\*|__/g, ""),
    options,
    tips: (Array.isArray(parsed.tips) ? parsed.tips : []).map((t) => String(t).replace(/\*\*|__/g, "")),
    sources,
  };
}
