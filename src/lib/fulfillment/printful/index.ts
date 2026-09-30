import "server-only";
import { isConfigured } from "@/lib/env";
import type { FulfillmentProvider, ProviderCapabilities, WebhookRequest } from "../types";
import * as catalog from "./catalog";
import * as products from "./products";
import * as orders from "./orders";
import * as shipments from "./shipments";
import * as webhooks from "./webhooks";
import { printfulHealth } from "./health";

/** Capabilities confirmed from official Printful v1 docs. Mirrors provider_capabilities seed. */
export const PRINTFUL_CAPABILITIES: ProviderCapabilities = {
  catalog_api: true,
  product_api: true,
  variant_api: true,
  order_api: true,
  shipping_api: true,
  tracking_api: true,
  webhook_api: true,
  webhook_registration_api: true,
  webhook_signature: false,
  stock_api: true,
  mockup_api: true,
  product_creation_api: true,
  cost_estimate_api: true,
  cancel_api: true,
};

export class PrintfulProvider implements FulfillmentProvider {
  readonly id = "printful";
  readonly name = "Printful";
  readonly capabilities = PRINTFUL_CAPABILITIES;
  readonly externalIdLookup = true;

  isConfigured() {
    return isConfigured.printful();
  }
  getCatalogProducts(opts?: { categoryId?: string }) {
    return catalog.listCatalogProducts(opts?.categoryId);
  }
  async getProduct(id: string) {
    return (await catalog.getCatalogProduct(id)).product;
  }
  getProductVariants(id: string) {
    return catalog.getCatalogVariants(id);
  }
  getProductAvailability(id: string) {
    return catalog.getAvailability(id);
  }
  createProduct = products.createSyncProduct;
  updateProduct = products.updateSyncProduct;
  createOrder = orders.createOrder;
  confirmOrder = orders.confirmOrder;
  getOrder = orders.getOrder;
  getOrderByExternalId = orders.getOrderByExternalId;
  cancelOrder = orders.cancelOrder;
  getShipment = shipments.getShipments;
  getTracking = shipments.getShipments;
  registerWebhook = webhooks.registerWebhook;
  async handleWebhook(req: WebhookRequest) {
    return webhooks.parsePrintfulWebhook(req);
  }
  calculateCost = orders.estimateCosts;
  calculateShipping = shipments.shippingRates;
  healthCheck = printfulHealth;
}
