import { useState } from "react";
import { toast, updateTrip } from "../store";
import type { ChecklistItem, Trip } from "../types";
import { uid } from "../utils";

const TEMPLATE: Record<string, string[]> = {
  Documentos: ["Documento de identidade / passaporte", "Passagens e reservas", "Seguro viagem", "Cartões e dinheiro"],
  Roupas: ["Roupas para cada dia", "Pijama", "Roupa íntima e meias", "Casaco", "Calçado confortável"],
  Higiene: ["Escova e pasta de dente", "Desodorante", "Protetor solar", "Remédios de uso pessoal"],
  Eletrônicos: ["Carregador do celular", "Power bank", "Fones de ouvido", "Adaptador de tomada"],
  Antes: ["Avisar o banco sobre a viagem", "Baixar mapas offline", "Fazer check-in online"],
};
const GROUPS = [...Object.keys(TEMPLATE), "Outros"];

export default function Checklist({ trip }: { trip: Trip }) {
  const [text, setText] = useState("");
  const [group, setGroup] = useState("Outros");
  const [hideDone, setHideDone] = useState(false);
  const items = trip.checklist;
  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const groups = [...new Set([...GROUPS.filter((g) => items.some((i) => i.group === g)), ...items.map((i) => i.group)])];

  const set = (fn: (l: ChecklistItem[]) => ChecklistItem[], undoable = true) =>
    updateTrip(trip.id, (t) => ({ ...t, checklist: fn(t.checklist) }), undoable);

  function add() {
    const v = text.trim();
    if (!v) return;
    set((l) => [...l, { id: uid(), text: v, done: false, group }]);
    setText("");
  }

  function addTemplate() {
    const existing = new Set(items.map((i) => i.text.toLowerCase()));
    const add = Object.entries(TEMPLATE).flatMap(([g, list]) =>
      list.filter((t) => !existing.has(t.toLowerCase())).map((t) => ({ id: uid(), text: t, done: false, group: g }))
    );
    if (!add.length) return toast("Os itens básicos já estão na lista");
    set((l) => [...l, ...add]);
    toast(`${add.length} itens adicionados`, { undo: true });
  }

  return (
    <div className="checklist">
      <div className="panel checklist-head">
        <div className="ring" style={{ "--p": pct } as React.CSSProperties}><span>{pct}%</span></div>
        <div className="grow">
          <h3>{items.length ? `${done} de ${items.length} prontos` : "Monte sua lista"}</h3>
          <p className="muted small">{pct === 100 && items.length ? "Mala pronta! Boa viagem ✈️" : "Marque conforme for separando."}</p>
        </div>
        <div className="row">
          <button className="btn" onClick={addTemplate}>✨ Itens básicos</button>
          {done > 0 && <button className="btn ghost" onClick={() => setHideDone((h) => !h)}>{hideDone ? "Mostrar feitos" : "Ocultar feitos"}</button>}
          {done > 0 && <button className="btn ghost" onClick={() => { set((l) => l.filter((i) => !i.done)); toast("Itens concluídos removidos", { undo: true }); }}>Limpar feitos</button>}
        </div>
      </div>

      <form className="add-row" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Adicionar item… (Enter)" />
        <select value={group} onChange={(e) => setGroup(e.target.value)}>
          {GROUPS.map((g) => <option key={g}>{g}</option>)}
        </select>
        <button className="btn primary">Adicionar</button>
      </form>

      <div className="check-groups">
        {groups.map((g) => {
          const list = items.filter((i) => i.group === g);
          const shown = hideDone ? list.filter((i) => !i.done) : list;
          const gDone = list.filter((i) => i.done).length;
          return (
            <section key={g} className="panel check-group">
              <header>
                <h4>{g}</h4>
                <small className="muted">{gDone}/{list.length}</small>
              </header>
              <ul>
                {shown.map((i) => (
                  <li key={i.id} className={i.done ? "done" : ""}>
                    <label>
                      <input type="checkbox" checked={i.done} onChange={() => set((l) => l.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)))} />
                      <span>{i.text}</span>
                    </label>
                    <button className="icon-btn" aria-label="Remover" onClick={() => { set((l) => l.filter((x) => x.id !== i.id)); toast("Item removido", { undo: true }); }}>✕</button>
                  </li>
                ))}
                {!shown.length && <li className="muted small">Tudo feito aqui ✓</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
