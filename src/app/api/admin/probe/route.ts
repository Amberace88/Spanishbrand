import { NextResponse } from "next/server";
import { getStaffSession, hasRole } from "@/lib/auth/rbac";
import { isProviderError } from "@/lib/fulfillment/errors";
import { getProdigiProduct, quote } from "@/lib/fulfillment/prodigi";
import * as printify from "@/lib/fulfillment/printify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Staff-only provider diagnostics (never returns credentials). */
export async function GET(req: Request) {
  const s = await getStaffSession();
  if (!s || !hasRole(s, ["ADMIN"])) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const url = new URL(req.url);
  const what = url.searchParams.get("p");
  const arg = url.searchParams.get("q") ?? "";
  const err = (e: unknown) => (isProviderError(e) ? { status: e.status, message: e.message, endpoint: e.endpoint, payload: JSON.stringify(e.payload ?? null).slice(0, 600) } : { message: e instanceof Error ? e.message : String(e) });
  try {
    if (what === "prodigi-sku") {
      const p = await getProdigiProduct(arg);
      return NextResponse.json({ sku: p.sku, description: p.description, attributes: p.attributes, variants: p.variants.slice(0, 3).map((v) => ({ attributes: v.attributes, sizes: v.printAreaSizes })) });
    }
    if (what === "prodigi-quote") {
      const [sku, attrs] = arg.split("|");
      return NextResponse.json(await quote([{ sku, attributes: Object.fromEntries((attrs ?? "").split(",").filter(Boolean).map((x) => x.split("="))), copies: 1 }], "ES"));
    }
    if (what === "printify-shop") return NextResponse.json({ shop: await printify.shopId() });
    if (what === "printify-blueprints") {
      const all = await printify.listBlueprints();
      const re = new RegExp(arg || ".", "i");
      return NextResponse.json(all.filter((b) => re.test(b.title)).slice(0, 30).map((b) => ({ id: b.id, title: b.title, brand: b.brand })));
    }
    if (what === "printify-providers") {
      const list = await printify.blueprintProviders(arg);
      const out = [];
      for (const p of list.slice(0, 15)) {
        const d = await printify.printProvider(String(p.id)).catch(() => null);
        out.push({ id: p.id, title: p.title, country: d?.location?.country ?? p.location?.country ?? null });
      }
      return NextResponse.json(out);
    }
    return NextResponse.json({ error: "unknown probe" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: err(e) }, { status: 200 });
  }
}
