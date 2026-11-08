import { useState, type FormEvent } from "react";
import Modal from "./Modal";
import TravelersInput from "./TravelersInput";
import type { Trip } from "../types";
import { addDays, diffDays, today } from "../utils";

const EMOJIS = ["✈️", "🏖️", "🏔️", "🗽", "🗼", "🏝️", "🎒", "🚗", "🚢", "🏕️", "🎡", "🍷", "🏰", "🌋", "🏙️", "⛩️"];
const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f97316", "#ec4899", "#8b5cf6", "#ef4444", "#14b8a6"];
const CURRENCIES = ["BRL", "USD", "EUR", "GBP", "ARS", "CLP", "JPY"];

interface Props {
  initial?: Trip;
  onClose: () => void;
  onSave: (data: Partial<Trip>) => void;
}

export default function TripFormModal({ initial, onClose, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? addDays(today(), 14));
  const [endDate, setEndDate] = useState(initial?.endDate ?? addDays(today(), 18));
  const [emoji, setEmoji] = useState(initial?.emoji ?? "✈️");
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [currency, setCurrency] = useState(initial?.currency ?? "BRL");
  const [budget, setBudget] = useState(initial?.budget ? String(initial.budget) : "");
  const [travelers, setTravelers] = useState<string[]>(initial?.travelers ?? ["Eu"]);
  const [origin, setOrigin] = useState(initial?.transport?.origin ?? "");
  const [help, setHelp] = useState(false);
  const [wish, setWish] = useState("");
  const [more, setMore] = useState(!!initial);

  const invalid = endDate < startDate;
  const nights = invalid ? 0 : diffDays(startDate, endDate);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (invalid) return;
    const dest = help ? "" : destination.trim();
    onSave({
      title: title.trim() || dest || (help ? "Viagem surpresa" : "Nova viagem"),
      destination: dest,
      transport: origin.trim() || help
        ? {
            ...(initial?.transport ?? {}),
            origin: origin.trim(),
            destination: dest,
            departDate: startDate,
            returnDate: endDate,
            oneWay: false,
            passengers: Math.max(1, travelers.length),
            ...(help ? { wish: wish.trim(), discover: undefined } : {}),
          }
        : initial?.transport,
      startDate,
      endDate,
      emoji,
      color,
      currency,
      budget: Number(budget.replace(",", ".")) || 0,
      travelers,
    });
  }

  return (
    <Modal
      title={initial ? "Editar viagem" : "Nova viagem"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" form="trip-form" className="btn primary" disabled={invalid || (help && (!wish.trim() || !origin.trim()))}>
            {initial ? "Salvar" : "Criar viagem"}
          </button>
        </>
      }
    >
      <form id="trip-form" className="form" onSubmit={submit}>
        <div className="trip-preview" style={{ "--accent": color } as React.CSSProperties}>
          <span className="trip-preview-emoji">{emoji}</span>
          <div>
            <strong>{title || (help ? "Viagem surpresa ✨" : destination) || "Minha viagem"}</strong>
            <small>{nights + 1} dia{nights ? "s" : ""} · {nights} noite{nights === 1 ? "" : "s"}</small>
          </div>
        </div>

        <div className="segmented" role="radiogroup" aria-label="Destino">
          <button type="button" role="radio" aria-checked={!help} className={!help ? "on" : ""} onClick={() => setHelp(false)}>📍 Já sei para onde</button>
          <button type="button" role="radio" aria-checked={help} className={help ? "on" : ""} onClick={() => setHelp(true)}>✨ Me ajude a escolher</button>
        </div>

        {help ? (
          <label>
            Como você imagina essa viagem?
            <textarea autoFocus rows={3} value={wish} onChange={(e) => setWish(e.target.value)} placeholder="Ex.: no carnaval, eu e minha namorada, praia tranquila até 6 h de viagem, até R$ 1.500 cada" />
            <small className="muted">Pode escrever quando e com quem vai: a IA entende as datas e as pessoas e sugere destinos e como chegar.</small>
          </label>
        ) : (
          <label>
            Para onde?
            <input autoFocus value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ex.: Buenos Aires, Argentina" />
          </label>
        )}
        <label>
          De onde você sai? {!help && <span className="muted">(opcional)</span>}
          <input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Ex.: Itajaí, SC" required={help} />
        </label>
        <div className="row">
          <label>
            Ida
            <input type="date" value={startDate} onChange={(e) => {
              const v = e.target.value;
              // mantém a duração ao mover a data de ida
              if (v && !invalid) setEndDate(addDays(v, nights));
              setStartDate(v);
            }} required />
          </label>
          <label>
            Volta
            <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} required />
          </label>
        </div>
        {invalid && <p className="error">A volta precisa ser depois da ida.</p>}

        <div className="field">
          <span>Quem vai?</span>
          <TravelersInput value={travelers} onChange={setTravelers} />
        </div>

        <button type="button" className="more-toggle" onClick={() => setMore((m) => !m)} aria-expanded={more}>
          {more ? "▾" : "▸"} Mais opções <span className="muted">(nome, orçamento, ícone e cor)</span>
        </button>
        {more && (
          <div className="more">
        <label>
          Nome da viagem <span className="muted">(opcional)</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Férias de julho" />
        </label>
        <div className="row">
          <label>
            Moeda
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Orçamento total <span className="muted">(opcional)</span>
            <input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0,00" />
          </label>
        </div>

        <div className="field">
          <span>Ícone</span>
          <div className="picker">
            {EMOJIS.map((em) => (
              <button type="button" key={em} className={`pick ${em === emoji ? "on" : ""}`} onClick={() => setEmoji(em)}>{em}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Cor</span>
          <div className="picker">
            {COLORS.map((c) => (
              <button type="button" key={c} aria-label={c} className={`swatch ${c === color ? "on" : ""}`} style={{ background: c }} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
