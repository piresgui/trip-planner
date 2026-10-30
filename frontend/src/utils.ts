import type { Category } from "./types";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const pad = (n: number) => String(n).padStart(2, "0");

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export const today = () => toISO(new Date());

export function daysBetween(start: string, end: string): string[] {
  if (!start || !end || end < start) return start ? [start] : [];
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 366; d = addDays(d, 1)) out.push(d);
  return out;
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

const dayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" });
const shortFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
const longFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" });

export const fmtDay = (s: string) => dayFmt.format(parseDate(s)).replace(/\./g, "");
export const fmtShort = (s: string) => shortFmt.format(parseDate(s)).replace(/\./g, "");

export function fmtRange(a: string, b: string): string {
  if (!a) return "";
  if (!b || a === b) return longFmt.format(parseDate(a)).replace(/\./g, "");
  return `${fmtShort(a)} – ${longFmt.format(parseDate(b)).replace(/\./g, "")}`;
}

export function money(v: number, currency = "BRL"): string {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v || 0);
  } catch {
    return `${currency} ${(v || 0).toFixed(2)}`;
  }
}

export function countdown(start: string, end: string): { label: string; tone: "future" | "now" | "past" } {
  const t = today();
  const toStart = diffDays(t, start);
  if (toStart > 1) return { label: `Faltam ${toStart} dias`, tone: "future" };
  if (toStart === 1) return { label: "Começa amanhã!", tone: "future" };
  if (t <= end) return { label: `Em viagem · dia ${diffDays(start, t) + 1}`, tone: "now" };
  return { label: "Viagem concluída", tone: "past" };
}

export const CATEGORIES: Record<Category, { label: string; emoji: string; color: string }> = {
  passeio: { label: "Passeio", emoji: "🏛️", color: "#6366f1" },
  comida: { label: "Comida", emoji: "🍽️", color: "#f59e0b" },
  transporte: { label: "Transporte", emoji: "🚆", color: "#0ea5e9" },
  hospedagem: { label: "Hospedagem", emoji: "🏨", color: "#10b981" },
  compras: { label: "Compras", emoji: "🛍️", color: "#ec4899" },
  outro: { label: "Outro", emoji: "📌", color: "#64748b" },
};
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];

/** "14h30 Museu" / "9:00 Café" → { time: "14:30", title: "Museu" } */
export function parseQuickAdd(text: string): { time: string; title: string } {
  const m = text.trim().match(/^(\d{1,2})(?:[:h](\d{2})?)?h?\s+(.+)$/i);
  if (m && Number(m[1]) < 24) {
    return { time: `${pad(Number(m[1]))}:${m[2] ?? "00"}`, title: m[3].trim() };
  }
  return { time: "", title: text.trim() };
}

/** Palpite de categoria a partir do título */
export function guessCategory(title: string): Category {
  const t = title.toLowerCase();
  if (/(almo|jantar|caf[eé]|restaurante|bar |pizza|lanche|brunch|comer)/.test(t)) return "comida";
  if (/(voo|aeroporto|trem|[oô]nibus|metr[oô]|uber|t[aá]xi|transfer|carro)/.test(t)) return "transporte";
  if (/(hotel|check-?in|check-?out|hostel|airbnb|pousada)/.test(t)) return "hospedagem";
  if (/(compra|shopping|loja|feira|mercado)/.test(t)) return "compras";
  if (/(museu|tour|passeio|praia|parque|igreja|mirante|show|trilha|visita)/.test(t)) return "passeio";
  return "outro";
}

export const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
