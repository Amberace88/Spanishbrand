/**
 * FULFILLMENT ROUTER (pure planning step).
 * Groups order items by provider; applies CONTROLLED fallback:
 *   primary unavailable → backup ONLY if backup mapping explicitly approved, else REQUIRES_REVIEW.
 */

export type ProviderHealth = "ONLINE" | "DEGRADED" | "OFFLINE" | "ERROR" | "UNKNOWN";

export interface RoutableMapping {
  providerId: string;
  role: "PRIMARY" | "BACKUP";
  approved: boolean;
  active: boolean;
  providerProductId: string;
  providerVariantId: string | null; // mapping for this item's variant
  variantMappingStatus: "ACTIVE" | "OUT_OF_STOCK" | "DISCONTINUED" | null;
  files: { type: string; url: string }[];
}

export interface ProviderState {
  id: string;
  active: boolean;
  health: ProviderHealth;
  autoRoutingEnabled: boolean;
  supportsOrders: boolean;
  supportedCountries: string[] | null; // null = no restriction known
}

export interface RoutableItem {
  orderItemId: string;
  productId: string;
  variantId: string;
  quantity: number;
  mappings: RoutableMapping[];
}

export interface FulfillmentGroupPlan {
  providerId: string;
  role: "PRIMARY" | "BACKUP";
  items: { orderItemId: string; providerProductId: string; providerVariantId: string; quantity: number; files: { type: string; url: string }[] }[];
}

export interface RoutingPlan {
  groups: FulfillmentGroupPlan[];
  unroutable: { orderItemId: string; reasons: string[] }[];
}

function checkMapping(m: RoutableMapping | undefined, providers: Map<string, ProviderState>, country: string): string[] {
  if (!m) return ["NO_MAPPING"];
  const reasons: string[] = [];
  const p = providers.get(m.providerId);
  if (!p) return [`UNKNOWN_PROVIDER:${m.providerId}`];
  if (!m.active) reasons.push("MAPPING_INACTIVE");
  if (!p.active) reasons.push("PROVIDER_INACTIVE");
  if (!p.supportsOrders) reasons.push("PROVIDER_NO_ORDER_API");
  if (!p.autoRoutingEnabled) reasons.push("AUTO_ROUTING_DISABLED");
  if (p.health === "OFFLINE" || p.health === "ERROR") reasons.push(`PROVIDER_${p.health}`);
  if (!m.providerVariantId) reasons.push("VARIANT_NOT_MAPPED");
  if (m.variantMappingStatus && m.variantMappingStatus !== "ACTIVE") reasons.push(`VARIANT_${m.variantMappingStatus}`);
  if (p.supportedCountries && !p.supportedCountries.includes(country)) reasons.push("DESTINATION_UNSUPPORTED");
  if (m.files.length === 0) reasons.push("MISSING_PRINT_FILE");
  return reasons;
}

export function planFulfillment(items: RoutableItem[], providers: ProviderState[], country: string): RoutingPlan {
  const pmap = new Map(providers.map((p) => [p.id, p]));
  const groups = new Map<string, FulfillmentGroupPlan>();
  const unroutable: RoutingPlan["unroutable"] = [];

  for (const item of items) {
    const primary = item.mappings.find((m) => m.role === "PRIMARY");
    const backup = item.mappings.find((m) => m.role === "BACKUP");
    const primaryIssues = checkMapping(primary, pmap, country);

    let chosen: RoutableMapping | null = null;
    let role: "PRIMARY" | "BACKUP" = "PRIMARY";

    if (primaryIssues.length === 0 && primary) {
      chosen = primary;
    } else if (backup) {
      const backupIssues = checkMapping(backup, pmap, country);
      if (!backup.approved) backupIssues.push("BACKUP_NOT_APPROVED");
      if (backupIssues.length === 0) {
        chosen = backup;
        role = "BACKUP";
      } else {
        unroutable.push({ orderItemId: item.orderItemId, reasons: [...primaryIssues.map((r) => `PRIMARY:${r}`), ...backupIssues.map((r) => `BACKUP:${r}`)] });
        continue;
      }
    } else {
      unroutable.push({ orderItemId: item.orderItemId, reasons: primaryIssues.map((r) => `PRIMARY:${r}`) });
      continue;
    }

    const key = chosen.providerId;
    const g = groups.get(key) ?? { providerId: key, role, items: [] };
    // A group mixing primary+backup routed items is labelled BACKUP for visibility.
    if (role === "BACKUP") g.role = "BACKUP";
    g.items.push({
      orderItemId: item.orderItemId,
      providerProductId: chosen.providerProductId,
      providerVariantId: chosen.providerVariantId!,
      quantity: item.quantity,
      files: chosen.files,
    });
    groups.set(key, g);
  }

  return { groups: [...groups.values()], unroutable };
}
