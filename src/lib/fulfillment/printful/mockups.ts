import "server-only";
import { z } from "zod";
import { pf } from "./client";
import { pfEnvelope, pfMockupTask } from "./types";

export interface MockupFile {
  placement: string;
  imageUrl: string;
  /** Explicit position inside the print area (px of the printfile). */
  position?: { area_width: number; area_height: number; width: number; height: number; top: number; left: number };
}

/**
 * POST /mockup-generator/create-task/{product_id} then poll GET /mockup-generator/task?task_key=.
 * Mockup URLs are temporary — callers must copy results to Supabase Storage.
 */
export async function createMockupTask(input: { productId: string; variantIds: string[]; files: MockupFile[]; format?: "jpg" | "png"; optionGroups?: string[] }) {
  const res = await pf(
    `/mockup-generator/create-task/${encodeURIComponent(input.productId)}`,
    pfEnvelope(z.object({ task_key: z.string(), status: z.string() }).passthrough()),
    {
      method: "POST",
      body: {
        variant_ids: input.variantIds.map(Number),
        format: input.format ?? "jpg",
        ...(input.optionGroups?.length ? { option_groups: input.optionGroups } : {}),
        files: input.files.map((f) => ({ placement: f.placement, image_url: f.imageUrl, ...(f.position ? { position: f.position } : {}) })),
      },
    },
  );
  return res.result.task_key;
}

export async function getMockupTask(taskKey: string) {
  const res = await pf(`/mockup-generator/task?task_key=${encodeURIComponent(taskKey)}`, pfEnvelope(pfMockupTask));
  return res.result;
}

const pfPrintfiles = z
  .object({
    product_id: z.number(),
    available_placements: z.record(z.string(), z.string()).optional(),
    printfiles: z.array(z.object({ printfile_id: z.number(), width: z.number(), height: z.number(), dpi: z.number().optional() }).passthrough()),
    variant_printfiles: z.array(z.object({ variant_id: z.number(), placements: z.record(z.string(), z.number()) }).passthrough()),
    option_groups: z.array(z.string()).optional(),
  })
  .passthrough();

/** GET /mockup-generator/printfiles/{product_id} — exact print-file sizes per placement. */
export async function getPrintfiles(productId: string) {
  const res = await pf(`/mockup-generator/printfiles/${encodeURIComponent(productId)}`, pfEnvelope(pfPrintfiles));
  return res.result;
}

const pfSizes = z
  .object({
    product_id: z.number(),
    available_sizes: z.array(z.string()).optional(),
    size_tables: z
      .array(
        z
          .object({
            type: z.string(),
            unit: z.string().optional(),
            description: z.string().optional(),
            measurements: z
              .array(
                z
                  .object({
                    type_label: z.string(),
                    unit: z.string().optional(),
                    values: z.array(z.object({ size: z.string(), value: z.string().optional(), min_value: z.string().optional(), max_value: z.string().optional() }).passthrough()),
                  })
                  .passthrough(),
              )
              .optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

/** GET /products/{id}/sizes — official size guide (measurements in cm when available). */
export async function getSizeGuide(productId: string) {
  const res = await pf(`/products/${encodeURIComponent(productId)}/sizes?unit=cm`, pfEnvelope(pfSizes));
  return res.result;
}
