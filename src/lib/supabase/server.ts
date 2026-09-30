import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env, isConfigured } from "@/lib/env";

/** Per-request Supabase client bound to the user's auth cookies (RLS applies). */
export async function supabaseServer() {
  if (!isConfigured.auth()) return null;
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl()!, env.supabaseAnonKey()!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — cookies are refreshed in proxy.ts instead.
        }
      },
    },
  });
}

export async function getSessionUser() {
  const sb = await supabaseServer();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}
