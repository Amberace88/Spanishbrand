import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/** Supabase magic-link / OAuth code exchange; links the auth user to their customer record. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/account";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/account";
  const sb = await supabaseServer();
  if (code && sb) {
    const { data } = await sb.auth.exchangeCodeForSession(code);
    const user = data.user;
    const admin = dbOrNull();
    if (user?.email && admin) {
      await admin
        .from("customers")
        .upsert({ brand_id: env.brandId(), email: user.email.toLowerCase(), user_id: user.id }, { onConflict: "brand_id,email", ignoreDuplicates: false });
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
