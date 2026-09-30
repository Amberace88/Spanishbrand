import { describe, expect, it } from "vitest";
import { planFulfillment, type ProviderState, type RoutableItem, type RoutableMapping } from "@/lib/orders/router";

const providers: ProviderState[] = [
  { id: "printful", active: true, health: "ONLINE", autoRoutingEnabled: true, supportsOrders: true, supportedCountries: null },
  { id: "gelato", active: true, health: "ONLINE", autoRoutingEnabled: true, supportsOrders: true, supportedCountries: null },
];
const files = [{ type: "front", url: "https://x/f.png" }];
const pf = (o: Partial<RoutableMapping> = {}): RoutableMapping => ({ providerId: "printful", role: "PRIMARY", approved: true, active: true, providerProductId: "71", providerVariantId: "4012", variantMappingStatus: "ACTIVE", files, ...o });
const gl = (o: Partial<RoutableMapping> = {}): RoutableMapping => ({ providerId: "gelato", role: "BACKUP", approved: true, active: true, providerProductId: "t-shirts", providerVariantId: "apparel_x", variantMappingStatus: "ACTIVE", files, ...o });
const item = (id: string, mappings: RoutableMapping[]): RoutableItem => ({ orderItemId: id, productId: `p-${id}`, variantId: `v-${id}`, quantity: 1, mappings });

describe("fulfillment router", () => {
  it("routes to primary when healthy", () => {
    const plan = planFulfillment([item("a", [pf(), gl()])], providers, "ES");
    expect(plan.unroutable).toHaveLength(0);
    expect(plan.groups).toEqual([expect.objectContaining({ providerId: "printful", role: "PRIMARY" })]);
  });
  it("supports multi-provider orders (T-shirt → Printful, poster → Gelato)", () => {
    const plan = planFulfillment([item("tee", [pf()]), item("poster", [gl({ role: "PRIMARY" })])], providers, "ES");
    expect(plan.groups.map((g) => g.providerId).sort()).toEqual(["gelato", "printful"]);
  });
  it("falls back to an APPROVED backup when primary variant is unavailable", () => {
    const plan = planFulfillment([item("a", [pf({ variantMappingStatus: "OUT_OF_STOCK" }), gl()])], providers, "ES");
    expect(plan.groups[0]).toMatchObject({ providerId: "gelato", role: "BACKUP" });
  });
  it("never falls back to an unapproved backup → requires review", () => {
    const plan = planFulfillment([item("a", [pf({ variantMappingStatus: "DISCONTINUED" }), gl({ approved: false })])], providers, "ES");
    expect(plan.groups).toHaveLength(0);
    expect(plan.unroutable[0].reasons).toEqual(expect.arrayContaining(["PRIMARY:VARIANT_DISCONTINUED", "BACKUP:BACKUP_NOT_APPROVED"]));
  });
  it("treats offline providers as unroutable", () => {
    const plan = planFulfillment([item("a", [pf()])], [{ ...providers[0], health: "OFFLINE" }, providers[1]], "ES");
    expect(plan.unroutable[0].reasons).toContain("PRIMARY:PROVIDER_OFFLINE");
  });
  it("blocks missing print files and unsupported destinations", () => {
    const plan = planFulfillment([item("a", [pf({ files: [] })])], [{ ...providers[0], supportedCountries: ["DE"] }], "ES");
    expect(plan.unroutable[0].reasons).toEqual(expect.arrayContaining(["PRIMARY:MISSING_PRINT_FILE", "PRIMARY:DESTINATION_UNSUPPORTED"]));
  });
});
