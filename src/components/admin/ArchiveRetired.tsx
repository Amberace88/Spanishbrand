"use client";
import { useEffect, useState } from "react";

/** One-click archive of products whose designs were retired from the catalogue (reversible). */
export function ArchiveRetired() {
  const [pending, setPending] = useState<number | null>(null);
  const [designs, setDesigns] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const load = () =>
    fetch("/api/admin/catalog/archive-retired")
      .then((r) => r.json())
      .then((j) => {
        if (typeof j.pending === "number") {
          setPending(j.pending);
          setDesigns(j.designs);
        } else setMsg(j.error ?? "Error");
      })
      .catch(() => setMsg("Error de red"));
  useEffect(() => {
    load();
  }, []);
  const run = async () => {
    setBusy(true);
    setMsg(null);
    const j = await fetch("/api/admin/catalog/archive-retired", { method: "POST" }).then((r) => r.json()).catch(() => ({ error: "Error de red" }));
    setBusy(false);
    setMsg(j.error ? `Error: ${j.error}` : `Archivados ${j.archived} productos.`);
    load();
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5">
      <div>
        <p className="font-semibold">Diseños retirados</p>
        <p className="mt-1 text-sm text-stone-600">
          {pending == null ? "Comprobando…" : pending === 0 ? `Todo limpio: ningún producto activo usa los ${designs} diseños retirados.` : `${pending} productos siguen activos con alguno de los ${designs} diseños retirados (ya no se muestran en la tienda). Archívalos para limpiar el catálogo; se puede deshacer.`}
        </p>
        {msg && <p className="mt-1 text-sm font-medium text-stone-900">{msg}</p>}
      </div>
      <button onClick={run} disabled={busy || !pending} className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
        {busy ? "Archivando…" : "Archivar productos retirados"}
      </button>
    </div>
  );
}
