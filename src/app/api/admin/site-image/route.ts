import { NextResponse } from "next/server";
import sharp from "sharp";
import { getStaffSession, hasRole } from "@/lib/auth/rbac";
import { uploadObject } from "@/lib/personalization/storage";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stores a site image (homepage tiles, campaign photos) in storage at site/<name>.webp.
 * Body: { name, dataUrl } — a JPEG/PNG/WebP data URL, ≤ 12 MB. Admins only.
 */
export async function POST(req: Request) {
  // the import page receives images from an AI-image tab via postMessage and forwards them here (same origin)
  const s = await getStaffSession();
  if (!s || !hasRole(s, ["ADMIN"])) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { name?: string; dataUrl?: string } | null;
  const name = (body?.name ?? "").trim();
  if (!/^[a-z0-9-]{2,48}$/.test(name)) return NextResponse.json({ error: "BAD_NAME" }, { status: 400 });
  const m = (body?.dataUrl ?? "").match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return NextResponse.json({ error: "BAD_IMAGE" }, { status: 400 });
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 12 * 1024 * 1024) return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });
  const meta = await sharp(buf).metadata().catch(() => null);
  if (!meta?.width) return NextResponse.json({ error: "BAD_IMAGE" }, { status: 400 });
  const out = await sharp(buf).rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
  const url = await uploadObject(`site/${name}.webp`, out, "image/webp");
  await audit({ action: "site.image", actorId: s.userId, actorEmail: s.email, entityType: "site", entityId: name, after: { bytes: out.length, width: meta.width, height: meta.height } }).catch(() => null);
  return NextResponse.json({ ok: true, url, width: meta.width, height: meta.height });
}
