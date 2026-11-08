import { useSyncExternalStore } from "react";
import type { Trip } from "./types";
import { addDays, today, uid } from "./utils";

/**
 * Armazenamento 100% local: tudo fica no localStorage do navegador.
 * Mantém um histórico curto para "Desfazer" (Ctrl+Z).
 */
const KEY = "trip-planner:v1";

interface State {
  trips: Trip[];
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.trips)) return { trips: parsed.trips.map(normalizeTrip) };
    }
  } catch {
    /* dados corrompidos ou storage bloqueado: começa vazio */
  }
  return { trips: [] };
}

let state: State = load();
const past: State[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    toast("Não foi possível salvar no navegador (armazenamento cheio ou bloqueado).");
  }
}

function commit(next: State, undoable = true) {
  if (undoable) {
    past.push(state);
    if (past.length > 60) past.shift();
  }
  state = next;
  persist();
  emit();
}

// Sincroniza entre abas abertas
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = load();
      emit();
    }
  });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useTrips(): Trip[] {
  return useSyncExternalStore(subscribe, () => state.trips);
}

export function useTrip(id: string | undefined): Trip | undefined {
  return useSyncExternalStore(subscribe, () => state.trips.find((t) => t.id === id));
}

export function undo(): boolean {
  const prev = past.pop();
  if (!prev) return false;
  state = prev;
  persist();
  emit();
  return true;
}

export function normalizeTrip(t: Partial<Trip>): Trip {
  const start = t.startDate || today();
  return {
    id: t.id || uid(),
    title: t.title || "Nova viagem",
    destination: t.destination || "",
    startDate: start,
    endDate: t.endDate && t.endDate >= start ? t.endDate : start,
    color: t.color || "#6366f1",
    emoji: t.emoji || "✈️",
    currency: t.currency || "BRL",
    budget: Number(t.budget) || 0,
    travelers: t.travelers ?? [],
    activities: t.activities ?? [],
    expenses: t.expenses ?? [],
    checklist: t.checklist ?? [],
    notes: t.notes ?? "",
    transport: t.transport,
    createdAt: t.createdAt || Date.now(),
    updatedAt: t.updatedAt || Date.now(),
  };
}

export function createTrip(data: Partial<Trip>): Trip {
  const trip = normalizeTrip({ ...data, id: uid(), createdAt: Date.now() });
  commit({ trips: [...state.trips, trip] });
  return trip;
}

export function updateTrip(id: string, fn: (t: Trip) => Trip, undoable = true) {
  commit(
    { trips: state.trips.map((t) => (t.id === id ? { ...fn(t), updatedAt: Date.now() } : t)) },
    undoable
  );
}

export function deleteTrip(id: string) {
  commit({ trips: state.trips.filter((t) => t.id !== id) });
}

