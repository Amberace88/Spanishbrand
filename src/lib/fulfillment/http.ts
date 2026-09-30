import type { ZodType } from "zod";
import { ProviderError } from "./errors";
import { log } from "@/lib/logger";

export interface RequestOptions<T> {
  provider: string;
  baseUrl: string;
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers: Record<string, string>;
  body?: unknown;
  schema?: ZodType<T>;
  timeoutMs?: number;
  /** Extracts a human-readable error message from a provider error body. */
  errorMessage?: (body: unknown) => string | undefined;
}

/**
 * Shared JSON HTTP helper for provider adapters:
 * timeout, structured error classification, response validation (zod).
 */
export async function providerRequest<T>(opts: RequestOptions<T>): Promise<T> {
  const method = opts.method ?? "GET";
  const endpoint = `${method} ${opts.path}`;
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(opts.baseUrl + opts.path, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json", ...opts.headers },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
      cache: "no-store",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.warn("PROVIDER", "network error", { provider: opts.provider, endpoint, msg });
    throw new ProviderError({ provider: opts.provider, endpoint, status: null, message: `Network error: ${msg}` });
  }

  const requestId =
    res.headers.get("x-request-id") ?? res.headers.get("x-amzn-requestid") ?? res.headers.get("cf-ray");
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 2000) };
    }
  }

  log.debug("PROVIDER", "response", { provider: opts.provider, endpoint, status: res.status, ms: Date.now() - started });

  if (!res.ok) {
    const message = opts.errorMessage?.(body) ?? `HTTP ${res.status}`;
    throw new ProviderError({
      provider: opts.provider,
      endpoint,
      status: res.status,
      message,
      requestId,
      payload: body,
    });
  }

  if (!opts.schema) return body as T;
  const parsed = opts.schema.safeParse(body);
  if (!parsed.success) {
    throw new ProviderError({
      provider: opts.provider,
      endpoint,
      status: res.status,
      message: `Unexpected response shape: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      requestId,
      payload: body,
      kind: "TRANSIENT",
      code: "SCHEMA_MISMATCH",
    });
  }
  return parsed.data;
}

export function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
