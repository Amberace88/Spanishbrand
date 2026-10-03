import { NextResponse } from "next/server";
import sharp from "sharp";
import { getStaffSession, hasRole } from "@/lib/auth/rbac";
import { uploadObject as uploadOnce } from "@/lib/personalization/storage";
import { audit } from "@/lib/audit";
import { revalidateTag } from "next/cache";
import { SITE_IMAGES_TAG } from "@/lib/site-images";

export const runtime = "nodejs";
export const maxDuration = 60;

// storage answers 502/504 under load (catalog runner uploads in parallel): retry a few times
async function uploadObject(path: string, data: Buffer, type: string) {
  let last: unknown;
  for (let i = 0; i < 4; i++) {
    try {
      return await uploadOnce(path, data, type);
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw last;
}
export const dynamic = "force-dynamic";

/**
 * Stores a site image (homepage tiles, campaign photos) in storage at site/<name>.webp.
 * Body: { name, dataUrl } — a JPEG/PNG/WebP data URL, ≤ 12 MB. Admins only.
 */
export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "FAILED" }, { status: 500 });
  }
}

async function handle(req: Request) {
  // the import page receives images from an AI-image tab via postMessage and forwards them here (same origin)
  const s = await getStaffSession();
  if (!s || !hasRole(s, ["ADMIN"])) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { name?: string; dataUrl?: string; kind?: "photo" | "art" } | null;
  const name = (body?.name ?? "").trim();
  if (!/^[a-z0-9-]{2,48}$/.test(name)) return NextResponse.json({ error: "BAD_NAME" }, { status: 400 });
  const m = (body?.dataUrl ?? "").match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return NextResponse.json({ error: "BAD_IMAGE" }, { status: 400 });
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 12 * 1024 * 1024) return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });
  const meta = await sharp(buf).metadata().catch(() => null);
  if (!meta?.width) return NextResponse.json({ error: "BAD_IMAGE" }, { status: 400 });
  if (body?.kind === "art") {
    // brand illustration generated on a green screen → transparent, despilled, trimmed print art (site-art/<name>.png)
    const { data, info } = await sharp(buf).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const m = Math.max(r, b), gr = g - m;
      const a = Math.max(0, Math.min(1, 1 - (gr - 35) / 75));
      data[i + 3] = Math.round(data[i + 3] * a);
      if (gr > 0) data[i + 1] = m; // despill
      if (data[i + 3] < 8) data[i + 3] = 0;
    }
    const png = await sharp(data, { raw: info }).trim({ threshold: 1 }).resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: false, kernel: "lanczos3" }).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
    const url = await uploadObject(`site-art/${name}.png`, png.data, "image/png");
    const aspect = +(png.info.height / png.info.width).toFixed(4);
    await audit({ action: "site.image", actorId: s.userId, actorEmail: s.email, entityType: "site-art", entityId: name, after: { aspect } }).catch(() => null);
    return NextResponse.json({ ok: true, url, aspect, width: png.info.width, height: png.info.height });
  }
  const out = await sharp(buf).rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
  const url = await uploadObject(`site/${name}.webp`, out, "image/webp");
  revalidateTag(SITE_IMAGES_TAG, { expire: 0 }); // the cached site/ listing carries the ?v= cache-buster
  await audit({ action: "site.image", actorId: s.userId, actorEmail: s.email, entityType: "site", entityId: name, after: { bytes: out.length, width: meta.width, height: meta.height } }).catch(() => null);
  return NextResponse.json({ ok: true, url, width: meta.width, height: meta.height });
}
