import "server-only";
import { pf } from "./client";
import { pfEnvelope, pfSyncProductResult } from "./types";
import type { CreateStoreProductInput } from "../types";

/** POST /store/products — create a sync product (optional; orders can use catalog variant_id + files). */
export async function createSyncProduct(input: CreateStoreProductInput) {
  const res = await pf("/store/products", pfEnvelope(pfSyncProductResult), {
    method: "POST",
    body: {
      sync_product: { name: input.title, external_id: input.externalId },
      sync_variants: input.variants.map((v) => ({
        variant_id: Number(v.providerVariantId),
        retail_price: v.retailPrice.toFixed(2),
        files: v.files.map((f) => ({ type: f.type, url: f.url })),
      })),
    },
  });
  const id = res.result.sync_product?.id ?? res.result.id;
  return { id: String(id) };
}

/** PUT /store/products/{id} */
export async function updateSyncProduct(id: string, input: Partial<CreateStoreProductInput>) {
  await pf(`/store/products/${encodeURIComponent(id)}`, pfEnvelope(pfSyncProductResult), {
    method: "PUT",
    body: { sync_product: input.title ? { name: input.title } : undefined },
  });
  return { id };
}
