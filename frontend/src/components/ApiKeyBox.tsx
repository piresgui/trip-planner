import { useState } from "react";
import { setApiKey } from "../gemini";

/** Campo para salvar/remover a chave do Gemini (fica só no localStorage). */
export default function ApiKeyBox({ hasKey, onChange }: { hasKey: boolean; onChange: (key: string) => void }) {
  const [draft, setDraft] = useState("");
  const save = (k: string) => {
    setApiKey(k);
    onChange(k.trim());
    setDraft("");
  };
  return (
    <div className="api-key">
      <p className="small">
        Cole sua chave gratuita do Gemini. Crie em{" "}
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>.
        Ela fica salva só neste navegador.
      </p>
      <div className="row">
        <input type="password" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={hasKey ? "••••••••  (salva)" : "Chave da API do Gemini"} />
        <button className="btn primary" onClick={() => save(draft)} disabled={!draft.trim()}>Salvar</button>
        {hasKey && <button className="btn" onClick={() => save("")}>Remover</button>}
      </div>
    </div>
  );
}
