import { NextResponse } from "next/server";
import { z } from "zod";
import { createReturn, ReturnError, throttle } from "@/lib/returns/service";
import { clientIp } from "./_ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

const reason = z.enum(["PRINT_DEFECT", "DAMAGED", "WRONG_ITEM", "MISSING_ITEM", "SIZE", "CHANGED_MIND", "NOT_AS_EXPECTED"]);
const schema = z.object({
  orderNumber: z.coerce.number().int().min(1),
  email: z.string().email().max(200),
  type: z.enum(["ISSUE", "WITHDRAWAL"]),
  items: z.array(z.object({ id: z.string().uuid(), quantity: z.number().int().min(1).max(99), reason, details: z.string().max(1000).optional() })).min(1).max(50),
  resolution: z.enum(["REFUND", "REPRINT", "EXCHANGE", "STORE_CREDIT"]),
  exchangeNote: z.string().max(300).optional(),
  description: z.string().trim().min(10).max(4000),
  contact: z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().max(40).optional() }),
  address: z.record(z.string(), z.string().max(200)).optional(),
  photos: z.array(z.object({ path: z.string().max(120), kind: z.enum(["product", "defect", "label", "package", "other"]) })).max(8),
  declarations: z.array(z.string().max(40)).max(12),
  website: z.string().max(0).optional(), // honeypot
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!throttle(`return:${ip}`, 6, 60 * 60_000)) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "INVALID", issues: parsed.error.issues.slice(0, 5).map((i) => i.path.join(".")) }, { status: 400 });
  try {
    const res = await createReturn({ ...parsed.data, ip, userAgent: req.headers.get("user-agent") });
    return NextResponse.json(res);
  } catch (e) {
    const code = e instanceof ReturnError ? e.code : "SAVE_FAILED";
    return NextResponse.json({ error: code }, { status: code === "SAVE_FAILED" ? 500 : 422 });
  }
}
