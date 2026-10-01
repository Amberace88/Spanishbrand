import { NextResponse } from "next/server";
import { z } from "zod";
import { lookupOrder, throttle } from "@/lib/returns/service";
import { clientIp } from "../_ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ orderNumber: z.coerce.number().int().min(1).max(99_999_999), email: z.string().email().max(200) });

/** Find an order by number + email (both must match) and return what can be requested for each line. */
export async function POST(req: Request) {
  if (!throttle(`lookup:${clientIp(req)}`, 12, 10 * 60_000)) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  const res = await lookupOrder(parsed.data.orderNumber, parsed.data.email).catch(() => null);
  if (!res) return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
  return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
}
