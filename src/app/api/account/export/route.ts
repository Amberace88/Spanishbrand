import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/** GDPR data export for the signed-in customer (own data only). */
export async function GET() {
  const user = await getSessionUser();
  const sb = dbOrNull();
  if (!user || !sb) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: customer } = await sb.from("customers").select("*").eq("brand_id", env.brandId()).eq("user_id", user.id).maybeSingle();
  const { data: orders } = customer
    ? await sb.from("orders").select("order_number, status, total, currency, created_at, shipping_address, order_items(product_name, variant_name, quantity, total)").eq("customer_id", customer.id)
    : { data: [] };
  const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  await sb.from("gdpr_requests").insert({ brand_id: env.brandId(), customer_id: customer?.id ?? null, user_id: user.id, email: user.email ?? "", type: "EXPORT", status: "COMPLETED", completed_at: new Date().toISOString() });
  const body = JSON.stringify({ exported_at: new Date().toISOString(), profile, customer, orders }, null, 2);
  return new NextResponse(body, { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="mis-datos.json"` } });
}
