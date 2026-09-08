import { apiFetch } from "../api/client";
import { Balance, Expense } from "./types";

export interface ExpenseInput {
  description: string;
  amount: number;
  currency: string;
  date: string;
  shares?: { userId: string; shareAmount: number }[] | null;
}

export function listExpenses(tripId: string): Promise<Expense[]> {
  return apiFetch<Expense[]>(`/api/trips/${tripId}/expenses`);
}

export function addExpense(tripId: string, input: ExpenseInput): Promise<Expense> {
  return apiFetch<Expense>(`/api/trips/${tripId}/expenses`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteExpense(tripId: string, expenseId: string): Promise<void> {
  return apiFetch<void>(`/api/trips/${tripId}/expenses/${expenseId}`, { method: "DELETE" });
}

export function getBalances(tripId: string): Promise<Balance[]> {
  return apiFetch<Balance[]>(`/api/trips/${tripId}/expenses/balances`);
}
