import { useEffect, useRef, useState } from "react";
import { toast, updateTrip } from "../store";
import type { AiOption, Destination, Trip, TransportPlan } from "../types";
import { discoverWithGemini, getApiKey } from "../gemini";
import ApiKeyBox from "../components/ApiKeyBox";

export const MODE_ICON: Record<AiOption["mode"], string> = { aviao: "✈️", onibus: "🚌", carro: "🚗", outro: "🧭" };
const MODE_LABEL: Record<AiOption["mode"], string> = { aviao: "Avião", onibus: "Ônibus", carro: "Carro", outro: "Outro" };

const EXAMPLES = [
  "Praia tranquila, até 6 horas de viagem, gastando no máximo R$ 1.500 por pessoa",
  "Cidade fria na serra com bons restaurantes e vinho, fim de semana",
  "Primeira viagem internacional barata na América do Sul",
  "Natureza, trilhas e cachoeiras, dá para ir de carro",
];

interface Props {
  trip: Trip;
  plan: TransportPlan;
  set: (patch: Partial<TransportPlan>) => void;
  onAdd: (o: AiOption, place: string) => void;
}

export default function Discover({ trip, plan, set, onAdd }: Props) {
  const [key, setKey] = useState(getApiKey);
  const [wish, setWish] = useState(plan.wish ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(0);
  const abort = useRef<AbortController>();
  const result = plan.discover;

  async function run() {
    if (!key || !wish.trim()) return;
    abort.current?.abort();
    const ctrl = (abort.current = new AbortController());
    setLoading(true);
    setError("");
    set({ wish });
    try {
      const discover = await discoverWithGemini(plan, wish.trim(), key, ctrl.signal);
      set({ discover, wish });
      setOpen(0);
      toast(`${discover.destinations.length} destinos sugeridos`);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message || "Falha na pesquisa");
    } finally {
      if (abort.current === ctrl) setLoading(false);
    }
  }

  // Veio do "Me ajude a escolher" ao criar a viagem: pesquisa sozinho.
  useEffect(() => {
    if (key && plan.wish && !plan.discover) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(d: Destination) {
    set({ destination: d.name });
    if (!trip.destination) updateTrip(trip.id, (t) => ({ ...t, destination: d.name }), false);
    toast(`Destino definido: ${d.name}`);
  }

  return (
    <section className="panel ai-panel discover">
      <h3>🧭 Não sabe para onde ir?</h3>
      <p className="small muted">Descreva a viagem que você imagina. O Gemini sugere destinos e mostra como chegar de avião, ônibus ou carro, com preços e links.</p>

      {!key ? (
        <ApiKeyBox hasKey={false} onChange={setKey} />
      ) : (
        <>
          <textarea
            className="wish"
            rows={3}
            value={wish}
            onChange={(e) => setWish(e.target.value)}
            onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && run()}
            placeholder="Ex.: quero uma praia tranquila, sem muita gente, até 6 h de viagem, gastando até R$ 1.500 por pessoa"
          />
          <div className="chips">
            {EXAMPLES.map((ex) => (
              <button key={ex} className="chip" style={{ "--c": "var(--accent)" } as React.CSSProperties} onClick={() => setWish(ex)}>{ex}</button>
            ))}
          </div>
          <div className="row end">
            <button className="btn primary" onClick={run} disabled={loading || !wish.trim()}>
              {loading ? "Procurando destinos…" : result ? "Sugerir de novo" : "✨ Sugerir destinos"}
            </button>
          </div>
        </>
      )}

      {loading && <div className="ai-loading"><span className="spinner" /> Pesquisando destinos e como chegar… pode levar de 1 a 2 minutos.</div>}
      {error && <p className="bad small">⚠️ {error}</p>}

      {result && !loading && (
        <div className="ai-result">
          {result.summary && <p className="ai-summary">{result.summary}</p>}
          <div className="dest-list">
            {result.destinations.map((d, i) => {
              const cheapest = d.options.find((o) => o.priceValue > 0);
              const isOpen = open === i;
              return (
                <article key={d.name + i} className={`dest ${isOpen ? "open" : ""}`}>
                  <button className="dest-head" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}>
                    <span className="dest-emoji">{d.emoji}</span>
                    <span className="grow">
                      <strong>{d.name}</strong>
                      <small className="muted">{d.why}</small>
                    </span>
                    <span className="dest-modes">
                      {[...new Set(d.options.map((o) => o.mode))].map((m) => <span key={m} title={MODE_LABEL[m]}>{MODE_ICON[m]}</span>)}
                    </span>
                    {cheapest && <span className="dest-price">desde <b>{cheapest.price}</b></span>}
                  </button>
                  {isOpen && (
                    <div className="dest-body">
                      {d.highlights.length > 0 && <ul className="tip-list">{d.highlights.map((h, j) => <li key={j}>{h}</li>)}</ul>}
                      <p className="small">
                        {d.bestTime && <>🌤️ {d.bestTime}<br /></>}
                        {d.estimatedTotal && <>💰 Total estimado por pessoa: <b>{d.estimatedTotal}</b></>}
                      </p>
                      <h4>Como chegar</h4>
                      <ul className="options">
                        {d.options.map((o, j) => (
                          <li key={j} className={o === cheapest ? "best" : ""}>
                            <span className="opt-icon">{MODE_ICON[o.mode]}</span>
                            <div className="grow">
                              <strong>{o.company}</strong> <span className="muted small">{o.route}</span>
                              <small className="muted">{[o.duration, o.details].filter(Boolean).join(" · ")}</small>
                            </div>
                            <div className="opt-price">
                              <strong>{o.price || "—"}</strong>
                              <div className="opt-actions">
                                {o.url && <a className="btn sm primary" href={o.url} target="_blank" rel="noreferrer">Ver ↗</a>}
                                <button className="btn sm" onClick={() => onAdd(o, d.name)} title="Adicionar ao roteiro">＋ Roteiro</button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="row end">
                        <button className="btn primary" onClick={() => choose(d)}>Escolher {d.name.split(",")[0]} como destino →</button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          {result.tips.length > 0 && (
            <>
              <h4>Dicas</h4>
              <ul className="tip-list">{result.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </>
          )}
          <p className="hint">Sugestões e preços encontrados pela IA em {new Date(result.at).toLocaleString("pt-BR")}. Confirme sempre no site antes de comprar.</p>
          {result.sources.length > 0 && (
            <details className="sources">
              <summary className="small muted">Fontes consultadas ({result.sources.length})</summary>
              <ul>{result.sources.map((s, i) => <li key={i}><a href={s.uri} target="_blank" rel="noreferrer">{s.title || s.uri}</a></li>)}</ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
