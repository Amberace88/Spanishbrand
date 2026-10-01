"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff, type StaffRole } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";

const ROLE = z.enum(["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER", "CUSTOMER_SUPPORT", "ANALYST"]);
export type TeamState = { ok?: boolean; error?: string; message?: string };

/** Add a team member by email: existing user → role; new email → Supabase invitation + role. */
export async function inviteMemberAction(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const staff = await requireStaff(["ADMIN"]);
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(200), role: ROLE }).safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return { error: "Email o rol no válido." };
  const { email, role } = parsed.data;
  if (role === "SUPER_ADMIN" && !staff.roles.includes("SUPER_ADMIN")) return { error: "Solo un SUPER_ADMIN puede crear otro SUPER_ADMIN." };
  const sb = db();
  let userId: string | null = null;
  const { data: prof } = await sb.from("profiles").select("id").eq("email", email).maybeSingle();
  userId = prof?.id ?? null;
  if (!userId) {
    // look through auth users (small team stores: first pages are enough)
    for (let page = 1; page <= 5 && !userId; page++) {
      const { data } = await sb.auth.admin.listUsers({ page, perPage: 200 });
      userId = data.users.find((u) => (u.email ?? "").toLowerCase() === email)?.id ?? null;
      if (!data.users.length || data.users.length < 200) break;
    }
  }
  let invited = false;
  if (!userId) {
    const { data, error } = await sb.auth.admin.inviteUserByEmail(email, { redirectTo: `${env.siteUrl().replace(/\/$/, "")}/auth/callback?next=/admin/cuenta` });
    if (error || !data.user) return { error: `No se pudo invitar: ${error?.message ?? "error"}` };
    userId = data.user.id;
    invited = true;
  }
  const { error } = await sb.from("user_roles").upsert({ user_id: userId, brand_id: env.brandId(), role }, { onConflict: "user_id,brand_id,role", ignoreDuplicates: true });
  if (error) return { error: error.message };
  await audit({ action: "team.invite", actorId: staff.userId, actorEmail: staff.email, entityType: "user", entityId: userId, after: { email, role, invited } });
  revalidatePath("/admin/equipo");
  return { ok: true, message: invited ? `Invitación enviada a ${email} (${role}).` : `${email} ahora tiene el rol ${role}.` };
}

export async function removeRoleAction(formData: FormData) {
  const staff = await requireStaff(["ADMIN"]);
  const userId = z.string().uuid().parse(formData.get("userId"));
  const role = ROLE.parse(formData.get("role")) as StaffRole;
  const sb = db();
  if (role === "SUPER_ADMIN") {
    if (!staff.roles.includes("SUPER_ADMIN")) redirect("/admin/equipo?e=perm");
    const { count } = await sb.from("user_roles").select("user_id", { count: "exact", head: true }).eq("brand_id", env.brandId()).eq("role", "SUPER_ADMIN");
    if ((count ?? 0) <= 1) redirect("/admin/equipo?e=last");
  }
  await sb.from("user_roles").delete().eq("user_id", userId).eq("brand_id", env.brandId()).eq("role", role);
  await audit({ action: "team.remove", actorId: staff.userId, actorEmail: staff.email, entityType: "user", entityId: userId, before: { role } });
  revalidatePath("/admin/equipo");
}

/** Sign this account out on every device (revokes all refresh tokens). */
export async function signOutEverywhereAction() {
  const staff = await requireStaff(["ADMIN", "ANALYST", "CUSTOMER_SUPPORT", "CONTENT_MANAGER"]);
  const sb = await supabaseServer();
  await sb?.auth.signOut({ scope: "global" });
  await audit({ action: "auth.signout_all", actorId: staff.userId, actorEmail: staff.email, entityType: "user", entityId: staff.userId });
  redirect("/admin/login");
}
