import { useEffect, useRef, useState } from "react";
import { updateTrip } from "../store";
import type { Trip } from "../types";

export default function Notes({ trip }: { trip: Trip }) {
  const [text, setText] = useState(trip.notes);
  const [saved, setSaved] = useState(true);
  const timer = useRef<number>();

  // Salvamento automático com pequeno atraso (não polui o "Desfazer")
  useEffect(() => {
    if (text === trip.notes) return;
    setSaved(false);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      updateTrip(trip.id, (t) => ({ ...t, notes: text }), false);
      setSaved(true);
    }, 500);
    return () => window.clearTimeout(timer.current);
  }, [text]);

  return (
    <div className="panel notes">
      <header className="row between">
        <h3>Anotações</h3>
        <small className="muted">{saved ? "✓ Salvo" : "Salvando…"}</small>
      </header>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Endereços, códigos de reserva, contatos, dicas de amigos…"}
        spellCheck
      />
      <small className="muted">{text.length} caracteres</small>
    </div>
  );
}
