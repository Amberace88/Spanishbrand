import { NextResponse } from "next/server";
import { dbOrNull } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID = /^[0-9a-f-]{36}$/i;

/** One-click unsubscribe: ?t=<newsletter token> or ?c=<customer token>. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const t = url.searchParams.get("t");
  const c = url.searchParams.get("c");
  const sb = dbOrNull();
  if (sb && t && UUID.test(t)) await sb.from("newsletter_subscribers").update({ unsubscribed_at: new Date().toISOString() }).eq("unsubscribe_token", t);
  if (sb && c && UUID.test(c)) await sb.from("customers").update({ marketing_consent: false, marketing_consent_at: null }).eq("unsubscribe_token", c);
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Baja confirmada</title><body style="font-family:system-ui;background:#F4EFE6;color:#0B0B0C;display:grid;place-items:center;min-height:100vh;margin:0"><div style="text-align:center;padding:24px"><h1 style="text-transform:uppercase;letter-spacing:.04em">Baja confirmada</h1><p>No recibirás más comunicaciones comerciales.</p><a href="/" style="color:#B3122E">Volver a la tienda</a></div>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
