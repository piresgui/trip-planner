import { useMemo, useState, type FormEvent } from "react";
import { toast, updateTrip } from "../store";
import TravelersInput from "../components/TravelersInput";
import type { Category, Expense, Trip } from "../types";
import { CATEGORIES, CATEGORY_KEYS, fmtShort, money, today, uid } from "../utils";

interface Balance {
  name: string;
  paid: number;
  owed: number;
  net: number;
}

export function computeBalances(trip: Trip): Balance[] {
  const names = new Set(trip.travelers);
  trip.expenses.forEach((e) => { names.add(e.paidBy); e.splitAmong.forEach((n) => names.add(n)); });
  const map = new Map<string, Balance>([...names].map((n) => [n, { name: n, paid: 0, owed: 0, net: 0 }]));
  for (const e of trip.expenses) {
    map.get(e.paidBy)!.paid += e.amount;
    const share = e.splitAmong.length ? e.amount / e.splitAmong.length : 0;
    e.splitAmong.forEach((n) => (map.get(n)!.owed += share));
  }
  return [...map.values()].map((b) => ({ ...b, net: b.paid - b.owed }));
}

/** Menor número de transferências para zerar os saldos (guloso). */
export function settle(balances: Balance[]): { from: string; to: string; amount: number }[] {
  const debt = balances.filter((b) => b.net < -0.005).map((b) => ({ ...b, left: -b.net })).sort((a, b) => b.left - a.left);
  const cred = balances.filter((b) => b.net > 0.005).map((b) => ({ ...b, left: b.net })).sort((a, b) => b.left - a.left);
  const out: { from: string; to: string; amount: number }[] = [];
  let i = 0, j = 0;
  while (i < debt.length && j < cred.length) {
    const amt = Math.min(debt[i].left, cred[j].left);
    out.push({ from: debt[i].name, to: cred[j].name, amount: amt });
    debt[i].left -= amt;
    cred[j].left -= amt;
    if (debt[i].left < 0.005) i++;
    if (cred[j].left < 0.005) j++;
  }
  return out;
}

