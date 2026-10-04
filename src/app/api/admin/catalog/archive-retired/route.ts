import { NextResponse } from "next/server";
import { getStaffSession, hasRole } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { RETIRED_LIST } from "@/lib/catalog/retired";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

async function admin() {
  const s = await getStaffSession();
  return s && hasRole(s, ["ADMIN"]) ? s : null;
}

/** How many live products still belong to retired designs (preview before archiving). */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { count, error } = await db()
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", env.brandId())
    .neq("status", "ARCHIVED")
    .in("metadata->catalog->>design", [...RETIRED_LIST]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pending: count ?? 0, designs: RETIRED_LIST.length });
}

/** Archive them (reversible: status only; orders and history keep their rows). */
export async function POST() {
  const staff = await admin();
  if (!staff) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { data, error } = await db()
    .from("products")
    .update({ status: "ARCHIVED", featured: false })
    .eq("brand_id", env.brandId())
    .neq("status", "ARCHIVED")
    .in("metadata->catalog->>design", [...RETIRED_LIST])
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  log.info("CATALOG", "archived retired designs", { by: staff.email, n: data?.length ?? 0 });
  return NextResponse.json({ archived: data?.length ?? 0 });
}
