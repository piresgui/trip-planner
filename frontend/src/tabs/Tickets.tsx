import { useEffect, useMemo, useRef, useState } from "react";
import { toast, updateTrip } from "../store";
import type { AiOption, AiPackage, Trip, TransportPlan } from "../types";
import { buildLinks, TIPS } from "../links";
import { getApiKey, searchWithGemini } from "../gemini";
import ApiKeyBox from "../components/ApiKeyBox";
import Discover, { MODE_ICON } from "./Discover";
import { addDays, diffDays, fmtDay, money, today, uid } from "../utils";

const LAST_ORIGIN = "trip-planner:last-origin";
const lastOrigin = () => {
  try {
    return localStorage.getItem(LAST_ORIGIN) ?? "";
  } catch {
    return "";
  }
};

function defaults(trip: Trip): TransportPlan {
  return {
    origin: lastOrigin(),
    destination: trip.destination,
    departDate: trip.startDate,
    returnDate: trip.endDate,
    oneWay: false,
    passengers: Math.max(1, trip.travelers.length),
  };
}

type View = "aviao" | "onibus" | "carro" | "pacotes";
const VIEWS: { key: View; label: string; icon: string }[] = [
  { key: "aviao", label: "Voos", icon: "✈️" },
  { key: "onibus", label: "Ônibus", icon: "🚌" },
  { key: "carro", label: "Carro e outros", icon: "🚗" },
  { key: "pacotes", label: "Pacotes", icon: "🏝️" },
];
const inView = (o: AiOption, v: View) => (v === "carro" ? o.mode === "carro" || o.mode === "outro" : o.mode === v);

