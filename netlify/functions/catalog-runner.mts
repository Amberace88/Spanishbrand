/**
 * Netlify Scheduled Function — builds the catalog server-side every minute (no browser needed).
 * Each run (every 10 min) advances up to 3 jobs for ~20 s via the protected /api/cron/catalog endpoint; when
 * nothing is left it returns immediately.
 */
import type { Config } from "@netlify/functions";

export default async () => {
  const base = process.env.URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) return new Response("missing URL or CRON_SECRET", { status: 500 });
  const r = await fetch(`${base}/api/cron/catalog`, { method: "POST", headers: { Authorization: `Bearer ${secret}` } }).catch((e) => ({ status: 0, text: async () => String(e) }));
  return new Response(`catalog:${r.status} ${(await r.text()).slice(0, 300)}`);
};

export const config: Config = { schedule: "*/10 * * * *" }; // every 10 min: Netlify credits (free plan paused the site on 2026-10-04)
