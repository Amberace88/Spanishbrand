"use client";
import { useState } from "react";
import { useT } from "@/components/providers/I18nProvider";

interface Option {
  key: string;
  label: string;
  image?: string;
}

export function PollCard({ post, dark = false }: { post: { id: string; title: string; body: string | null; options: Option[] }; dark?: boolean }) {
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function vote() {
    if (!selected) return;
    const res = await fetch("/api/community/vote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ postId: post.id, option: selected }) });
    const body = await res.json().catch(() => ({}));
    if (body.ok) setResults(body.results);
    else setError(body.error === "already_voted" ? "Ya has votado en esta encuesta." : t("common.error"));
  }

  const total = results ? Object.values(results).reduce((a, b) => a + b, 0) : 0;
  return (
    <div>
      <h3 className="display text-4xl sm:text-5xl">{post.title}</h3>
      {post.body && <p className={`mt-3 max-w-xl text-sm ${dark ? "text-bone/70" : "text-stone-2"}`}>{post.body}</p>}
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {post.options.map((o) => {
          const pct = results && total ? Math.round(((results[o.key] ?? 0) / total) * 100) : null;
          return (
            <button
              key={o.key}
              disabled={!!results}
              onClick={() => setSelected(o.key)}
              className={`relative overflow-hidden border p-5 text-left transition-colors ${selected === o.key ? (dark ? "border-bone" : "border-ink") : dark ? "border-bone/20 hover:border-bone/50" : "border-ink/15 hover:border-ink/40"}`}
            >
              {pct !== null && <span className="absolute inset-y-0 left-0 bg-rojo/20 transition-all duration-700" style={{ width: `${pct}%` }} />}
              <span className="relative flex items-center justify-between gap-3">
                <span className="display text-2xl">{o.label}</span>
                {pct !== null && <span className="text-sm tabular-nums">{pct}%</span>}
              </span>
            </button>
          );
        })}
      </div>
      {!results ? (
        <button onClick={vote} disabled={!selected} className={`btn mt-6 ${dark ? "btn-primary" : "btn-ink"}`}>
          {t("community.vote")}
        </button>
      ) : (
        <p className="serif mt-6 text-2xl italic">{t("community.voted")}</p>
      )}
      {error && <p className="mt-3 text-sm text-rojo">{error}</p>}
    </div>
  );
}