export function duplicateTrip(id: string): Trip | undefined {
  const src = state.trips.find((t) => t.id === id);
  if (!src) return;
  const copy: Trip = {
    ...structuredClone(src),
    id: uid(),
    title: `${src.title} (cópia)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  copy.activities = copy.activities.map((a) => ({ ...a, id: uid(), done: false }));
  copy.checklist = copy.checklist.map((c) => ({ ...c, id: uid(), done: false }));
  copy.expenses = [];
  commit({ trips: [...state.trips, copy] });
  return copy;
}

export function exportAll() {
  return { app: "trip-planner", version: 1, exportedAt: new Date().toISOString(), trips: state.trips };
}

/** Importa um backup (completo ou de uma viagem). Viagens com o mesmo id são substituídas. */
export function importData(data: unknown): number {
  const obj = data as { trips?: unknown; id?: unknown };
  const incoming: Partial<Trip>[] = Array.isArray(obj?.trips)
    ? (obj.trips as Partial<Trip>[])
    : obj && typeof obj === "object" && "activities" in obj
      ? [obj as Partial<Trip>]
      : [];
  if (!incoming.length) throw new Error("Arquivo sem viagens");
  const trips = incoming.map(normalizeTrip);
  const ids = new Set(trips.map((t) => t.id));
  commit({ trips: [...state.trips.filter((t) => !ids.has(t.id)), ...trips] });
  return trips.length;
}

export function createSampleTrip(): Trip {
  const s = addDays(today(), 30);
  const d = (n: number) => addDays(s, n);
  const a = (date: string | null, order: number, time: string, title: string, category: Trip["activities"][0]["category"], cost = 0, location = "") => ({
    id: uid(), date, order, time, title, location, notes: "", cost, category, done: false,
  });
  return createTrip({
    title: "Lisboa & Porto",
    destination: "Portugal",
    startDate: s,
    endDate: d(4),
    emoji: "🏰",
    color: "#f97316",
    currency: "EUR",
    budget: 2500,
    travelers: ["Eu", "Ana", "Bruno"],
    activities: [
      a(s, 0, "09:30", "Voo chegando em Lisboa", "transporte", 0, "Aeroporto Humberto Delgado"),
      a(s, 1, "14:00", "Check-in no hotel", "hospedagem", 0, "Baixa, Lisboa"),
      a(s, 2, "19:30", "Jantar no Time Out Market", "comida", 60, "Time Out Market Lisboa"),
      a(d(1), 0, "10:00", "Torre de Belém", "passeio", 30, "Torre de Belém"),
      a(d(1), 1, "12:00", "Pastéis de Belém", "comida", 15, "Pastéis de Belém"),
      a(d(1), 2, "16:00", "Elétrico 28 pela Alfama", "passeio", 9, "Alfama"),
      a(d(2), 0, "09:00", "Day trip a Sintra", "passeio", 45, "Sintra"),
      a(d(3), 0, "08:30", "Trem para o Porto", "transporte", 75, "Santa Apolónia"),
      a(d(3), 1, "15:00", "Ribeira e Ponte D. Luís", "passeio", 0, "Ribeira, Porto"),
      a(d(4), 0, "11:00", "Livraria Lello", "passeio", 15, "Livraria Lello"),
      a(null, 0, "", "Provar francesinha", "comida", 20),
      a(null, 1, "", "Show de fado", "passeio", 40),
    ],
    expenses: [
      { id: uid(), description: "Hotel em Lisboa (3 noites)", amount: 540, paidBy: "Ana", splitAmong: ["Eu", "Ana", "Bruno"], date: s, category: "hospedagem" },
      { id: uid(), description: "Passagens de trem", amount: 225, paidBy: "Eu", splitAmong: ["Eu", "Ana", "Bruno"], date: d(3), category: "transporte" },
    ],
    checklist: [
      { id: uid(), text: "Passaporte", done: true, group: "Documentos" },
      { id: uid(), text: "Seguro viagem", done: false, group: "Documentos" },
      { id: uid(), text: "Adaptador de tomada (tipo F)", done: false, group: "Eletrônicos" },
      { id: uid(), text: "Casaco leve", done: false, group: "Roupas" },
    ],
    notes: "Comprar ingressos de Sintra com antecedência.\nVer horário do fado na Alfama.",
  });
}

/* ---------- Toasts ---------- */
export interface ToastMsg {
  id: string;
  text: string;
  undo?: boolean;
}
let toasts: ToastMsg[] = [];
const toastListeners = new Set<() => void>();

export function toast(text: string, opts: { undo?: boolean } = {}) {
  const t = { id: uid(), text, undo: opts.undo };
  toasts = [...toasts, t].slice(-3);
  toastListeners.forEach((l) => l());
  setTimeout(() => dismissToast(t.id), opts.undo ? 6000 : 3500);
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  toastListeners.forEach((l) => l());
}

export function useToasts(): ToastMsg[] {
  return useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => toastListeners.delete(l);
    },
    () => toasts
  );
}
