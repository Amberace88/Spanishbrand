import { NextResponse } from "next/server";
import { getStaffSession, hasRole } from "@/lib/auth/rbac";
import { rebuildStatus, setRebuildEnabled } from "@/lib/fulfillment/catalog-builder";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

async function admin() {
  const s = await getStaffSession();
  return s && hasRole(s, ["ADMIN"]) ? s : null;
}

/** GET: published products whose design changed since they were built (ADMIN only). */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  return NextResponse.json(await rebuildStatus());
}

/**
 * POST { enabled: boolean } — start / stop rebuilding. While on, every catalog cron run starts at most one
 * replacement (never more than two in flight); each replacement takes over the live product's URL when it
 * publishes, so nothing goes offline.
 */
export async function POST(req: Request) {
  const staff = await admin();
  if (!staff) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { enabled?: unknown };
  if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "ENABLED_REQUIRED" }, { status: 400 });
  await setRebuildEnabled(body.enabled, staff);
  log.info("CATALOG", "design rebuild switch", { enabled: body.enabled, by: staff.userId });
  return NextResponse.json(await rebuildStatus());
}
