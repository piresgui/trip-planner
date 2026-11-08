export type Category = "passeio" | "comida" | "transporte" | "hospedagem" | "compras" | "outro";

export interface Activity {
  id: string;
  /** null = ainda sem dia definido (banco de ideias) */
  date: string | null;
  order: number;
  time: string;
  title: string;
  location: string;
  notes: string;
  cost: number;
  category: Category;
  done: boolean;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  date: string;
  category: Category;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  group: string;
}

export interface AiOption {
  mode: "aviao" | "onibus" | "carro" | "outro";
  company: string;
  route: string;
  price: string;
  priceValue: number;
  duration: string;
  details: string;
  url: string;
}

export interface AiResult {
  at: number;
  summary: string;
  options: AiOption[];
  tips: string[];
  sources: { title: string; uri: string }[];
}

export interface Destination {
  name: string;
  emoji: string;
  why: string;
  highlights: string[];
  bestTime: string;
  estimatedTotal: string;
  options: AiOption[];
}

export interface DiscoverResult {
  at: number;
  wish: string;
  summary: string;
  destinations: Destination[];
  tips: string[];
  sources: { title: string; uri: string }[];
}

export interface TransportPlan {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
  oneWay: boolean;
  passengers: number;
  ai?: AiResult;
  wish?: string;
  discover?: DiscoverResult;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  color: string;
  emoji: string;
  currency: string;
  budget: number;
  travelers: string[];
  activities: Activity[];
  expenses: Expense[];
  checklist: ChecklistItem[];
  notes: string;
  transport?: TransportPlan;
  createdAt: number;
  updatedAt: number;
}
