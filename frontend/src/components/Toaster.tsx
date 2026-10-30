import { useEffect } from "react";
import { dismissToast, toast, undo, useToasts } from "../store";

export default function Toaster() {
  const toasts = useToasts();

  // Ctrl+Z / Cmd+Z desfaz a última alteração (fora de campos de texto)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]")) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        toast(undo() ? "Alteração desfeita" : "Nada para desfazer");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="toaster" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.text}</span>
          {t.undo && (
            <button
              className="toast-action"
              onClick={() => {
                undo();
                dismissToast(t.id);
              }}
            >
              Desfazer
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
