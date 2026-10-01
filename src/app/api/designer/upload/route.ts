import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { isConfigured } from "@/lib/env";
import { uploadObject } from "@/lib/personalization/storage";
import { removeSolidBackground } from "@/lib/personalization/background";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 4000;
const PER_SESSION_LIMIT = 20;
const recent = new Map<string, number[]>(); // best-effort per instance

function sniff(buf: Buffer): "png" | "jpeg" | "webp" | null {
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

/**
 * Customer artwork upload for the designer. Re-encodes to PNG (strips EXIF/GPS metadata,
 * applies orientation, caps size). Uploads are always reviewed by staff before printing.
 */
export async function POST(req: Request) {
  if (!isConfigured.db()) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  const c = await cookies();
  const sid = c.get("sid")?.value;
  if (!sid) return NextResponse.json({ error: "NO_SESSION" }, { status: 400 });
  const now = Date.now();
  const list = (recent.get(sid) ?? []).filter((t) => now - t < 3600_000);
  if (list.length >= PER_SESSION_LIMIT) return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES + 64 * 1024) return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });
  if (form?.get("rights") !== "yes") return NextResponse.json({ error: "RIGHTS_REQUIRED" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniff(buf)) return NextResponse.json({ error: "BAD_TYPE" }, { status: 415 });

  try {
    const img = sharp(buf, { limitInputPixels: 60_000_000 }).rotate();
    const meta = await img.metadata();
    if (!meta.width || !meta.height) return NextResponse.json({ error: "BAD_IMAGE" }, { status: 415 });
    const out = await img.resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
    const id = randomUUID();
    const path = `uploads/${id}.png`;
    const url = await uploadObject(path, out.data, "image/png");
    recent.set(sid, [...list, now]);
    const { width, height } = out.info;
    // Solid backgrounds (logo on black, scan on white…) → also offer a transparent version.
    let nobg: { path: string; url: string; background: string } | null = null;
    try {
      const r = await removeSolidBackground(out.data, { maxSide: 2400 });
      if (r.detected) {
        const npath = `uploads/${id}-nobg.png`;
        const png = r.width === width ? r.png : await sharp(r.png).resize(width, height).png().toBuffer();
        nobg = { path: npath, url: await uploadObject(npath, png, "image/png"), background: r.background };
      }
    } catch (e) {
      log.warn("API", "background removal failed", { msg: e instanceof Error ? e.message : String(e) });
    }
    return NextResponse.json({ path, url, width, height, aspect: height / width, lowRes: Math.min(width, height) < 1200, nobg });
  } catch (e) {
    log.warn("API", "designer upload failed", { msg: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "BAD_IMAGE" }, { status: 415 });
  }
}
