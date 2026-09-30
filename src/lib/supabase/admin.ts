import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isConfigured } from "@/lib/env";

let cached: SupabaseClient | null = null;

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
      global: { headers: { "x-application": "brand-os" } },
    });
  }
  return cached;
}

/** Returns null instead of throwing when the DB isn't configured (storefront fallbacks). */
export function dbOrNull(): SupabaseClient | null {
  return isConfigured.db() ? db() : null;
}
