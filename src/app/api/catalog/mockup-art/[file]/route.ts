import { designBySlug } from "@/lib/catalog/designs";
import { renderDesign, type RenderMode } from "@/lib/catalog/render";
import { MOCKUP_ART_MAX, verifyMockupArt, type MockupArtParams } from "@/lib/catalog/mockup-art";
import { BLUEPRINTS } from "@/lib/catalog/blueprints";
import { effectiveLayers } from "@/lib/catalog/print-safety";
import type { BlueprintKey } from "@/lib/catalog/designs";

export const runtime = "nodejs";
export const maxDuration = 26;

const MODES: RenderMode[] = ["print", "mug", "poster", "sticker", "fill", "emb"];

/**
 * Signed, low-resolution design render for provider mockup generators (see lib/catalog/mockup-art.ts).
 * GET /api/catalog/mockup-art/<sig>.png?d=<design>&s=front|back&m=<mode>&w=&h=&v=<print hash>[&b=<blueprint>]
 * With `b`, the garment's safe zone is applied (same layers as the print file).
 */
export async function GET(req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const sig = file.replace(/\.png$/, "");
  const q = new URL(req.url).searchParams;
  const p: MockupArtParams = { d: q.get("d") ?? "", s: q.get("s") === "back" ? "back" : "front", m: (q.get("m") ?? "") as RenderMode, w: Number(q.get("w")), h: Number(q.get("h")), v: q.get("v") ?? "", ...(q.get("b") ? { b: q.get("b")! } : {}) };
  if (p.b && !(p.b in BLUEPRINTS)) return new Response("bad request", { status: 400 });
  if (!MODES.includes(p.m) || !Number.isInteger(p.w) || !Number.isInteger(p.h) || p.w < 1 || p.h < 1 || Math.max(p.w, p.h) > MOCKUP_ART_MAX) return new Response("bad request", { status: 400 });
  if (!verifyMockupArt(p, sig)) return new Response("forbidden", { status: 403 });
  const design = designBySlug(p.d);
  const raw = p.s === "back" ? design?.back : design?.layers;
  if (!design || !raw?.length) return new Response("not found", { status: 404 });
  const layers = p.b ? effectiveLayers(design, p.b as BlueprintKey, p.s) : raw;
  const png = await renderDesign({ ...design, layers }, { width: p.w, height: p.h, mode: p.m });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // the URL carries the print's content hash: safe to cache forever at the CDN and in providers' fetch caches
      "Cache-Control": "public, max-age=31536000, immutable",
      "Netlify-CDN-Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
