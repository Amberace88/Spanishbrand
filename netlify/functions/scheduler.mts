/**
 * Netlify Scheduled Function — secure server-side job runner.
 * Runs every 15 minutes (Netlify credits) and calls the protected /api/cron/<job> endpoints.
 */
import type { Config } from "@netlify/functions";

const every15 = ["retry-fulfillment", "drops", "health"];
const hourly = ["reconcile-orders", "abandoned-carts"];
const daily = ["catalog-sync", "content-aggregation", "availability"];

export default async () => {
  const now = new Date();
  const m = now.getUTCMinutes();
  const h = now.getUTCHours();
  const jobs = [...every15, ...(m < 15 ? hourly : []), ...(h === 3 && m < 15 ? daily : [])];
  const base = process.env.URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) return new Response("missing URL or CRON_SECRET", { status: 500 });
  const results = await Promise.allSettled(
    jobs.map((j) => fetch(`${base}/api/cron/${j}`, { method: "POST", headers: { Authorization: `Bearer ${secret}` } }).then((r) => `${j}:${r.status}`)),
  );
  return new Response(JSON.stringify(results.map((r) => (r.status === "fulfilled" ? r.value : String(r.reason)))));
};

export const config: Config = { schedule: "*/15 * * * *" };
