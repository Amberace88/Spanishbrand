import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import { log } from "@/lib/logger";

export type StaffRole = "SUPER_ADMIN" | "ADMIN" | "CONTENT_MANAGER" | "CUSTOMER_SUPPORT" | "ANALYST";

export interface StaffSession {
  userId: string;
  email: string;
  roles: StaffRole[];
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const user = await getSessionUser();
  const sb = dbOrNull();
  if (!user || !sb) return null;
  const email = (user.email ?? "").toLowerCase();

  let { data: rows } = await sb.from("user_roles").select("role").eq("user_id", user.id).eq("brand_id", env.brandId());

  // Bootstrap: first login of an email listed in ADMIN_EMAILS becomes SUPER_ADMIN.
  if ((!rows || rows.length === 0) && email && env.adminEmails().includes(email)) {
    const { error } = await sb.from("user_roles").insert({ user_id: user.id, brand_id: env.brandId(), role: "SUPER_ADMIN" });
    if (!error) {
      await audit({ action: "admin.bootstrap", actorId: user.id, actorEmail: email, entityType: "user", entityId: user.id });
      log.info("SECURITY", "bootstrapped super admin", { userId: user.id });
      rows = [{ role: "SUPER_ADMIN" }];
    }
  }
  if (!rows || rows.length === 0) return null;
  return { userId: user.id, email, roles: rows.map((r) => r.role as StaffRole) };
}

export function hasRole(s: StaffSession, allowed: StaffRole[]) {
  return s.roles.includes("SUPER_ADMIN") || s.roles.some((r) => allowed.includes(r));
}

/** Server-side guard for admin pages/actions. Redirects to login when unauthenticated. */
export async function requireStaff(allowed: StaffRole[] = ["ADMIN"]): Promise<StaffSession> {
  const s = await getStaffSession();
  if (!s) redirect("/admin/login");
  if (!hasRole(s, allowed)) {
    log.warn("SECURITY", "forbidden admin access", { userId: s.userId, allowed });
    redirect("/admin?forbidden=1");
  }
  return s;
}
