import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { dbOrNull } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";
import { track } from "@/lib/analytics/track";

export const runtime = "nodejs";

const schema = z.object({ postId: z.string().uuid(), option: z.string().min(1).max(50) });

/** One vote per user (or per anonymous session). Results stored and used for product decisions. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const sb = dbOrNull();
  if (!sb) return NextResponse.json({ ok: false }, { status: 503 });
  const { data: post } = await sb.from("community_posts").select("id, status, options, closes_at").eq("id", parsed.data.postId).single();
  const options = (post?.options ?? []) as { key: string }[];
  if (!post || post.status !== "OPEN" || (post.closes_at && new Date(post.closes_at) < new Date()) || !options.some((o) => o.key === parsed.data.option)) {
    return NextResponse.json({ ok: false, error: "closed" }, { status: 400 });
  }
  const user = await getSessionUser();
  const sid = (await cookies()).get("sid")?.value ?? null;
  if (!user && !sid) return NextResponse.json({ ok: false }, { status: 400 });
  const { error } = await sb.from("community_votes").insert({ post_id: post.id, option_key: parsed.data.option, user_id: user?.id ?? null, session_id: user ? null : sid });
  if (error?.code === "23505") return NextResponse.json({ ok: false, error: "already_voted" }, { status: 409 });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  await track({ event: "vote", userId: user?.id, sessionId: sid, metadata: { post: post.id, option: parsed.data.option } });
  const { data: votes } = await sb.from("community_votes").select("option_key").eq("post_id", post.id);
  const results: Record<string, number> = {};
  for (const v of votes ?? []) results[v.option_key] = (results[v.option_key] ?? 0) + 1;
  return NextResponse.json({ ok: true, results });
}
