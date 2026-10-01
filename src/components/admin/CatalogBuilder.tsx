"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface PlanItem {
  key: string;
  kind: "RESOLVE" | "PRODUCT";
  label: string;
}
interface JobState {
  phase: string;
  error?: string | null;
  message?: string | null;
  product_id?: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DONE = new Set(["done", "failed"]);

export function CatalogBuilder({ plan }: { plan: PlanItem[] }) {
  const [jobs, setJobs] = useState<Record<string, JobState>>({});
  const [running, setRunning] = useState(false);
  const [concurrency, setConcurrency] = useState(3);
  const [filter, setFilter] = useState<"all" | "active" | "failed" | "done">("all");
  const stop = useRef(false);
  const [log, setLog] = useState<string[]>([]);

  const push = (s: string) => setLog((l) => [`${new Date().toLocaleTimeString("es-ES")} ${s}`, ...l].slice(0, 200));

  const refresh = useCallback(async () => {
    const r = await fetch("/api/admin/catalog", { cache: "no-store" });
    if (!r.ok) return push(`GET ${r.status}`);
    const body = (await r.json()) as { jobs: (JobState & { key: string })[] };
    setJobs(Object.fromEntries(body.jobs.map((j) => [j.key, { phase: j.phase, error: j.error, product_id: j.product_id }])));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function runJob(key: string, retry = false) {
    let first = true;
    for (let guard = 0; guard < 80 && !stop.current; guard++) {
      const r = await fetch("/api/admin/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, retry: retry && first }) }).catch(() => null);
      first = false;
      if (!r) {
        await sleep(4000);
        continue;
      }
      if (r.status === 403) {
        push("Sesión caducada — vuelve a iniciar sesión.");
        stop.current = true;
        return;
      }
      const res = (await r.json().catch(() => ({ phase: "error", error: `HTTP ${r.status}` }))) as { phase: string; done?: boolean; waitMs?: number; error?: string; message?: string };
      if (!r.ok && !res.phase) {
        await sleep(5000);
        continue;
      }
      setJobs((j) => ({ ...j, [key]: { ...j[key], phase: res.phase, error: res.error ?? null, message: res.message ?? null } }));
      if (res.message || res.error) push(`${key}: ${res.phase}${res.message ? ` · ${res.message}` : ""}${res.error ? ` · ${res.error}` : ""}`);
      if (res.done) return;
      if (res.waitMs) await sleep(res.waitMs);
    }
  }

  async function start(retryFailed = false) {
    stop.current = false;
    setRunning(true);
    await refresh();
    const current = await fetch("/api/admin/catalog", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ jobs: [] }));
    const state = Object.fromEntries((current.jobs as (JobState & { key: string })[]).map((j) => [j.key, j.phase]));
    const todo = (kind: PlanItem["kind"]) => plan.filter((p) => p.kind === kind && (state[p.key] !== "done" && (retryFailed || state[p.key] !== "failed")));
    for (const p of todo("RESOLVE")) {
      if (stop.current) break;
      await runJob(p.key, retryFailed);
    }
    const queue = todo("PRODUCT");
    const workers = Array.from({ length: concurrency }, async () => {
      while (queue.length && !stop.current) {
        const p = queue.shift()!;
        await runJob(p.key, retryFailed);
      }
    });
    await Promise.all(workers);
    setRunning(false);
    push(stop.current ? "Detenido." : "Terminado.");
    refresh();
  }

  const counts = plan.reduce(
    (c, p) => {
      const ph = jobs[p.key]?.phase ?? "pending";
      if (ph === "done") c.done++;
      else if (ph === "failed") c.failed++;
      else if (ph !== "pending" && ph !== "new") c.active++;
      return c;
    },
    { done: 0, failed: 0, active: 0 },
  );
  const shown = plan.filter((p) => {
    const ph = jobs[p.key]?.phase ?? "pending";
    if (filter === "done") return ph === "done";
    if (filter === "failed") return ph === "failed";
    if (filter === "active") return !DONE.has(ph);
    return true;
  });

  return (
    <div className="space-y-5" data-catalog-done={counts.done} data-catalog-failed={counts.failed} data-catalog-total={plan.length} data-catalog-running={running ? "1" : "0"}>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <button onClick={() => start(false)} disabled={running} className="rounded-full bg-[#c8102e] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {running ? "Construyendo…" : "Construir catálogo"}
        </button>
        <button onClick={() => start(true)} disabled={running} className="rounded-full border border-stone-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
          Reintentar fallidos
        </button>
        <button onClick={() => (stop.current = true)} disabled={!running} className="rounded-full border border-stone-300 px-4 py-2.5 text-sm disabled:opacity-40">
          Detener
        </button>
        <label className="ml-auto flex items-center gap-2 text-sm text-stone-600">
          En paralelo
          <select value={concurrency} onChange={(e) => setConcurrency(Number(e.target.value))} className="rounded border border-stone-300 px-2 py-1">
            {[1, 2, 3, 4].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Total", plan.length],
          ["Publicados / listos", counts.done],
          ["En curso", counts.active],
          ["Con error", counts.failed],
        ].map(([l, n]) => (
          <div key={l as string} className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-stone-500">{l}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{n}</p>
          </div>
        ))}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full bg-[#c8102e] transition-all" style={{ width: `${(counts.done / plan.length) * 100}%` }} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-stone-200 bg-white">
          <div className="flex gap-2 border-b border-stone-200 p-3 text-sm">
            {(["all", "active", "failed", "done"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 ${filter === f ? "bg-stone-900 text-white" : "hover:bg-stone-100"}`}>
                {{ all: "Todos", active: "Pendientes", failed: "Errores", done: "Listos" }[f]}
              </button>
            ))}
          </div>
          <ul className="max-h-[60vh] divide-y divide-stone-100 overflow-y-auto text-sm">
            {shown.map((p) => {
              const j = jobs[p.key];
              const ph = j?.phase ?? "pendiente";
              return (
                <li key={p.key} className="flex items-start gap-3 px-4 py-2.5">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${ph === "done" ? "bg-green-600" : ph === "failed" ? "bg-red-600" : ph === "pendiente" || ph === "new" ? "bg-stone-300" : "animate-pulse bg-amber-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.kind === "RESOLVE" ? `Producto base · ${p.key.slice(4)}` : p.label}</p>
                    <p className="truncate text-xs text-stone-500">
                      {p.key} · {ph}
                      {j?.message ? ` · ${j.message}` : ""}
                    </p>
                    {j?.error && <p className="mt-1 break-words text-xs text-red-700">{j.error}</p>}
                  </div>
                  {ph === "failed" && !running && (
                    <button onClick={() => runJob(p.key, true)} className="shrink-0 text-xs font-semibold text-[#c8102e] underline">
                      Reintentar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-950 p-4 font-mono text-[11px] leading-relaxed text-stone-200">
          <p className="mb-2 text-stone-400">Registro</p>
          <div id="catalog-log" className="max-h-[56vh] overflow-y-auto whitespace-pre-wrap">
            {log.length ? log.join("\n") : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
