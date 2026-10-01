import { NextResponse } from "next/server";
import { getStaffSession, hasRole } from "@/lib/auth/rbac";
import { buildPlan, listJobs, runStep } from "@/lib/fulfillment/catalog-builder";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

async function staffOr403() {
  const s = await getStaffSession();
  if (!s || !hasRole(s, ["ADMIN"])) return null;
  return s;
}

/** Catalog builder: plan + current job states (ADMIN only). */
export async function GET() {
  const staff = await staffOr403();
  if (!staff) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const [plan, jobs] = await Promise.all([Promise.resolve(buildPlan()), listJobs()]);
  return NextResponse.json({ plan, jobs });
}

/** Run one resumable step of one job: { key, retry? }. */
export async function POST(req: Request) {
  const staff = await staffOr403();
  if (!staff) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { key?: string; retry?: boolean };
  const key = typeof body.key === "string" ? body.key : "";
  if (!buildPlan().some((p) => p.key === key)) return NextResponse.json({ error: "UNKNOWN_JOB" }, { status: 400 });
  const started = Date.now();
  const res = await runStep(key, staff, { retry: Boolean(body.retry) });
  log.info("CATALOG", "catalog step", { key, phase: res.phase, ms: Date.now() - started, error: res.error });
  return NextResponse.json(res);
}
