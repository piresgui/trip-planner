import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createSampleTrip, createTrip, exportAll, importData, toast, useTrips } from "../store";
import TripFormModal from "../components/TripFormModal";
import type { Trip } from "../types";
import { countdown, daysBetween, downloadJson, fmtRange, money, today } from "../utils";

export default function TripsPage() {
  const trips = useTrips();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { upcoming, past } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = trips
      .filter((t) => !q || `${t.title} ${t.destination}`.toLowerCase().includes(q))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const t = today();
    return { upcoming: list.filter((x) => x.endDate >= t), past: list.filter((x) => x.endDate < t).reverse() };
  }, [trips, query]);

  async function onImport(file: File) {
    try {
      const n = importData(JSON.parse(await file.text()));
      toast(`${n} viagem(ns) importada(s)`, { undo: true });
    } catch {
      toast("Arquivo inválido. Use um backup exportado pelo app.");
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-logo">🧭</span>
          <span>Trip Planner</span>
        </div>
        <div className="topbar-actions">
          <button className="btn ghost" onClick={() => fileRef.current?.click()} title="Importar backup .json">⬆ Importar</button>
          <button className="btn ghost" disabled={!trips.length} onClick={() => downloadJson(`trip-planner-backup-${today()}.json`, exportAll())} title="Baixar backup de todas as viagens">⬇ Backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = "";
          }} />
        </div>
      </header>

      <section className="hero">
        <div>
          <h1>Para onde vamos?</h1>
          <p className="muted">Diga para onde quer ir, ou conte como imagina a viagem e a IA escolhe o destino, as passagens e o roteiro.</p>
        </div>
        <button className="btn primary lg" onClick={() => setCreating(true)}>＋ Nova viagem</button>
      </section>

      {trips.length === 0 ? (
        <div className="empty big">
          <div className="empty-emoji">🗺️</div>
          <h2>Sua próxima viagem começa aqui</h2>
          <p className="muted">Não sabe para onde ir? Clique em Criar viagem e escolha <b>Me ajude a escolher</b>.</p>
          <div className="row center">
            <button className="btn primary" onClick={() => setCreating(true)}>Criar viagem</button>
            <button className="btn" onClick={() => navigate(`/trips/${createSampleTrip().id}`)}>Ver exemplo</button>
          </div>
        </div>
      ) : (
        <>
          {trips.length > 3 && (
            <input className="search" placeholder="🔎 Buscar viagem…" value={query} onChange={(e) => setQuery(e.target.value)} />
          )}
          {upcoming.length > 0 && (
            <>
              <h3 className="section-title">Próximas</h3>
              <div className="trip-grid">{upcoming.map((t) => <TripCard key={t.id} trip={t} />)}</div>
            </>
          )}
          {past.length > 0 && (
            <>
              <h3 className="section-title">Concluídas</h3>
              <div className="trip-grid past">{past.map((t) => <TripCard key={t.id} trip={t} />)}</div>
            </>
          )}
          {!upcoming.length && !past.length && <p className="muted center">Nada encontrado para “{query}”.</p>}
        </>
      )}

      {creating && (
        <TripFormModal
          onClose={() => setCreating(false)}
          onSave={(data) => {
            const t = createTrip(data);
            setCreating(false);
            navigate(`/trips/${t.id}?tab=${t.transport?.wish || t.transport?.origin ? "passagens" : "roteiro"}`);
          }}
        />
      )}
    </div>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const days = daysBetween(trip.startDate, trip.endDate);
  const planned = new Set(trip.activities.filter((a) => a.date).map((a) => a.date)).size;
  const cd = countdown(trip.startDate, trip.endDate);
  const spent = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const pct = Math.round((planned / Math.max(days.length, 1)) * 100);

  return (
    <Link to={`/trips/${trip.id}`} className="trip-card" style={{ "--accent": trip.color } as React.CSSProperties}>
      <div className="trip-card-cover">
        <span className="trip-card-emoji">{trip.emoji}</span>
        <span className={`pill ${cd.tone}`}>{cd.label}</span>
      </div>
      <div className="trip-card-body">
        <h3>{trip.title}</h3>
        <p className="muted">{trip.destination || "Destino a definir"}</p>
        <p className="small">{fmtRange(trip.startDate, trip.endDate)} · {days.length} dia{days.length > 1 ? "s" : ""}</p>
        <div className="progress" title={`${planned} de ${days.length} dias com atividades`}>
          <div style={{ width: `${pct}%` }} />
        </div>
        <div className="trip-card-meta">
          <span>📅 {planned}/{days.length} dias planejados</span>
          {spent > 0 && <span>💸 {money(spent, trip.currency)}</span>}
        </div>
      </div>
    </Link>
  );
}
