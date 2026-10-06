/**
 * Cron Triggers (wrangler.jsonc "triggers.crons") replacing the Netlify scheduled functions. UTC.
 * Kept identical in cadence and job selection to netlify/functions/*.mts so moving hosts changes nothing.
 */

/** was netlify/functions/catalog-runner.mts: advance the catalog builder (chunked, resumable job state). */
export const CRON_CATALOG = "*/10 * * * *";
/** was netlify/functions/scheduler.mts */
export const CRON_SCHEDULER = "*/15 * * * *";

const every15 = ["retry-fulfillment", "drops", "health"];
const hourly = ["reconcile-orders", "abandoned-carts"];
const daily = ["catalog-sync", "content-aggregation", "availability"];

/** Same job selection as netlify/functions/scheduler.mts. */
export function schedulerJobs(at: Date): string[] {
  const m = at.getUTCMinutes();
  const h = at.getUTCHours();
  return [...every15, ...(m < 15 ? hourly : []), ...(h === 3 && m < 15 ? daily : [])];
}

/** /api/cron/<job> names to run for one cron firing. */
export function jobsFor(cron: string, scheduledTime: number): string[] {
  if (cron === CRON_CATALOG) return ["catalog"];
  if (cron === CRON_SCHEDULER) return schedulerJobs(new Date(scheduledTime));
  return [];
}
