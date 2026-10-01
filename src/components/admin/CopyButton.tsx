"use client";
import { useState } from "react";

export function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => null);
        setOk(true);
        setTimeout(() => setOk(false), 1600);
      }}
      className="btn btn-ink px-4 py-2.5 text-[0.62rem]"
    >
      {ok ? "✓ Copiado" : label}
    </button>
  );
}
