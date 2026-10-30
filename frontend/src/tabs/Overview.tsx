import type { TabKey } from "../pages/TripPage";
import type { Trip } from "../types";
import { CATEGORIES, daysBetween, fmtDay, money, today } from "../utils";

export default function Overview({ trip, goTab }: { trip: Trip; goTab: (k: TabKey) => void }) {
  const days = daysBetween(trip.startDate, trip.endDate);
  const scheduled = trip.activities.filter((a) => a.date && days.includes(a.date));
  const ideas = trip.activities.length - scheduled.length;
  const doneActs = scheduled.filter((a) => a.done).length;
  const spent = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const planned = trip.activities.reduce((s, a) => s + (a.cost || 0), 0);
  const checkDone = trip.checklist.filter((c) => c.done).length;
  const emptyDays = days.filter((d) => !scheduled.some((a) => a.date === d));
  const maxPerDay = Math.max(1, ...days.map((d) => scheduled.filter((a) => a.date === d).length));
  const t = today();
  const next = scheduled
    .filter((a) => !a.done && a.date! >= t)
    .sort((a, b) => `${a.date}${a.time || "99"}`.localeCompare(`${b.date}${b.time || "99"}`))
    .slice(0, 5);

  const tips: { text: string; tab: TabKey }[] = [];
  if (!trip.activities.length) tips.push({ text: "Comece o roteiro adicionando as primeiras atividades", tab: "roteiro" });
  else if (emptyDays.length) tips.push({ text: `${emptyDays.length} dia(s) ainda sem nada planejado`, tab: "roteiro" });
  if (ideas > 0) tips.push({ text: `${ideas} ideia(s) aguardando um dia no roteiro`, tab: "roteiro" });
  if (trip.travelers.length < 2) tips.push({ text: "Adicione quem vai junto para dividir os gastos", tab: "gastos" });
  if (!trip.checklist.length) tips.push({ text: "Crie a checklist da mala com os itens básicos", tab: "checklist" });
  else if (checkDone < trip.checklist.length) tips.push({ text: `${trip.checklist.length - checkDone} item(ns) da checklist pendentes`, tab: "checklist" });
  if (trip.budget && spent + planned > trip.budget) tips.push({ text: "O previsto já passou do orçamento", tab: "gastos" });

  return (
    <div className="overview">
      <div className="stats">
        <button className="stat clickable" onClick={() => goTab("roteiro")}>
          <small className="muted">Atividades</small>
          <strong>{scheduled.length}</strong>
          <small className="muted">{doneActs} feitas · {ideas} ideias</small>
        </button>
        <button className="stat clickable" onClick={() => goTab("roteiro")}>
          <small className="muted">Dias planejados</small>
          <strong>{days.length - emptyDays.length}/{days.length}</strong>
          <div className="progress"><div style={{ width: `${((days.length - emptyDays.length) / days.length) * 100}%` }} /></div>
        </button>
        <button className="stat clickable" onClick={() => goTab("gastos")}>
          <small className="muted">Gasto + previsto</small>
          <strong>{money(spent + planned, trip.currency)}</strong>
          <small className="muted">{trip.budget ? `de ${money(trip.budget, trip.currency)}` : "sem orçamento definido"}</small>
        </button>
        <button className="stat clickable" onClick={() => goTab("checklist")}>
          <small className="muted">Checklist</small>
          <strong>{trip.checklist.length ? `${Math.round((checkDone / trip.checklist.length) * 100)}%` : "—"}</strong>
          <small className="muted">{checkDone}/{trip.checklist.length} itens</small>
        </button>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h3>Dia a dia</h3>
          <ul className="day-strip">
            {days.map((d, i) => {
              const acts = scheduled.filter((a) => a.date === d).sort((a, b) => a.order - b.order);
              return (
                <li key={d} className={d === t ? "today" : ""} onClick={() => goTab("roteiro")}>
                  <span className="day-num">{i + 1}</span>
                  <div className="grow">
                    <strong>{fmtDay(d)}</strong>
                    <small className="muted">{acts.length ? acts.slice(0, 3).map((a) => a.title).join(" · ") + (acts.length > 3 ? ` +${acts.length - 3}` : "") : "Livre"}</small>
                  </div>
                  <div className="dots">
                    {acts.map((a) => <i key={a.id} style={{ background: CATEGORIES[a.category].color }} />)}
                  </div>
                  <div className="mini-bar"><div style={{ width: `${(acts.length / maxPerDay) * 100}%` }} /></div>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="col">
          {tips.length > 0 && (
            <section className="panel">
              <h3>Próximos passos</h3>
              <ul className="tips">
                {tips.map((tip, i) => (
                  <li key={i}><button onClick={() => goTab(tip.tab)}>{tip.text} <span>→</span></button></li>
                ))}
              </ul>
            </section>
          )}
          <section className="panel">
            <h3>A seguir</h3>
            {next.length ? (
              <ul className="next-list">
                {next.map((a) => (
                  <li key={a.id}>
                    <span>{CATEGORIES[a.category].emoji}</span>
                    <div className="grow"><strong>{a.title}</strong><small className="muted">{fmtDay(a.date!)}{a.time && ` · ${a.time}`}</small></div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Nenhuma atividade pendente.</p>
            )}
          </section>
          {trip.notes && (
            <section className="panel clickable" onClick={() => goTab("notas")}>
              <h3>Notas</h3>
              <p className="notes-preview">{trip.notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
