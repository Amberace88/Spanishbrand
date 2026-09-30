import "server-only";
import { z } from "zod";
import { pf } from "./client";
import { pfEnvelope, pfMockupTask } from "./types";

/**
 * POST /mockup-generator/create-task/{product_id} then poll GET /mockup-generator/task?task_key=.
 * Mockup URLs are temporary — callers must copy results to Supabase Storage.
 */
export async function createMockupTask(input: {
  productId: string;
  variantIds: string[];
  files: { placement: string; imageUrl: string }[];
  format?: "jpg" | "png";
}) {
  const res = await pf(
    `/mockup-generator/create-task/${encodeURIComponent(input.productId)}`,
    pfEnvelope(z.object({ task_key: z.string(), status: z.string() }).passthrough()),
    {
      method: "POST",
      body: {
        variant_ids: input.variantIds.map(Number),
        format: input.format ?? "jpg",
        files: input.files.map((f) => ({ placement: f.placement, image_url: f.imageUrl })),
      },
    },
  );
  return res.result.task_key;
}

export async function getMockupTask(taskKey: string) {
  const res = await pf(`/mockup-generator/task?task_key=${encodeURIComponent(taskKey)}`, pfEnvelope(pfMockupTask));
  return res.result;
}
