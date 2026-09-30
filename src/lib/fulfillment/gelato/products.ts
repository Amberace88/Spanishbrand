import "server-only";
import { UnsupportedCapabilityError } from "../errors";

/**
 * Gelato store products can only be created from templates made in the Gelato UI
 * (POST ecommerce/v1/stores/{storeId}/products:create-from-template). Orders do not
 * need store products — they reference productUid + print files directly — so the
 * generic createProduct/updateProduct are marked unsupported.
 */
export async function createProduct(): Promise<{ id: string }> {
  throw new UnsupportedCapabilityError("gelato", "generic product creation (template-only)");
}

export async function updateProduct(): Promise<{ id: string }> {
  throw new UnsupportedCapabilityError("gelato", "generic product update (template-only)");
}