export default function Tickets({ trip }: { trip: Trip }) {
  const plan = trip.transport ?? defaults(trip);
  const [key, setKey] = useState(getApiKey);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<View | null>(null);
  const abort = useRef<AbortController>();

  const set = (patch: Partial<TransportPlan>) =>
    updateTrip(trip.id, (t) => ({ ...t, transport: { ...(t.transport ?? defaults(t)), ...patch } }), false);

  const ready = !!(plan.origin.trim() && plan.destination.trim() && plan.departDate);
  const invalidDates = !plan.oneWay && !!plan.returnDate && plan.returnDate < plan.departDate;
  const groups = useMemo(() => (ready ? buildLinks(plan) : []), [ready, plan]);
  const ai = plan.ai;

  async function search(p: TransportPlan = plan) {
    if (!key || !p.origin.trim() || !p.destination.trim()) return;
    abort.current?.abort();
    const ctrl = (abort.current = new AbortController());
    setLoading(true);
    setError("");
    try {
      localStorage.setItem(LAST_ORIGIN, p.origin.trim());
    } catch {
      /* ignora */
    }
    try {
      const result = await searchWithGemini(p, key, ctrl.signal);
      set({ ai: result });
      setView(null);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message || "Falha na pesquisa");
    } finally {
      if (abort.current === ctrl) setLoading(false);
    }
  }

  // Abriu a aba com origem e destino e ainda sem resultado: já pesquisa sozinho.
  useEffect(() => {
    if (ready && key && !ai && !invalidDates) search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Escolher uma data no calendário: mantém a duração e pesquisa de novo. */
  function pickDate(date: string) {
    const len = plan.returnDate ? diffDays(plan.departDate, plan.returnDate) : 0;
    const patch = { departDate: date, returnDate: plan.oneWay || !plan.returnDate ? plan.returnDate : addDays(date, len) };
    set(patch);
    search({ ...plan, ...patch });
  }

  function addToItinerary(o: AiOption, place = plan.destination) {
    const date = plan.departDate;
    updateTrip(trip.id, (t) => {
      const order = Math.max(-1, ...t.activities.filter((a) => a.date === date).map((a) => a.order)) + 1;
      return {
        ...t,
        activities: [
          ...t.activities,
          {
            id: uid(),
            date: date >= t.startDate && date <= t.endDate ? date : null,
            order,
            time: "",
            title: `${MODE_ICON[o.mode]} ${o.company} · ${o.route || place}`.trim(),
            location: plan.origin,
            notes: [o.price, o.duration, o.details, o.url].filter(Boolean).join("\n"),
            cost: o.priceValue * plan.passengers,
            category: "transporte",
            done: false,
          },
        ],
      };
    });
    toast("Adicionado ao roteiro", { undo: true });
  }

  function addPackage(k: AiPackage) {
    updateTrip(trip.id, (t) => ({
      ...t,
      expenses: [
        ...t.expenses,
        {
          id: uid(),
          description: `🏝️ Pacote ${k.provider}: ${k.name}`,
          amount: k.priceValue * plan.passengers,
          paidBy: t.travelers[0] ?? "Eu",
          splitAmong: t.travelers.length ? t.travelers : ["Eu"],
          date: plan.departDate,
          category: "hospedagem",
        },
      ],
    }));
    toast("Pacote adicionado aos gastos", { undo: true });
  }

  const counts: Record<View, number> = {
    aviao: ai?.options.filter((o) => inView(o, "aviao")).length ?? 0,
    onibus: ai?.options.filter((o) => inView(o, "onibus")).length ?? 0,
    carro: ai?.options.filter((o) => inView(o, "carro")).length ?? 0,
    pacotes: ai?.packages?.length ?? 0,
  };
  const current: View = view ?? (VIEWS.find((v) => counts[v.key] > 0)?.key || "aviao");
  const list = ai?.options.filter((o) => inView(o, current)) ?? [];
  const cheapest = list.find((o) => o.priceValue > 0);
  const calendar = ai?.calendar ?? [];
  const calMin = Math.min(...calendar.filter((c) => c.priceValue > 0).map((c) => c.priceValue));

  return (
    <div className="tickets">
      {/* Barra de busca */}
      <form className="searchbar" onSubmit={(e) => { e.preventDefault(); search(); }}>
        <div className="sb-route">
          <label className="sb-field">
            <span>De</span>
            <input value={plan.origin} onChange={(e) => set({ origin: e.target.value })} placeholder="Sua cidade" />
          </label>
          <button type="button" className="sb-swap" title="Inverter" onClick={() => set({ origin: plan.destination, destination: plan.origin })}>⇄</button>
          <label className="sb-field">
            <span>Para</span>
            <input value={plan.destination} onChange={(e) => set({ destination: e.target.value })} placeholder="Vazio = IA sugere" />
          </label>
        </div>
        <div className="sb-dates">
          <label className="sb-field">
            <span>Ida</span>
            <input type="date" value={plan.departDate} min={today()} onChange={(e) => set({ departDate: e.target.value })} />
          </label>
          <label className="sb-field">
            <span>Volta {plan.oneWay && <small>(só ida)</small>}</span>
            <input type="date" value={plan.oneWay ? "" : plan.returnDate} disabled={plan.oneWay} min={plan.departDate} onChange={(e) => set({ returnDate: e.target.value })} />
          </label>
          <label className="sb-field sb-pax">
            <span>Pessoas</span>
            <input type="number" min={1} max={9} value={plan.passengers} onChange={(e) => set({ passengers: Math.min(9, Math.max(1, Number(e.target.value) || 1)) })} />
          </label>
        </div>
        <button type="submit" className="btn primary sb-go" disabled={!key || !ready || loading || invalidDates}>
          {loading ? <span className="spinner light" /> : "🔎"} Buscar
        </button>
        <label className="sb-oneway">
          <input type="checkbox" checked={plan.oneWay} onChange={(e) => set({ oneWay: e.target.checked })} /> Só ida
        </label>
      </form>
      {invalidDates && <p className="bad small">A volta está antes da ida.</p>}

      {!plan.origin.trim() ? (
        <div className="empty">
          <div className="empty-emoji">🛫</div>
          <p className="muted">Digite de onde você sai para ver voos, ônibus e pacotes.</p>
        </div>
      ) : !plan.destination.trim() ? (
        <Discover trip={trip} plan={plan} set={set} onAdd={addToItinerary} />
      ) : (
        <>
          {(!key || showKey) && (
            <section className="panel">
              <h3>✨ Ative a busca inteligente</h3>
              <ApiKeyBox hasKey={!!key} onChange={(k) => { setKey(k); setShowKey(false); }} />
            </section>
          )}

          {loading && (
            <section className="panel loading-card">
              <span className="spinner" />
              <div>
                <strong>Procurando voos, ônibus e pacotes…</strong>
                <small className="muted">Comparando Google Flights, Decolar, companhias aéreas, rodoviárias e agências. Leva de 1 a 2 minutos.</small>
              </div>
            </section>
          )}
          {error && !loading && (
            <section className="panel">
              <p className="bad">⚠️ {error}</p>
              <button className="btn primary" onClick={() => search()}>Tentar de novo</button>
            </section>
          )}

          {ai && !loading && (
            <>
              {calendar.length > 0 && (
                <p className="cal-title small muted">Preço por pessoa saindo em cada dia · toque para pesquisar outra data{calendar.some((c) => c.estimated) && " · ≈ estimativa"}</p>
              )}
              {calendar.length > 0 && (
                <section className="calendar" aria-label="Preços por data de ida">
                  {calendar.map((c) => (
                    <button
                      key={c.date}
                      className={`cal-day ${c.date === plan.departDate ? "on" : ""} ${c.priceValue && c.priceValue === calMin ? "best" : ""}`}
                      onClick={() => c.date !== plan.departDate && pickDate(c.date)}
                      title="Pesquisar saindo neste dia"
                    >
                      <small>{fmtDay(c.date)}</small>
                      <strong>{c.priceValue > 0 ? `${c.estimated ? "≈ " : ""}${money(Math.round(c.priceValue)).replace(/,00$/, "")}` : "—"}</strong>
                      <em>{c.priceValue === calMin && c.priceValue > 0 ? "mais barato" : c.mode === "onibus" ? "🚌 ônibus" : "✈️ voo"}</em>
                    </button>
                  ))}
                </section>
              )}

              <div className="view-tabs" role="tablist">
                {VIEWS.map((v) => (
                  <button key={v.key} role="tab" aria-selected={current === v.key} className={current === v.key ? "on" : ""} onClick={() => setView(v.key)} disabled={!counts[v.key]}>
                    {v.icon} {v.label} <span>{counts[v.key]}</span>
                  </button>
                ))}
              </div>

              {current === "pacotes" ? (
                <ul className="results">
                  {(ai.packages ?? []).map((k, i) => (
                    <li key={i} className={`result ${i === 0 && k.priceValue ? "best" : ""}`}>
                      <span className="r-icon">🏝️</span>
                      <div className="r-main">
                        <strong>{k.name}</strong>
                        <span className="r-sub">{k.provider}{k.nights ? ` · ${k.nights} noite${k.nights > 1 ? "s" : ""}` : ""}</span>
                        <small className="muted">{[k.includes, k.details].filter(Boolean).join(" · ")}</small>
                      </div>
                      <div className="r-side">
                        <strong className="r-price">{k.price || "—"}</strong>
                        {k.priceValue > 0 && plan.passengers > 1 && <small className="muted">{money(k.priceValue * plan.passengers)} no total</small>}
                        <div className="r-actions">
                          {k.url && <a className="btn sm primary" href={k.url} target="_blank" rel="noreferrer">Ver pacote</a>}
                          <button className="btn sm" onClick={() => addPackage(k)} title="Adicionar aos gastos">＋</button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="results">
                  {list.map((o, i) => (
                    <li key={i} className={`result ${o === cheapest ? "best" : ""}`}>
                      <span className="r-icon">{MODE_ICON[o.mode]}</span>
                      <div className="r-main">
                        <strong>{o.company}</strong>
                        <span className="r-sub">{o.route}{o.duration && ` · ${o.duration}`}</span>
                        {o.details && <small className="muted">{o.details}</small>}
                      </div>
                      <div className="r-side">
                        {o === cheapest && <span className="badge">Mais barato</span>}
                        <strong className="r-price">{o.price || "—"}</strong>
                        {o.priceValue > 0 && plan.passengers > 1 && <small className="muted">{money(o.priceValue * plan.passengers)} no total</small>}
                        <div className="r-actions">
                          {o.url && <a className="btn sm primary" href={o.url} target="_blank" rel="noreferrer">Ver</a>}
                          <button className="btn sm" onClick={() => addToItinerary(o)} title="Adicionar ao roteiro">＋</button>
                        </div>
                      </div>
                    </li>
                  ))}
                  {!list.length && <li className="muted small">Nada encontrado nesta categoria.</li>}
                </ul>
              )}

              {ai.summary && <p className="ai-summary">💡 {ai.summary}</p>}
              <p className="hint">
                Preços encontrados pela IA em {new Date(ai.at).toLocaleString("pt-BR")} e mudam rápido: confirme no site antes de comprar.{" "}
                <button className="link" onClick={() => setShowKey((s) => !s)}>Chave da API</button>
              </p>
            </>
          )}

          {ready && (
            <details className="panel more-sites">
              <summary><strong>🔗 Pesquisar direto nos sites</strong> <span className="muted small">Google Flights, Decolar, Skyscanner, companhias, rodoviárias…</span></summary>
              <div className="link-groups">
                {groups.map((g) => (
                  <section key={g.key}>
                    <h4>{g.icon} {g.title}</h4>
                    <ul className="link-list">
                      {g.links.map((l) => (
                        <li key={l.name}>
                          <a href={l.url} target="_blank" rel="noreferrer">
                            <span className="grow"><strong>{l.name}</strong>{l.note && <small className="muted">{l.note}</small>}</span>
                            <span aria-hidden>↗</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </details>
          )}

          <details className="panel">
            <summary><strong>💡 Dicas para pagar menos</strong></summary>
            <ul className="tip-list">{[...(ai?.tips ?? []), ...TIPS].map((t, i) => <li key={i}>{t}</li>)}</ul>
          </details>
        </>
      )}
    </div>
  );
}
