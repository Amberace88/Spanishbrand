import "server-only";
import { gl } from "./client";
import { glCatalogList } from "./types";
import { isProviderError } from "../errors";
import type { HealthResult } from "../types";

/** GET /v3/catalogs verifies authentication + catalog availability in one call. */
export async function gelatoHealth(): Promise<HealthResult> {
  const started = Date.now();
  try {
    await gl("product", "/catalogs", glCatalogList, { timeoutMs: 10_000 });
    const latency = Date.now() - started;
    return {
      status: latency > 5000 ? "DEGRADED" : "ONLINE",
      latencyMs: latency,
      checks: { authentication: { ok: true }, catalog: { ok: true } },
    };
  } catch (e) {
    const status = isProviderError(e) ? e.status : null;
    return {
      status: status === 401 || status === 403 ? "ERROR" : "OFFLINE",
      latencyMs: Date.now() - started,
      checks: { authentication: { ok: false, detail: e instanceof Error ? e.message : String(e) } },
    };
  }
}
