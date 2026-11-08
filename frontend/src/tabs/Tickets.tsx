import { useMemo, useRef, useState } from "react";
import { toast, updateTrip } from "../store";
import type { AiOption, Trip, TransportPlan } from "../types";
import { buildLinks, TIPS, toIata } from "../links";
import { getApiKey, searchWithGemini } from "../gemini";
import ApiKeyBox from "../components/ApiKeyBox";
import Discover, { MODE_ICON } from "./Discover";
import { money, uid } from "../utils";


function defaults(trip: Trip): TransportPlan {
  return {
    origin: "",
    destination: trip.destination,
    departDate: trip.startDate,
    returnDate: trip.endDate,
    oneWay: false,
    passengers: Math.max(1, trip.travelers.length),
  };
}

export default function Tickets({ trip }: { trip: Trip }) {
  const plan = trip.transport ?? defaults(trip);
  const [key, setKey] = useState(getApiKey);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"todos" | AiOption["mode"]>("todos");
  const abort = useRef<AbortController>();

  const set = (patch: Partial<TransportPlan>) =>
    updateTrip(trip.id, (t) => ({ ...t, transport: { ...(t.transport ?? defaults(t)), ...patch } }), false);

  const ready = plan.origin.trim() && plan.destination.trim() && plan.departDate;
  const invalidDates = !plan.oneWay && plan.returnDate && plan.returnDate < plan.departDate;
  const groups = useMemo(() => (ready ? buildLinks(plan) : []), [ready, plan]);
  const missingCode = ready && (!toIata(plan.origin) || !toIata(plan.destination));

  async function runAi() {
    if (!key || !ready) return;
    abort.current?.abort();
    const ctrl = (abort.current = new AbortController());
    setLoading(true);
    setError("");
    try {
      const ai = await searchWithGemini(plan, key, ctrl.signal);
      set({ ai });
      toast(`${ai.options.length} opções encontradas`);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message || "Falha na pesquisa");
    } finally {
      if (abort.current === ctrl) setLoading(false);
    }
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

  const ai = plan.ai;
  const shown = ai?.options.filter((o) => filter === "todos" || o.mode === filter) ?? [];
  const cheapest = ai?.options.find((o) => o.priceValue > 0);

  return (
    <div className="tickets">
      <section className="panel">
        <h3>Para onde e quando?</h3>
        <form className="form ticket-form" onSubmit={(e) => { e.preventDefault(); runAi(); }}>
          <div className="row">
            <label>
              Origem
              <input value={plan.origin} onChange={(e) => set({ origin: e.target.value })} placeholder="Itajaí, SC  ou  NVT" />
            </label>
            <button type="button" className="icon-btn swap" title="Inverter origem e destino" onClick={() => set({ origin: plan.destination, destination: plan.origin })}>⇄</button>
            <label>
              Destino
              <input value={plan.destination} onChange={(e) => set({ destination: e.target.value })} placeholder="Vazio = a IA sugere destinos" />
            </label>
          </div>
          <div className="row">
            <label>
              Ida
              <input type="date" value={plan.departDate} onChange={(e) => set({ departDate: e.target.value })} />
            </label>
            <label>
              Volta
              <input type="date" value={plan.oneWay ? "" : plan.returnDate} disabled={plan.oneWay} min={plan.departDate} onChange={(e) => set({ returnDate: e.target.value })} />
            </label>
            <label className="narrow">
              Passageiros
              <input type="number" min={1} max={9} value={plan.passengers} onChange={(e) => set({ passengers: Math.min(9, Math.max(1, Number(e.target.value) || 1)) })} />
            </label>
            <label className="inline">
              <input type="checkbox" checked={plan.oneWay} onChange={(e) => set({ oneWay: e.target.checked })} /> Só ida
            </label>
          </div>
          {invalidDates && <p className="bad small">A volta está antes da ida.</p>}
          {missingCode && (
            <p className="hint">
              💡 Não reconheci o aeroporto de {!toIata(plan.origin) ? `"${plan.origin}"` : `"${plan.destination}"`}. Escreva o código IATA (ex.: <b>NVT</b>, <b>GRU</b>) para os links do Skyscanner, Kayak, Decolar e LATAM abrirem a busca pronta.
            </p>
          )}
        </form>
      </section>

      {!plan.origin.trim() ? (
        <div className="empty">
          <div className="empty-emoji">🎫</div>
          <p className="muted">Preencha a origem. Com o destino, você vê links e preços de voos e ônibus; sem destino, a IA sugere para onde ir.</p>
        </div>
      ) : !plan.destination.trim() ? (
        <Discover trip={trip} plan={plan} set={set} onAdd={addToItinerary} />
      ) : !ready ? null : (
        <>
          <section className="panel ai-panel">
            <header className="row between">
              <div>
                <h3>✨ Pesquisa com IA</h3>
                <small className="muted">O Gemini pesquisa no Google as opções mais baratas de avião e ônibus e traz os links.</small>
              </div>
              {key && (
                <div className="toolbar-right">
                  <button className="link" onClick={() => setShowKey((s) => !s)}>Chave da API</button>
                  <button className="btn primary" onClick={runAi} disabled={loading || !!invalidDates}>
                    {loading ? "Pesquisando…" : ai ? "Pesquisar de novo" : "Pesquisar agora"}
                  </button>
                </div>
              )}
            </header>

            {(!key || showKey) && <ApiKeyBox hasKey={!!key} onChange={(k) => { setKey(k); setShowKey(false); }} />}

            {loading && <div className="ai-loading"><span className="spinner" /> Pesquisando voos e ônibus… pode levar até 1 minuto.</div>}
            {error && <p className="bad small">⚠️ {error}</p>}

            {ai && !loading && (
              <div className="ai-result">
                {ai.summary && <p className="ai-summary">{ai.summary}</p>}
                {cheapest && (
                  <p className="small muted">
                    Mais barato encontrado: <b className="good">{cheapest.price}</b> ({cheapest.company}) · total para {plan.passengers}: {money(cheapest.priceValue * plan.passengers)}
                  </p>
                )}
                <div className="chips">
                  {(["todos", "aviao", "onibus", "carro", "outro"] as const).map((m) => (
                    <button key={m} className={`chip ${filter === m ? "on" : ""}`} style={{ "--c": "var(--accent)" } as React.CSSProperties} onClick={() => setFilter(m)}>
                      {m === "todos" ? "Todos" : `${MODE_ICON[m]} ${({ aviao: "Avião", onibus: "Ônibus", carro: "Carro", outro: "Outros" })[m]}`}
                    </button>
                  ))}
                </div>
                <ul className="options">
                  {shown.map((o, i) => (
                    <li key={i} className={o === cheapest ? "best" : ""}>
                      <span className="opt-icon">{MODE_ICON[o.mode]}</span>
                      <div className="grow">
                        <strong>{o.company}</strong> <span className="muted small">{o.route}</span>
                        <small className="muted">{[o.duration, o.details].filter(Boolean).join(" · ")}</small>
                      </div>
                      <div className="opt-price">
                        <strong>{o.price || "—"}</strong>
                        <div className="opt-actions">
                          {o.url && <a className="btn sm primary" href={o.url} target="_blank" rel="noreferrer">Ver ↗</a>}
                          <button className="btn sm" onClick={() => addToItinerary(o)} title="Adicionar ao roteiro">＋ Roteiro</button>
                        </div>
                      </div>
                    </li>
                  ))}
                  {!shown.length && <li className="muted small">Nenhuma opção nesta categoria.</li>}
                </ul>
                {ai.tips.length > 0 && (
                  <>
                    <h4>Dicas para esta rota</h4>
                    <ul className="tip-list">{ai.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
                  </>
                )}
                <p className="hint">
                  Preços são o que a IA encontrou em {new Date(ai.at).toLocaleString("pt-BR")} e mudam rápido: confirme sempre no site antes de comprar.
                </p>
                {ai.sources.length > 0 && (
                  <details className="sources">
                    <summary className="small muted">Fontes consultadas ({ai.sources.length})</summary>
                    <ul>{ai.sources.map((s, i) => <li key={i}><a href={s.uri} target="_blank" rel="noreferrer">{s.title || s.uri}</a></li>)}</ul>
                  </details>
                )}
              </div>
            )}
          </section>

          <div className="link-groups">
            {groups.map((g) => (
              <section key={g.key} className="panel">
                <h3>{g.icon} {g.title}</h3>
                <p className="small muted">{g.description}</p>
                <ul className="link-list">
                  {g.links.map((l) => (
                    <li key={l.name}>
                      <a href={l.url} target="_blank" rel="noreferrer">
                        <span className="grow">
                          <strong>{l.name}</strong>
                          {l.note && <small className="muted">{l.note}</small>}
                        </span>
                        <span className={`tag ${l.prefilled ? "on" : ""}`}>{l.prefilled ? "busca pronta" : "site"}</span>
                        <span aria-hidden>↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <section className="panel">
        <h3>💡 Dicas para pagar menos</h3>
        <ul className="tip-list">{TIPS.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </section>
    </div>
  );
}
