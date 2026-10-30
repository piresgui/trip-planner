import { useState } from "react";

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
  /** Retorna false para impedir a remoção (ex.: pessoa com gastos) */
  canRemove?: (name: string) => boolean;
}

export default function TravelersInput({ value, onChange, canRemove }: Props) {
  const [draft, setDraft] = useState("");

  function add() {
    const names = draft.split(",").map((s) => s.trim()).filter(Boolean);
    const next = [...value];
    for (const n of names) if (!next.some((x) => x.toLowerCase() === n.toLowerCase())) next.push(n);
    onChange(next);
    setDraft("");
  }

  return (
    <div className="tags">
      {value.map((name) => (
        <span key={name} className="tag">
          <span className="avatar" data-initial={name[0]?.toUpperCase()} />
          {name}
          <button
            type="button"
            aria-label={`Remover ${name}`}
            onClick={() => (!canRemove || canRemove(name)) && onChange(value.filter((v) => v !== name))}
          >
            ✕
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) {
            const last = value[value.length - 1];
            if (!canRemove || canRemove(last)) onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
        placeholder={value.length ? "Adicionar pessoa…" : "Nomes, separados por vírgula"}
      />
    </div>
  );
}
