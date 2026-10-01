import { NextResponse } from "next/server";
import { getStaffSession, hasRole } from "@/lib/auth/rbac";
import { isProviderError } from "@/lib/fulfillment/errors";
import { getProdigiProduct, quote } from "@/lib/fulfillment/prodigi";
import * as printify from "@/lib/fulfillment/printify";
import { z } from "zod";
import { getCatalogProduct, listCatalogProducts } from "@/lib/fulfillment/printful/catalog";

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
    if (what === "printful-products") {
      const re = new RegExp(arg || ".", "i");
      const all = (await listCatalogProducts()).filter((p) => !p.discontinued && re.test(p.title)).slice(0, 12);
      const withEu = await Promise.all(
        all.map(async (p) => {
          const d = await getCatalogProduct(p.externalId).catch(() => null);
          const eu = d ? d.variants.filter((v) => /in_stock|stocked_on_demand|active/i.test(v.availability?.EU ?? v.availability?.EU_LV ?? v.availability?.EU_ES ?? "")).length : null;
          return { id: p.externalId, title: p.title, type: p.type, variants: d?.variants.length ?? null, euVariants: eu, regions: d ? [...new Set(d.variants.flatMap((v) => Object.keys(v.availability ?? {})))] : [] };
        }),
      );
      return NextResponse.json(withEu);
    }
    if (what === "printify-eu") {
      const idx = await printify.euProviderIndex(["ES", "PT", "FR", "DE", "IT", "NL", "BE", "LU", "AT", "IE", "PL", "CZ", "SK", "SI", "HU", "RO", "BG", "HR", "GR", "LV", "LT", "EE", "SE", "DK", "FI"]);
      const re = arg ? new RegExp(arg, "i") : null;
      return NextResponse.json(idx.map((p) => ({ id: p.id, title: p.title, country: p.country, count: p.blueprints.length, matches: re ? p.blueprints.filter((b) => re.test(b.title)).map((b) => `${b.id} ${b.title}`).slice(0, 15) : undefined })));
    }
    if (what === "printify-webhooks") {
      const sid = await printify.shopId();
      const hooks = await printify.pfy(`/shops/${sid}/webhooks.json`, z.array(z.object({ id: z.string(), topic: z.string(), url: z.string() }).passthrough()));
      const secret = process.env.PRINTIFY_WEBHOOK_SECRET ?? "";
      // never echo the token: only whether it matches the configured secret
      return NextResponse.json(
        hooks.map((h) => {
          const u = new URL(h.url);
          const token = u.searchParams.get("token") ?? "";
          return { topic: h.topic, endpoint: `${u.origin}${u.pathname}`, tokenMatches: Boolean(secret) && token === secret };
        }),
      );
    }
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
