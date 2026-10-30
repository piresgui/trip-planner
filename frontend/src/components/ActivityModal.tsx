import { useState, type FormEvent } from "react";
import Modal from "./Modal";
import type { Activity } from "../types";
import { CATEGORIES, CATEGORY_KEYS, fmtDay } from "../utils";

interface Props {
  activity: Activity;
  days: string[];
  currency: string;
  onClose: () => void;
  onSave: (a: Activity) => void;
  onDelete: () => void;
}

export default function ActivityModal({ activity, days, currency, onClose, onSave, onDelete }: Props) {
  const [a, setA] = useState<Activity>(activity);
  const [cost, setCost] = useState(activity.cost ? String(activity.cost) : "");
  const set = <K extends keyof Activity>(k: K, v: Activity[K]) => setA((p) => ({ ...p, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!a.title.trim()) return;
    onSave({ ...a, title: a.title.trim(), cost: Number(cost.replace(",", ".")) || 0 });
  }

  return (
    <Modal
      title="Atividade"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost danger-text" onClick={onDelete}>Excluir</button>
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" form="activity-form" className="btn primary">Salvar</button>
        </>
      }
    >
      <form id="activity-form" className="form" onSubmit={submit}>
        <label>
          O quê?
          <input autoFocus value={a.title} onChange={(e) => set("title", e.target.value)} required />
        </label>
        <div className="field">
          <span>Categoria</span>
          <div className="chips">
            {CATEGORY_KEYS.map((c) => (
              <button type="button" key={c} className={`chip ${a.category === c ? "on" : ""}`} style={{ "--c": CATEGORIES[c].color } as React.CSSProperties} onClick={() => set("category", c)}>
                {CATEGORIES[c].emoji} {CATEGORIES[c].label}
              </button>
            ))}
          </div>
        </div>
        <div className="row">
          <label>
            Dia
            <select value={a.date && days.includes(a.date) ? a.date : ""} onChange={(e) => set("date", e.target.value || null)}>
              <option value="">💡 Sem dia (ideias)</option>
              {days.map((d, i) => <option key={d} value={d}>Dia {i + 1} · {fmtDay(d)}</option>)}
            </select>
          </label>
          <label>
            Horário
            <input type="time" value={a.time} onChange={(e) => set("time", e.target.value)} />
          </label>
        </div>
        <div className="row">
          <label>
            Local
            <input value={a.location} onChange={(e) => set("location", e.target.value)} placeholder="Endereço ou nome do lugar" />
          </label>
          <label>
            Custo estimado ({currency})
            <input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0,00" />
          </label>
        </div>
        <label>
          Observações
          <textarea rows={3} value={a.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Reserva, link do ingresso, dicas…" />
        </label>
        <label className="inline">
          <input type="checkbox" checked={a.done} onChange={(e) => set("done", e.target.checked)} /> Já feito / reservado
        </label>
      </form>
    </Modal>
  );
}
