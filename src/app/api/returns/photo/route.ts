import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/supabase/admin";
import { RETURNS_BUCKET, throttle } from "@/lib/returns/service";
import { clientIp } from "../_ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const MAX_BYTES = 8 * 1024 * 1024;

function sniff(b: Buffer) {
  if (b[0] === 0xff && b[1] === 0xd8) return "jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP") return "webp";
  if (b.slice(4, 12).toString().includes("ftyphei") || b.slice(4, 12).toString().includes("ftypmif")) return "heic";
  return null;
}

/** Evidence photo upload → private bucket (pending/), normalised to JPEG ≤2000px, EXIF/GPS stripped. */
export async function POST(req: Request) {
  if (!throttle(`photo:${clientIp(req)}`, 40, 60 * 60_000)) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES + 100_000) return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) return NextResponse.json({ error: "TYPE" }, { status: 415 });
  let out: Buffer;
  try {
    // rotate() applies EXIF orientation; output has no metadata (location etc. removed)
    out = await sharp(buf, { limitInputPixels: 60_000_000 }).rotate().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  } catch {
    return NextResponse.json({ error: kind === "heic" ? "HEIC" : "TYPE" }, { status: 415 });
  }
  const path = `pending/${randomUUID()}.jpg`;
  const { error } = await db().storage.from(RETURNS_BUCKET).upload(path, out, { contentType: "image/jpeg", upsert: false });
  if (error) return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  return NextResponse.json({ path });
}
