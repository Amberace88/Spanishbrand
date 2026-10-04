"use client";
import { useCallback, useEffect, useState } from "react";

interface Status {
  enabled: boolean;
  pending: number;
  forced: number;
  next: { key: string; reason: "forced" | "changed" }[];
  inFlight: { key: string; phase: string }[];
  failed: { key: string; error: string | null }[];
}

/**
 * Rebuild of published products whose design changed (lib/catalog/print-safety.ts → designVersion).
 * Start/stop switch: the catalog cron then builds one replacement at a time and swaps it in on publish.
 */
export function RebuildChanged() {
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const load = useCallback(
    () =>
      fetch("/api/admin/catalog/rebuild")
        .then((r) => r.json())
        .then((j) => (typeof j.pending === "number" ? setSt(j) : setMsg(j.error ?? "Error")))
        .catch(() => setMsg("Error de red")),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  // while running, refresh the counters every 20 s
  useEffect(() => {
    if (!st?.enabled) return;
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [st?.enabled, load]);
  const toggle = async () => {
    if (!st) return;
    setBusy(true);
    setMsg(null);
    const j = await fetch("/api/admin/catalog/rebuild", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !st.enabled }) })
      .then((r) => r.json())
      .catch(() => ({ error: "Error de red" }));
    setBusy(false);
    if (typeof j.pending === "number") setSt(j);
    else setMsg(`Error: ${j.error ?? "desconocido"}`);
  };
  const n = st?.pending ?? 0;
  const label = (k: string) => k.replace(/^p:/, "").replace(/:/, " · ");
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-3xl">
          <p className="font-semibold">Diseños modificados</p>
          <p className="mt-1 text-sm text-stone-600">
            {st == null
              ? "Comprobando…"
              : n === 0 && !st.inFlight.length
                ? "Todos los productos publicados imprimen la versión actual de su diseño."
                : `${n} productos publicados se hicieron con una versión anterior de su diseño (márgenes de seguridad, arte redibujado…). Se reconstruyen de uno en uno: el producto nuevo sustituye al actual con la misma URL al publicarse, sin dejar de vender.`}
          </p>
          {st && (st.inFlight.length > 0 || st.enabled) && (
            <p className="mt-1 text-xs text-stone-500">
              {st.enabled ? "En marcha" : "Detenido"} · en curso: {st.inFlight.length ? st.inFlight.map((j) => `${label(j.key)} (${j.phase})`).join(", ") : "ninguno"}
              {st.forced ? ` · ${st.forced} prioritarios` : ""}
            </p>
          )}
          {st && st.failed.length > 0 && <p className="mt-1 text-xs text-red-700">Fallidos: {st.failed.map((f) => label(f.key)).join(", ")}</p>}
          {msg && <p className="mt-1 text-sm font-medium text-stone-900">{msg}</p>}
        </div>
        <button
          onClick={toggle}
          disabled={busy || !st || (!st.enabled && n === 0)}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 ${st?.enabled ? "bg-red-700" : "bg-stone-900"}`}
        >
          {busy ? "…" : st?.enabled ? `Detener reconstrucción (${n})` : `Reconstruir diseños modificados (${n})`}
        </button>
      </div>
      {st && st.next.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-stone-500 underline">
            {open ? "Ocultar" : "Ver los siguientes"}
          </button>
          {open && (
            <ul className="mt-2 grid gap-1 text-xs text-stone-600 sm:grid-cols-2">
              {st.next.map((c) => (
                <li key={c.key}>
                  {label(c.key)} <span className="text-stone-400">{c.reason === "forced" ? "· prioritario" : "· diseño cambiado"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
