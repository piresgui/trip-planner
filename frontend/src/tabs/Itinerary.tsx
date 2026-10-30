import { useMemo, useState, type DragEvent } from "react";
import { toast, updateTrip } from "../store";
import ActivityModal from "../components/ActivityModal";
import type { Activity, Category, Trip } from "../types";
import { CATEGORIES, CATEGORY_KEYS, daysBetween, fmtDay, guessCategory, mapsUrl, money, parseQuickAdd, today, uid } from "../utils";

const IDEAS = "ideias";

export default function Itinerary({ trip }: { trip: Trip }) {
  const days = useMemo(() => daysBetween(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);
  const daySet = useMemo(() => new Set(days), [days]);
  const [filter, setFilter] = useState<Category | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ col: string; before: string | null } | null>(null);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [showIdeas, setShowIdeas] = useState(true);

  const colOf = (a: Activity) => (a.date && daySet.has(a.date) ? a.date : IDEAS);
  const inCol = (col: string) =>
    trip.activities.filter((a) => colOf(a) === col).sort((a, b) => a.order - b.order);

  const columns = [
    ...(showIdeas ? [{ key: IDEAS, title: "💡 Ideias", subtitle: "Arraste para um dia" }] : []),
    ...days.map((d, i) => ({ key: d, title: `Dia ${i + 1}`, subtitle: fmtDay(d) })),
  ];

  function move(id: string, col: string, beforeId: string | null) {
    if (id === beforeId) return;
    updateTrip(trip.id, (t) => {
      const act = t.activities.find((a) => a.id === id);
      if (!act) return t;
      const moved = { ...act, date: col === IDEAS ? null : col };
      const list = t.activities
        .filter((a) => a.id !== id && (a.date && daySet.has(a.date) ? a.date : IDEAS) === col)
        .sort((a, b) => a.order - b.order);
      const idx = beforeId ? list.findIndex((a) => a.id === beforeId) : -1;
      if (idx < 0) list.push(moved);
      else list.splice(idx, 0, moved);
      const order = new Map(list.map((a, i) => [a.id, i]));
      return {
        ...t,
        activities: t.activities.map((a) =>
          a.id === id ? { ...moved, order: order.get(id)! } : order.has(a.id) ? { ...a, order: order.get(a.id)! } : a
        ),
      };
    });
  }

  function addQuick(col: string, text: string) {
    const { time, title } = parseQuickAdd(text);
    if (!title) return;
    const max = Math.max(-1, ...inCol(col).map((a) => a.order));
    const act: Activity = {
      id: uid(), date: col === IDEAS ? null : col, order: max + 1, time, title,
      location: "", notes: "", cost: 0, category: guessCategory(title), done: false,
    };
    updateTrip(trip.id, (t) => ({ ...t, activities: [...t.activities, act] }));
  }

  function sortByTime(col: string) {
    const sorted = [...inCol(col)].sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
    const order = new Map(sorted.map((a, i) => [a.id, i]));
    updateTrip(trip.id, (t) => ({
      ...t,
      activities: t.activities.map((a) => (order.has(a.id) ? { ...a, order: order.get(a.id)! } : a)),
    }));
    toast("Dia organizado por horário", { undo: true });
  }

  function patch(id: string, changes: Partial<Activity>) {
    updateTrip(trip.id, (t) => ({ ...t, activities: t.activities.map((a) => (a.id === id ? { ...a, ...changes } : a)) }));
  }

  function remove(id: string) {
    updateTrip(trip.id, (t) => ({ ...t, activities: t.activities.filter((a) => a.id !== id) }));
    toast("Atividade removida", { undo: true });
  }

  function onDrop(e: DragEvent, col: string, before: string | null) {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    if (id) move(id, col, before);
    setDragId(null);
    setOver(null);
  }

  const totalPlanned = trip.activities.reduce((s, a) => s + (a.cost || 0), 0);
  const t = today();

  return (
    <div className="itinerary">
      <div className="toolbar">
        <div className="chips">
          <button className={`chip ${!filter ? "on" : ""}`} onClick={() => setFilter(null)}>Todas</button>
          {CATEGORY_KEYS.map((c) => (
            <button key={c} className={`chip ${filter === c ? "on" : ""}`} style={{ "--c": CATEGORIES[c].color } as React.CSSProperties} onClick={() => setFilter(filter === c ? null : c)}>
              {CATEGORIES[c].emoji} {CATEGORIES[c].label}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <span className="muted small">Custo estimado: <strong>{money(totalPlanned, trip.currency)}</strong></span>
          <button className="btn sm" onClick={() => setShowIdeas((s) => !s)}>{showIdeas ? "Ocultar ideias" : "💡 Mostrar ideias"}</button>
        </div>
      </div>
      <p className="hint">Dica: digite <kbd>14h Museu do Prado</kbd> para já definir o horário · arraste os cartões entre os dias · <kbd>Ctrl</kbd>+<kbd>Z</kbd> desfaz</p>

      <div className="board">
        {columns.map((col) => {
          const items = inCol(col.key);
          const visible = filter ? items.filter((a) => a.category === filter) : items;
          const cost = items.reduce((s, a) => s + (a.cost || 0), 0);
          const isOver = over?.col === col.key;
          return (
            <section
              key={col.key}
              className={`column ${col.key === IDEAS ? "ideas" : ""} ${col.key === t ? "today" : ""} ${isOver ? "drop" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (!isOver || over?.before !== null) setOver({ col: col.key, before: null });
              }}
              onDrop={(e) => onDrop(e, col.key, null)}
            >
              <header className="column-header">
                <div>
                  <h3>{col.title} {col.key === t && <span className="pill now">Hoje</span>}</h3>
                  <small className="muted">{col.subtitle}</small>
                </div>
                <div className="column-meta">
                  {cost > 0 && <span className="small">{money(cost, trip.currency)}</span>}
                  {items.length > 1 && col.key !== IDEAS && (
                    <button className="icon-btn" title="Organizar por horário" onClick={() => sortByTime(col.key)}>⏱</button>
                  )}
                </div>
              </header>

              <div className="cards">
                {visible.map((a) => (
                  <div key={a.id}>
                    {isOver && over?.before === a.id && dragId !== a.id && <div className="drop-line" />}
                    <article
                      className={`card ${a.done ? "done" : ""} ${dragId === a.id ? "dragging" : ""}`}
                      style={{ "--c": CATEGORIES[a.category].color } as React.CSSProperties}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", a.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(a.id);
                      }}
                      onDragEnd={() => { setDragId(null); setOver(null); }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const r = e.currentTarget.getBoundingClientRect();
                        const after = e.clientY > r.top + r.height / 2;
                        const idx = visible.indexOf(a);
                        const before = after ? visible[idx + 1]?.id ?? null : a.id;
                        if (over?.col !== col.key || over.before !== before) setOver({ col: col.key, before });
                      }}
                      onDrop={(e) => onDrop(e, col.key, over?.col === col.key ? over.before : a.id)}
                      onClick={() => setEditing(a)}
                    >
                      <div className="card-top">
                        <button
                          className={`check ${a.done ? "on" : ""}`}
                          aria-label={a.done ? "Desmarcar" : "Marcar como feito"}
                          onClick={(e) => { e.stopPropagation(); patch(a.id, { done: !a.done }); }}
                        >
                          {a.done ? "✓" : ""}
                        </button>
                        {a.time && <span className="time">{a.time}</span>}
                        <span className="card-emoji" title={CATEGORIES[a.category].label}>{CATEGORIES[a.category].emoji}</span>
                        <button className="icon-btn card-del" aria-label="Remover" onClick={(e) => { e.stopPropagation(); remove(a.id); }}>✕</button>
                      </div>
                      <h4>{a.title}</h4>
                      {(a.location || a.cost > 0 || a.notes) && (
                        <div className="card-meta">
                          {a.location && (
                            <a href={mapsUrl(`${a.location} ${trip.destination}`)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="Abrir no mapa">
                              📍 {a.location}
                            </a>
                          )}
                          {a.cost > 0 && <span>💰 {money(a.cost, trip.currency)}</span>}
                          {a.notes && <span title={a.notes}>📝</span>}
                        </div>
                      )}
                    </article>
                  </div>
                ))}
                {isOver && over?.before === null && dragId && <div className="drop-line" />}
                {!visible.length && !isOver && (
                  <p className="column-empty">{filter ? "Nada nesta categoria" : col.key === IDEAS ? "Guarde aqui o que quer fazer, sem dia definido." : "Dia livre ☀️"}</p>
                )}
              </div>

              <QuickAdd onAdd={(text) => addQuick(col.key, text)} placeholder={col.key === IDEAS ? "＋ Nova ideia" : "＋ Adicionar atividade"} />
            </section>
          );
        })}
      </div>

      {editing && (
        <ActivityModal
          activity={editing}
          days={days}
          currency={trip.currency}
          onClose={() => setEditing(null)}
          onSave={(a) => {
            const prevCol = colOf(editing);
            const newCol = a.date && daySet.has(a.date) ? a.date : IDEAS;
            if (prevCol !== newCol) {
              const max = Math.max(-1, ...inCol(newCol).map((x) => x.order));
              a = { ...a, order: max + 1 };
            }
            patch(a.id, a);
            setEditing(null);
          }}
          onDelete={() => { remove(editing.id); setEditing(null); }}
        />
      )}
    </div>
  );
}

function QuickAdd({ onAdd, placeholder }: { onAdd: (t: string) => void; placeholder: string }) {
  const [text, setText] = useState("");
  return (
    <form
      className="quick-add"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onAdd(text);
        setText("");
      }}
    >
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
    </form>
  );
}
