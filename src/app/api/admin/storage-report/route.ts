import { NextResponse } from "next/server";
import { getStaffSession, hasRole } from "@/lib/auth/rbac";
import { REPORT_PREFIXES, storageReport } from "@/lib/storage-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/admin/storage-report[?prefix=catalog/prints] — ADMIN only, opt-in, DRY RUN.
 * Lists catalog storage objects that nothing references (and those used only by archived products),
 * with counts and bytes. Never deletes anything; cleanup is a separate, deliberate decision.
 */
export async function GET(req: Request) {
  const s = await getStaffSession();
  if (!s || !hasRole(s, ["ADMIN"])) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const prefix = new URL(req.url).searchParams.get("prefix");
  if (prefix && !(REPORT_PREFIXES as readonly string[]).includes(prefix)) return NextResponse.json({ error: "BAD_PREFIX", allowed: REPORT_PREFIXES }, { status: 400 });
  try {
    return NextResponse.json(await storageReport(prefix ? [prefix] : REPORT_PREFIXES));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "FAILED" }, { status: 500 });
  }
}
