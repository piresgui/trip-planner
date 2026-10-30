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
  createdAt: number;
  updatedAt: number;
}
