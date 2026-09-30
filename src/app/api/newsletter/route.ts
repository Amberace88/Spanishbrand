import { NextResponse } from "next/server";
import { z } from "zod";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { getBrand } from "@/lib/brand";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().email().max(200), consent: z.literal(true), source: z.string().max(50).optional() });
const CONSENT_TEXT = "Acepto recibir comunicaciones comerciales y la política de privacidad.";

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const sb = dbOrNull();
  if (!sb) return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  const email = parsed.data.email.trim().toLowerCase();
  const { data, error } = await sb
    .from("newsletter_subscribers")
    .upsert({ brand_id: env.brandId(), email, consent_text: CONSENT_TEXT, consent_at: new Date().toISOString(), source: parsed.data.source ?? "site", unsubscribed_at: null }, { onConflict: "brand_id,email" })
    .select("unsubscribe_token")
    .single();
  if (error) return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  const brand = await getBrand();
  await sendEmail({
    template: "WELCOME",
    to: email,
    dedupeKey: `WELCOME:${email}`,
    context: { brandName: brand.name, unsubscribeUrl: `${env.siteUrl()}/api/unsubscribe?t=${data.unsubscribe_token}` },
  });
  return NextResponse.json({ ok: true });
}
