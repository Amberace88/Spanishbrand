import "server-only";
import { isConfigured } from "@/lib/env";
import type { FulfillmentProvider, ProviderCapabilities, WebhookRequest } from "../types";
import * as catalog from "./catalog";
import * as products from "./products";
import * as orders from "./orders";
import * as shipments from "./shipments";
import * as webhooks from "./webhooks";
import { gelatoHealth } from "./health";

/** Only capabilities confirmed in official Gelato docs are enabled. */
export const GELATO_CAPABILITIES: ProviderCapabilities = {
  catalog_api: true,
  product_api: true,
  variant_api: true,
  order_api: true,
  shipping_api: true,
  tracking_api: true,
  webhook_api: true,
  webhook_registration_api: false,
  webhook_signature: false,
  stock_api: true,
  mockup_api: false,
  product_creation_api: false, // template-only; generic creation unsupported
  cost_estimate_api: true,
  cancel_api: true,
};

export class GelatoProvider implements FulfillmentProvider {
  readonly id = "gelato";
  readonly name = "Gelato";
  readonly capabilities = GELATO_CAPABILITIES;

  isConfigured() {
    return isConfigured.gelato();
  }
  async getCatalogProducts() {
    return catalog.listCatalogs();
  }
  async getProduct(catalogUid: string) {
    return catalog.getCatalog(catalogUid);
  }
  getProductVariants(catalogUid: string) {
    return catalog.searchCatalogProducts(catalogUid);
  }
  async getProductAvailability(catalogUid: string) {
    const variants = await catalog.searchCatalogProducts(catalogUid, 250);
    return { productId: catalogUid, variants: await catalog.getStockAvailability(variants.map((v) => v.externalId)) };
  }
  createProduct = products.createProduct;
  updateProduct = products.updateProduct;
  createOrder = orders.createOrder;
  confirmOrder = orders.confirmOrder;
  getOrder = orders.getOrder;
  getOrderByExternalId = orders.getOrderByExternalId;
  cancelOrder = orders.cancelOrder;
  getShipment = shipments.getShipments;
  getTracking = shipments.getShipments;
  registerWebhook = webhooks.registerWebhook;
  async handleWebhook(req: WebhookRequest) {
    return webhooks.parseGelatoWebhook(req);
  }
  calculateCost = orders.estimateCosts;
  calculateShipping = orders.shippingRates;
  healthCheck = gelatoHealth;
}

export { getUnitPrice } from "./catalog";
