import { z } from "zod";

/** Gelato API schemas (https://dashboard.gelato.com/docs/). Permissive, validating fields we use. */

export const glCatalogList = z.union([
  z.array(z.object({ catalogUid: z.string(), title: z.string() }).passthrough()),
  z.object({ data: z.array(z.object({ catalogUid: z.string(), title: z.string() }).passthrough()) }).passthrough(),
]);

export const glCatalog = z
  .object({
    catalogUid: z.string(),
    title: z.string(),
    productAttributes: z
      .array(
        z
          .object({
            productAttributeUid: z.string(),
            title: z.string(),
            values: z.array(z.object({ productAttributeValueUid: z.string(), title: z.string() }).passthrough()).optional(),
          })
          .passthrough(),
      )
      .optional()
      .default([]),
  })
  .passthrough();

export const glProduct = z
  .object({
    productUid: z.string(),
    attributes: z.record(z.string(), z.string()).optional().default({}),
    supportedCountries: z.array(z.string()).optional(),
    notSupportedCountries: z.array(z.string()).optional(),
    isStockable: z.boolean().optional(),
    isPrintable: z.boolean().optional(),
  })
  .passthrough();
export type GlProduct = z.infer<typeof glProduct>;

export const glProductSearch = z
  .object({ products: z.array(glProduct), hits: z.unknown().optional() })
  .passthrough();

export const glPrices = z.array(
  z.object({ productUid: z.string(), country: z.string().optional(), quantity: z.number(), price: z.number(), currency: z.string() }).passthrough(),
);

export const glStock = z
  .object({
    productsAvailability: z.array(
      z
        .object({
          productUid: z.string(),
          availability: z.array(z.object({ stockRegionUid: z.string(), status: z.string() }).passthrough()),
        })
        .passthrough(),
    ),
  })
  .passthrough();

const glPackage = z
  .object({ id: z.string().optional(), trackingCode: z.string().nullable().optional(), trackingUrl: z.string().nullable().optional() })
  .passthrough();

export const glOrder = z
  .object({
    id: z.string(),
    orderType: z.string().optional(),
    orderReferenceId: z.string().nullable().optional(),
    fulfillmentStatus: z.string(),
    financialStatus: z.string().optional(),
    currency: z.string().nullable().optional(),
    shipment: z
      .object({
        id: z.string().optional(),
        shipmentMethodName: z.string().nullable().optional(),
        shipmentMethodUid: z.string().nullable().optional(),
        minDeliveryDate: z.string().nullable().optional(),
        maxDeliveryDate: z.string().nullable().optional(),
        packages: z.array(glPackage).optional().default([]),
      })
      .passthrough()
      .nullable()
      .optional(),
    receipts: z.array(z.object({ totalInclVat: z.number().optional(), currency: z.string().optional() }).passthrough()).optional(),
  })
  .passthrough();
export type GlOrder = z.infer<typeof glOrder>;

export const glQuote = z
  .object({
    orderReferenceId: z.string().optional(),
    quotes: z.array(
      z
        .object({
          id: z.string().optional(),
          fulfillmentCountry: z.string().optional(),
          shipmentMethods: z
            .array(
              z
                .object({
                  name: z.string(),
                  shipmentMethodUid: z.string(),
                  price: z.number(),
                  currency: z.string(),
                  minDeliveryDays: z.number().nullable().optional(),
                  maxDeliveryDays: z.number().nullable().optional(),
                  type: z.string().optional(),
                })
                .passthrough(),
            )
            .default([]),
          products: z
            .array(z.object({ itemReferenceId: z.string(), productUid: z.string(), quantity: z.number(), price: z.number(), currency: z.string() }).passthrough())
            .default([]),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export const glWebhook = z
  .object({
    id: z.string(),
    event: z.string(),
    orderId: z.string().optional(),
    orderReferenceId: z.string().nullable().optional(),
    fulfillmentStatus: z.string().optional(),
    status: z.string().optional(),
    comment: z.string().nullable().optional(),
    trackingCode: z.string().nullable().optional(),
    trackingUrl: z.string().nullable().optional(),
    productAvailability: z
      .array(z.object({ productUid: z.string(), availability: z.array(z.object({ stockRegionUid: z.string(), status: z.string() }).passthrough()) }).passthrough())
      .optional(),
  })
  .passthrough();

export const glErrorBody = z.object({ message: z.string().optional(), code: z.string().optional() }).passthrough();
