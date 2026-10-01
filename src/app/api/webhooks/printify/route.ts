import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/env";
import { handleProviderWebhook } from "@/lib/orders/provider-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isConfigured.db()) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const out = await handleProviderWebhook("printify", { url: new URL(req.url), headers: req.headers, rawBody: await req.text() });
  return NextResponse.json(out.body, { status: out.status });
}
