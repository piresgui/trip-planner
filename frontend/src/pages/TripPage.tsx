import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { deleteTrip, duplicateTrip, toast, updateTrip, useTrip } from "../store";
import TripFormModal from "../components/TripFormModal";
import Overview from "../tabs/Overview";
import Itinerary from "../tabs/Itinerary";
import Expenses from "../tabs/Expenses";
import Checklist from "../tabs/Checklist";
import Notes from "../tabs/Notes";
import { countdown, daysBetween, downloadJson, fmtRange } from "../utils";

export const TABS = [
  { key: "geral", label: "Visão geral", icon: "✨" },
  { key: "roteiro", label: "Roteiro", icon: "🗓️" },
  { key: "gastos", label: "Gastos", icon: "💸" },
  { key: "checklist", label: "Checklist", icon: "✅" },
  { key: "notas", label: "Notas", icon: "📝" },
] as const;
export type TabKey = (typeof TABS)[number]["key"];

export default function TripPage() {
  const { tripId } = useParams();
  const trip = useTrip(tripId);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.key === params.get("tab"))?.key ?? "geral") as TabKey;
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  useEffect(() => {
    if (trip) document.title = `${trip.emoji} ${trip.title} · Trip Planner`;
    return () => void (document.title = "Trip Planner");
  }, [trip?.title, trip?.emoji]);

  if (!trip) {
    return (
      <div className="page">
        <div className="empty big">
          <div className="empty-emoji">🧳</div>
          <h2>Viagem não encontrada</h2>
          <Link to="/" className="btn primary">Voltar às viagens</Link>
        </div>
      </div>
    );
  }

  const goTab = (key: TabKey) => setParams(key === "geral" ? {} : { tab: key }, { replace: true });
  const cd = countdown(trip.startDate, trip.endDate);
  const days = daysBetween(trip.startDate, trip.endDate).length;

  return (
    <div className="page trip-page" style={{ "--accent": trip.color } as React.CSSProperties}>
      <header className="trip-hero">
        <div className="trip-hero-top">
          <Link to="/" className="btn ghost on-accent">← Viagens</Link>
          <div className="menu-wrap" ref={menuRef}>
            <button className="btn ghost on-accent" onClick={() => setEditing(true)}>✏️ Editar</button>
            <button className="btn ghost on-accent" onClick={() => setMenu((m) => !m)} aria-label="Mais opções">⋯</button>
            {menu && (
              <div className="menu">
                <button onClick={() => { setMenu(false); window.print(); }}>🖨️ Imprimir roteiro</button>
                <button onClick={() => { setMenu(false); downloadJson(`${trip.title.replace(/\W+/g, "-").toLowerCase()}.json`, trip); }}>⬇ Exportar esta viagem</button>
                <button onClick={() => {
                  setMenu(false);
                  const c = duplicateTrip(trip.id);
                  if (c) { navigate(`/trips/${c.id}`); toast("Viagem duplicada (sem os gastos)"); }
                }}>📄 Duplicar como modelo</button>
                <hr />
                <button className="danger" onClick={() => {
                  if (!confirm(`Excluir "${trip.title}"? Você ainda pode desfazer logo em seguida.`)) return;
                  deleteTrip(trip.id);
                  navigate("/");
                  toast("Viagem excluída", { undo: true });
                }}>🗑️ Excluir viagem</button>
              </div>
            )}
          </div>
        </div>
        <div className="trip-hero-main">
          <span className="trip-hero-emoji">{trip.emoji}</span>
          <div>
            <h1>{trip.title}</h1>
            <p>
              {trip.destination && <>📍 {trip.destination} · </>}
              {fmtRange(trip.startDate, trip.endDate)} · {days} dia{days > 1 ? "s" : ""}
            </p>
          </div>
          <span className={`pill big ${cd.tone}`}>{cd.label}</span>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? "active" : ""} onClick={() => goTab(t.key)}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="tab-content" key={tab}>
        {tab === "geral" && <Overview trip={trip} goTab={goTab} />}
        {tab === "roteiro" && <Itinerary trip={trip} />}
        {tab === "gastos" && <Expenses trip={trip} />}
        {tab === "checklist" && <Checklist trip={trip} />}
        {tab === "notas" && <Notes trip={trip} />}
      </main>

      {editing && (
        <TripFormModal
          initial={trip}
          onClose={() => setEditing(false)}
          onSave={(data) => {
            updateTrip(trip.id, (t) => ({ ...t, ...data }));
            setEditing(false);
            toast("Viagem atualizada", { undo: true });
          }}
        />
      )}
    </div>
  );
}
