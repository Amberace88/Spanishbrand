import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = walk(path.resolve(__dirname, "../src")).filter((f) => /\.(ts|tsx)$/.test(f));

describe("security invariants", () => {
  it("client components never import server secrets or the service-role client", () => {
    const offenders = files.filter((f) => {
      const src = readFileSync(f, "utf8");
      return /^["']use client["']/m.test(src) && /(lib\/env"|supabase\/admin|SERVICE_ROLE|API_KEY)/.test(src);
    });
    expect(offenders).toEqual([]);
  });
  it("no provider-specific branching outside the fulfillment layer", () => {
    const offenders = files.filter((f) => !f.includes(`${path.sep}fulfillment${path.sep}`) && /provider(Id)?\s*===\s*["'](printful|gelato)["']/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
  it("server-side modules with secrets are guarded by server-only", () => {
    const guarded = ["lib/env.ts", "lib/supabase/admin.ts", "lib/payments/stripe.ts", "lib/fulfillment/printful/client.ts", "lib/fulfillment/gelato/client.ts", "lib/fulfillment/printify/index.ts", "lib/fulfillment/prodigi/index.ts"];
    for (const g of guarded) expect(readFileSync(path.resolve(__dirname, "../src", g), "utf8")).toContain('import "server-only"');
  });
});
