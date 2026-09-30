import { z } from "zod";

/**
 * Printful API v1 response schemas (https://developers.printful.com/docs/).
 * Schemas are permissive (passthrough) but validate the fields we rely on.
 */

const num = z.union([z.number(), z.string()]).nullable().optional();

export const pfEnvelope = <T extends z.ZodTypeAny>(result: T) =>
  z.object({
    code: z.number(),
    result,
    paging: z.object({ total: z.number(), offset: z.number(), limit: z.number() }).optional(),
  });

export const pfCatalogProduct = z
  .object({
    id: z.number(),
    main_category_id: z.number().nullable().optional(),
    type: z.string().nullable().optional(),
    type_name: z.string().nullable().optional(),
    title: z.string(),
    brand: z.string().nullable().optional(),
    model: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    variant_count: z.number().optional().default(0),
    currency: z.string().nullable().optional(),
    is_discontinued: z.boolean().optional().default(false),
    files: z.array(z.object({ id: z.string().optional(), type: z.string(), title: z.string().optional() }).passthrough()).optional().default([]),
    techniques: z.array(z.object({ key: z.string(), display_name: z.string().optional(), is_default: z.boolean().optional() }).passthrough()).optional().default([]),
  })
  .passthrough();
export type PfCatalogProduct = z.infer<typeof pfCatalogProduct>;

export const pfCatalogVariant = z
  .object({
    id: z.number(),
    product_id: z.number(),
    name: z.string(),
    size: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    color_code: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    price: num,
    in_stock: z.boolean().nullable().optional(),
    availability_regions: z.record(z.string(), z.string()).nullable().optional(),
    availability_status: z.array(z.object({ region: z.string(), status: z.string() })).nullable().optional(),
  })
  .passthrough();
export type PfCatalogVariant = z.infer<typeof pfCatalogVariant>;

export const pfProductWithVariants = z.object({
  product: pfCatalogProduct,
  variants: z.array(pfCatalogVariant),
});

export const pfShipment = z
  .object({
    id: z.number(),
    carrier: z.string().nullable().optional(),
    service: z.string().nullable().optional(),
    tracking_number: z.union([z.string(), z.number()]).nullable().optional(),
    tracking_url: z.string().nullable().optional(),
    created: z.number().nullable().optional(),
    ship_date: z.string().nullable().optional(),
    shipped_at: z.number().nullable().optional(),
    reshipment: z.boolean().nullable().optional(),
  })
  .passthrough();

export const pfOrder = z
  .object({
    id: z.number(),
    external_id: z.string().nullable().optional(),
    status: z.string(),
    shipping: z.string().nullable().optional(),
    costs: z
      .object({ currency: z.string().nullable().optional(), subtotal: num, shipping: num, tax: num, vat: num, total: num })
      .passthrough()
      .nullable()
      .optional(),
    shipments: z.array(pfShipment).optional().default([]),
  })
  .passthrough();
export type PfOrder = z.infer<typeof pfOrder>;

export const pfCostEstimate = z
  .object({
    costs: z
      .object({ currency: z.string(), subtotal: num, shipping: num, tax: num, vat: num, total: num })
      .passthrough(),
  })
  .passthrough();

export const pfShippingRate = z
  .object({
    id: z.string(),
    name: z.string(),
    rate: z.union([z.string(), z.number()]),
    currency: z.string(),
    minDeliveryDays: z.number().nullable().optional(),
    maxDeliveryDays: z.number().nullable().optional(),
  })
  .passthrough();

export const pfSyncProductResult = z
  .object({ sync_product: z.object({ id: z.number() }).passthrough().optional(), id: z.number().optional() })
  .passthrough();

export const pfWebhookPayload = z
  .object({
    type: z.string(),
    created: z.number(),
    retries: z.number().optional(),
    store: z.number().optional(),
    data: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();

export const pfErrorBody = z
  .object({
    code: z.number().optional(),
    result: z.unknown().optional(),
    error: z.object({ reason: z.string().optional(), message: z.string().optional() }).optional(),
  })
  .passthrough();

export const pfMockupTask = z
  .object({
    task_key: z.string(),
    status: z.enum(["pending", "completed", "failed"]),
    error: z.string().nullable().optional(),
    mockups: z
      .array(z.object({ placement: z.string(), variant_ids: z.array(z.number()), mockup_url: z.string() }).passthrough())
      .optional(),
  })
  .passthrough();
