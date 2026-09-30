import "server-only";
import type { FulfillmentProvider, ProviderId } from "./types";
import { PrintfulProvider } from "./printful";
import { GelatoProvider } from "./gelato";

/**
 * The ONLY place that knows concrete provider classes.
 * Add a provider: implement FulfillmentProvider, register it here, seed its capabilities.
 * InternalWarehouseProvider is intentionally NOT implemented (future, separate type).
 */
const registry = new Map<string, () => FulfillmentProvider>([
  ["printful", () => new PrintfulProvider()],
  ["gelato", () => new GelatoProvider()],
]);

const instances = new Map<string, FulfillmentProvider>();

export const fulfillmentProviderFactory = {
  getProvider(providerId: ProviderId): FulfillmentProvider {
    const existing = instances.get(providerId);
    if (existing) return existing;
    const make = registry.get(providerId);
    if (!make) throw new Error(`Unknown fulfillment provider: ${providerId}`);
    const p = make();
    instances.set(providerId, p);
    return p;
  },
  has(providerId: string) {
    return registry.has(providerId);
  },
  list(): FulfillmentProvider[] {
    return [...registry.keys()].map((id) => this.getProvider(id));
  },
};
