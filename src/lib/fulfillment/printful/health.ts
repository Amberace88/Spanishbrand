import "server-only";
import { z } from "zod";
import { pf } from "./client";
import { pfEnvelope } from "./types";
import type { HealthResult } from "../types";
import { isProviderError } from "../errors";

/** Checks auth (GET /stores) and catalog availability (GET /products/71 — a long-lived catalog item). */
export async function printfulHealth(): Promise<HealthResult> {
  const checks: HealthResult["checks"] = {};
  const started = Date.now();
  try {
    await pf("/stores", pfEnvelope(z.unknown()), { timeoutMs: 10_000 });
    checks.authentication = { ok: true };
  } catch (e) {
    const status = isProviderError(e) ? e.status : null;
    checks.authentication = { ok: false, detail: e instanceof Error ? e.message : String(e) };
    return {
      status: status === 401 || status === 403 ? "ERROR" : "OFFLINE",
      latencyMs: Date.now() - started,
      checks,
    };
  }
  try {
    await pf("/categories", pfEnvelope(z.unknown()), { timeoutMs: 10_000 });
    checks.catalog = { ok: true };
  } catch (e) {
    checks.catalog = { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
  const latency = Date.now() - started;
  const degraded = !checks.catalog?.ok || latency > 5000;
  return { status: degraded ? "DEGRADED" : "ONLINE", latencyMs: latency, checks };
}
