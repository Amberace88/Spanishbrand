import "server-only";
import { getSessionUser } from "@/lib/supabase/server";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

/** Resolves the signed-in customer. Every account query filters by this customer id (server-side authz). */
export async function getCurrentCustomer() {
  const user = await getSessionUser();
  const sb = dbOrNull();
  if (!user || !sb) return { user, customer: null };
  const { data: customer } = await sb.from("customers").select("*").eq("brand_id", env.brandId()).eq("user_id", user.id).maybeSingle();
  return { user, customer };
}
