/** Cloudflare Cron Triggers keep the Netlify scheduled-function cadence and job selection (cloudflare/cron.ts). */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CRON_CATALOG, CRON_SCHEDULER, jobsFor } from "../cloudflare/cron";

const at = (iso: string) => Date.parse(iso);

describe("cloudflare cron", () => {
  it("runs the catalog builder on its own trigger", () => {
    expect(jobsFor(CRON_CATALOG, at("2026-10-06T10:20:00Z"))).toEqual(["catalog"]);
  });

  it("selects the same jobs as netlify/functions/scheduler.mts", () => {
    expect(jobsFor(CRON_SCHEDULER, at("2026-10-06T10:30:00Z"))).toEqual(["retry-fulfillment", "drops", "health"]);
    expect(jobsFor(CRON_SCHEDULER, at("2026-10-06T10:00:00Z"))).toEqual(["retry-fulfillment", "drops", "health", "reconcile-orders", "abandoned-carts"]);
    expect(jobsFor(CRON_SCHEDULER, at("2026-10-06T03:00:00Z"))).toEqual(["retry-fulfillment", "drops", "health", "reconcile-orders", "abandoned-carts", "catalog-sync", "content-aggregation", "availability"]);
    expect(jobsFor(CRON_SCHEDULER, at("2026-10-06T03:15:00Z"))).toEqual(["retry-fulfillment", "drops", "health"]);
    expect(jobsFor("0 0 * * *", at("2026-10-06T03:00:00Z"))).toEqual([]);
  });

  it("matches the triggers declared in wrangler.jsonc", () => {
    const cfg = readFileSync(path.resolve(__dirname, "../wrangler.jsonc"), "utf8");
    const crons = JSON.parse(/"crons":\s*(\[[^\]]*\])/.exec(cfg)![1]) as string[];
    expect(crons.sort()).toEqual([CRON_CATALOG, CRON_SCHEDULER].sort());
    expect(cfg).toMatch(/"name":\s*"rojoygualda"/);
  });
});
