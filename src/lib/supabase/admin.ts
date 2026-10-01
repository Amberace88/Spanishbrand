import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isConfigured } from "@/lib/env";

let cached: SupabaseClient | null = null;

/** Reads fail fast (8 s) so a slow database never hangs a page; writes get 25 s; storage uploads are not capped. */
const timedFetch: typeof fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.includes("/storage/v1/") || init?.signal) return fetch(input, init);
  const method = (init?.method ?? "GET").toUpperCase();
  return fetch(input, { ...init, signal: AbortSignal.timeout(method === "GET" || method === "HEAD" ? 8_000 : 25_000) });
};

/**
 * Service-role client. SERVER ONLY. Bypasses RLS — every caller must perform
 * its own authorization (see lib/auth/rbac.ts) before reading/writing.
 */
export function db(): SupabaseClient {
  if (!isConfigured.db()) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }
  if (!cached) {
    cached = createClient(env.supabaseUrl()!, env.supabaseServiceKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-application": "brand-os" }, fetch: timedFetch },
    });
  }
  return cached;
}

/** Returns null instead of throwing when the DB isn't configured (storefront fallbacks). */
export function dbOrNull(): SupabaseClient | null {
  return isConfigured.db() ? db() : null;
}
