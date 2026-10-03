import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getStaffSession, hasRole } from "@/lib/auth/rbac";
import { listKidsRefresh, runRefreshStep, type RefreshResult } from "@/lib/fulfillment/image-refresh";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

async function admin() {
  const s = await getStaffSession();
  return s && hasRole(s, ["ADMIN"]) ? s : null;
}

/** GET: published kids' products and the state of their image refresh (ADMIN only). */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  return NextResponse.json({ products: await listKidsRefresh() });
}

/**
 * POST { key: "p:<design>:<kids|toddler|baby|kidshoodie>", restart? } — advance that product's refresh by one step.
 * POST { all: true } — advance every kids' product that has not been refreshed yet, for up to ~20 s per call
 * (call again until `remaining` is 0). Nothing runs unless an admin calls this.
 */
export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { key?: string; restart?: boolean; all?: boolean };
  const started = Date.now();
  const results: RefreshResult[] = [];
  if (typeof body.key === "string") {
    results.push(await runRefreshStep(body.key, { restart: Boolean(body.restart) }));
  } else if (body.all === true) {
    const open = (await listKidsRefresh()).filter((p) => !p.refresh || (p.refresh.phase !== "done" && p.refresh.phase !== "failed"));
    for (const p of open) {
      if (Date.now() - started > 20_000) break;
      for (let i = 0; i < 8 && Date.now() - started < 20_000; i++) {
        const r = await runRefreshStep(p.key);
        if (r.done || r.waitMs) {
          results.push(r);
          break;
        }
      }
    }
  } else {
    return NextResponse.json({ error: "KEY_OR_ALL_REQUIRED" }, { status: 400 });
  }
  // new photos reach the storefront at once (listing cached up to 1 h, product pages 10 min)
  if (results.some((r) => r.phase === "done")) revalidateTag("listing", "max");
  log.info("CATALOG", "kids image refresh", { ms: Date.now() - started, results: results.length });
  const remaining = body.all ? (await listKidsRefresh()).filter((p) => !p.refresh || (p.refresh.phase !== "done" && p.refresh.phase !== "failed")).length : undefined;
  return NextResponse.json({ results, remaining });
}
