import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public, aggregate-only build progress (counts per phase + last activity) for monitoring the catalog builder. */
export async function GET() {
  const sb = db();
  const phases = ["new", "test", "mockup", "poll", "images", "publish", "done", "failed"] as const;
  const counts: Record<string, number> = {};
  await Promise.all(
    phases.map(async (ph) => {
      const { count } = await sb.from("catalog_jobs").select("key", { count: "exact", head: true }).eq("phase", ph);
      counts[ph] = count ?? 0;
    }),
  );
  const { data: last } = await sb.from("catalog_jobs").select("updated_at").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count: doneLastHour } = await sb.from("catalog_jobs").select("key", { count: "exact", head: true }).eq("phase", "done").gte("updated_at", since);
  return NextResponse.json({ counts, lastActivity: last?.updated_at ?? null, doneLastHour: doneLastHour ?? 0 }, { headers: { "Cache-Control": "public, max-age=60" } });
}