export default function Expenses({ trip }: { trip: Trip }) {
  const cur = trip.currency;
  const [editingId, setEditingId] = useState<string | null>(null);
  const empty = () => ({
    description: "", amount: "", paidBy: trip.travelers[0] ?? "", splitAmong: [...trip.travelers],
    date: trip.startDate <= today() && today() <= trip.endDate ? today() : trip.startDate, category: "outro" as Category,
  });
  const [form, setForm] = useState(empty);

  const spent = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const planned = trip.activities.reduce((s, a) => s + (a.cost || 0), 0);
  const balances = useMemo(() => computeBalances(trip), [trip]);
  const transfers = useMemo(() => settle(balances), [balances]);
  const byCat = CATEGORY_KEYS.map((c) => ({ c, v: trip.expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) })).filter((x) => x.v > 0);
  const pct = trip.budget ? Math.min(100, (spent / trip.budget) * 100) : 0;
  const plannedPct = trip.budget ? Math.min(100 - pct, (planned / trip.budget) * 100) : 0;

  const usedNames = new Set(trip.expenses.flatMap((e) => [e.paidBy, ...e.splitAmong]));

  function submit(e: FormEvent) {
    e.preventDefault();
    const amount = Number(String(form.amount).replace(",", "."));
    if (!form.description.trim() || !amount || !form.paidBy || !form.splitAmong.length) {
      toast("Preencha descrição, valor, quem pagou e entre quem dividir.");
      return;
    }
    const exp: Expense = { id: editingId ?? uid(), ...form, description: form.description.trim(), amount };
    updateTrip(trip.id, (t) => ({
      ...t,
      expenses: editingId ? t.expenses.map((x) => (x.id === editingId ? exp : x)) : [exp, ...t.expenses],
    }));
    toast(editingId ? "Gasto atualizado" : "Gasto adicionado", { undo: true });
    setEditingId(null);
    setForm(empty());
  }

  function edit(x: Expense) {
    setEditingId(x.id);
    setForm({ ...x, amount: String(x.amount) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="expenses">
      <div className="stats">
        <Stat label="Orçamento" value={trip.budget ? money(trip.budget, cur) : "—"} hint={trip.budget ? "" : "Defina em Editar"} />
        <Stat label="Já gasto" value={money(spent, cur)} />
        <Stat label="Previsto no roteiro" value={money(planned, cur)} />
        <Stat
          label="Restante"
          value={trip.budget ? money(trip.budget - spent - planned, cur) : "—"}
          tone={trip.budget && trip.budget - spent - planned < 0 ? "bad" : "good"}
        />
      </div>
      {trip.budget > 0 && (
        <div className="budget-bar" title="Gasto + previsto em relação ao orçamento">
          <div className="spent" style={{ width: `${pct}%` }} />
          <div className="planned" style={{ width: `${plannedPct}%` }} />
          <span className="legend"><i className="spent" /> gasto <i className="planned" /> previsto</span>
        </div>
      )}

      <div className="grid-2">
        <section className="panel">
          <h3>{editingId ? "Editar gasto" : "Novo gasto"}</h3>
          <div className="field">
            <span className="small muted">Viajantes</span>
            <TravelersInput
              value={trip.travelers}
              canRemove={(n) => {
                if (usedNames.has(n)) { toast(`${n} tem gastos registrados e não pode ser removido.`); return false; }
                return true;
              }}
              onChange={(travelers) => {
                updateTrip(trip.id, (t) => ({ ...t, travelers }));
                setForm((f) => ({
                  ...f,
                  paidBy: travelers.includes(f.paidBy) ? f.paidBy : travelers[0] ?? "",
                  splitAmong: [...new Set([...f.splitAmong.filter((n) => travelers.includes(n)), ...travelers.filter((n) => !trip.travelers.includes(n))])],
                }));
              }}
            />
          </div>
          {trip.travelers.length === 0 ? (
            <p className="muted small">Adicione pelo menos uma pessoa para registrar gastos.</p>
          ) : (
            <form className="form" onSubmit={submit}>
              <div className="row">
                <label className="grow">
                  Descrição
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex.: Jantar, Uber, ingresso…" />
                </label>
                <label>
                  Valor
                  <input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
                </label>
              </div>
              <div className="row">
                <label>
                  Quem pagou
                  <select value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })}>
                    {trip.travelers.map((n) => <option key={n}>{n}</option>)}
                  </select>
                </label>
                <label>
                  Data
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </label>
              </div>
              <div className="field">
                <span>Dividir entre <button type="button" className="link" onClick={() => setForm({ ...form, splitAmong: form.splitAmong.length === trip.travelers.length ? [] : [...trip.travelers] })}>{form.splitAmong.length === trip.travelers.length ? "nenhum" : "todos"}</button></span>
                <div className="chips">
                  {trip.travelers.map((n) => {
                    const on = form.splitAmong.includes(n);
                    return (
                      <button type="button" key={n} className={`chip ${on ? "on" : ""}`} onClick={() => setForm({ ...form, splitAmong: on ? form.splitAmong.filter((x) => x !== n) : [...form.splitAmong, n] })}>
                        {on ? "✓ " : ""}{n}
                      </button>
                    );
                  })}
                </div>
                {form.splitAmong.length > 0 && Number(String(form.amount).replace(",", ".")) > 0 && (
                  <small className="muted">{money(Number(String(form.amount).replace(",", ".")) / form.splitAmong.length, cur)} por pessoa</small>
                )}
              </div>
              <div className="field">
                <span>Categoria</span>
                <div className="chips">
                  {CATEGORY_KEYS.map((c) => (
                    <button type="button" key={c} className={`chip ${form.category === c ? "on" : ""}`} style={{ "--c": CATEGORIES[c].color } as React.CSSProperties} onClick={() => setForm({ ...form, category: c })}>
                      {CATEGORIES[c].emoji} {CATEGORIES[c].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="row end">
                {editingId && <button type="button" className="btn ghost" onClick={() => { setEditingId(null); setForm(empty()); }}>Cancelar</button>}
                <button className="btn primary">{editingId ? "Salvar" : "Adicionar gasto"}</button>
              </div>
            </form>
          )}
        </section>

        <section className="panel">
          <h3>Quem deve a quem</h3>
          {balances.length === 0 || spent === 0 ? (
            <p className="muted small">Os saldos aparecem aqui assim que houver gastos.</p>
          ) : (
            <>
              <ul className="balances">
                {balances.map((b) => (
                  <li key={b.name}>
                    <span className="avatar" data-initial={b.name[0]?.toUpperCase()} />
                    <span className="grow">{b.name}<small className="muted"> pagou {money(b.paid, cur)}</small></span>
                    <strong className={b.net > 0.005 ? "good" : b.net < -0.005 ? "bad" : "muted"}>
                      {b.net > 0.005 ? "+" : ""}{money(b.net, cur)}
                    </strong>
                  </li>
                ))}
              </ul>
              {transfers.length > 0 ? (
                <div className="transfers">
                  <h4>Para acertar as contas</h4>
                  {transfers.map((t, i) => (
                    <div key={i} className="transfer"><b>{t.from}</b> → <b>{t.to}</b> <span className="grow" /> {money(t.amount, cur)}</div>
                  ))}
                </div>
              ) : (
                <p className="good small">Tudo certo, ninguém deve nada 🎉</p>
              )}
            </>
          )}

          {byCat.length > 0 && (
            <>
              <h4>Por categoria</h4>
              <div className="stack-bar">
                {byCat.map(({ c, v }) => (
                  <div key={c} style={{ flex: v, background: CATEGORIES[c].color }} title={`${CATEGORIES[c].label}: ${money(v, cur)}`} />
                ))}
              </div>
              <ul className="cat-legend">
                {byCat.map(({ c, v }) => (
                  <li key={c}><i style={{ background: CATEGORIES[c].color }} />{CATEGORIES[c].emoji} {CATEGORIES[c].label} <span className="grow" /> {money(v, cur)} <small className="muted">{Math.round((v / spent) * 100)}%</small></li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <section className="panel">
        <h3>Gastos registrados <span className="muted small">({trip.expenses.length})</span></h3>
        {trip.expenses.length === 0 ? (
          <p className="muted small">Nenhum gasto ainda.</p>
        ) : (
          <ul className="expense-list">
            {[...trip.expenses].sort((a, b) => b.date.localeCompare(a.date)).map((x) => (
              <li key={x.id} className={editingId === x.id ? "editing" : ""} onClick={() => edit(x)}>
                <span className="exp-emoji" style={{ background: CATEGORIES[x.category].color }}>{CATEGORIES[x.category].emoji}</span>
                <div className="grow">
                  <strong>{x.description}</strong>
                  <small className="muted">{fmtShort(x.date)} · {x.paidBy} pagou · dividido por {x.splitAmong.length}</small>
                </div>
                <strong>{money(x.amount, cur)}</strong>
                <button className="icon-btn" aria-label="Excluir" onClick={(e) => {
                  e.stopPropagation();
                  updateTrip(trip.id, (t) => ({ ...t, expenses: t.expenses.filter((y) => y.id !== x.id) }));
                  if (editingId === x.id) { setEditingId(null); setForm(empty()); }
                  toast("Gasto removido", { undo: true });
                }}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" }) {
  return (
    <div className="stat">
      <small className="muted">{label}</small>
      <strong className={tone}>{value}</strong>
      {hint && <small className="muted">{hint}</small>}
    </div>
  );
}
