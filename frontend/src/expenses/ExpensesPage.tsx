import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { addExpense, deleteExpense, getBalances, listExpenses } from "./api";
import { Balance, Expense } from "./types";

export default function ExpensesPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  async function refresh() {
    if (!tripId) return;
    const [expenseData, balanceData] = await Promise.all([listExpenses(tripId), getBalances(tripId)]);
    setExpenses(expenseData);
    setBalances(balanceData);
  }

  useEffect(() => {
    refresh();
  }, [tripId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!tripId) return;
    // No explicit shares: backend splits evenly across all trip participants.
    await addExpense(tripId, { description, amount: Number(amount), currency, date, shares: null });
    setDescription("");
    setAmount("");
    await refresh();
  }

  async function handleDelete(expenseId: string) {
    if (!tripId) return;
    await deleteExpense(tripId, expenseId);
    await refresh();
  }

  return (
    <div>
      <Link to={`/trips/${tripId}`}>&larr; Back to trip</Link>
      <h1>Expenses</h1>

      <h2>Balances</h2>
      <ul>
        {balances.map((b) => (
          <li key={b.userId}>
            {b.userName}: {b.netBalance >= 0 ? "is owed" : "owes"} ${Math.abs(b.netBalance).toFixed(2)}
          </li>
        ))}
      </ul>

      <h2>All expenses</h2>
      <ul>
        {expenses.map((expense) => (
          <li key={expense.id} style={{ marginBottom: 8 }}>
            {expense.description} &mdash; {expense.currency} {expense.amount.toFixed(2)} paid by {expense.paidByName}{" "}
            on {expense.date}
            <button onClick={() => handleDelete(expense.id)} style={{ marginLeft: 8 }}>
              Remove
            </button>
            <ul>
              {expense.shares.map((s) => (
                <li key={s.userId}>
                  {s.userName}: {expense.currency} {s.shareAmount.toFixed(2)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <h2>Add expense</h2>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          placeholder="Amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <input placeholder="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} required />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <button type="submit">Add expense (split evenly)</button>
      </form>
    </div>
  );
}
