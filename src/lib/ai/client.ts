import "server-only";
import { z, type ZodType } from "zod";
import { env, isConfigured } from "@/lib/env";
import { db } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import { audit } from "@/lib/audit";

/**
 * AI layer (Anthropic Messages API). Every generation is stored as a DRAFT in ai_generations.
 * AI NEVER publishes: output requires human review → approve → (manual) publish.
 */
export async function generateJSON<T>(opts: { system: string; prompt: string; schema: ZodType<T>; maxTokens?: number }): Promise<T> {
  if (!isConfigured.ai()) throw new Error("AI_NOT_CONFIGURED");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env.aiApiKey()!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: env.aiModel(),
      max_tokens: opts.maxTokens ?? 4000,
      system: `${opts.system}\n\nRespond with ONE valid JSON object only. No markdown fences, no commentary.`,
      messages: [{ role: "user", content: opts.prompt }],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const body = (await res.json()) as { content?: { type: string; text?: string }[]; error?: { message?: string } };
  if (!res.ok) throw new Error(body.error?.message ?? `AI HTTP ${res.status}`);
  const text = (body.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const parsed = opts.schema.safeParse(JSON.parse(json));
  if (!parsed.success) throw new Error(`AI output failed validation: ${parsed.error.issues[0]?.message}`);
  return parsed.data;
}

export async function runGeneration<T>(input: {
  kind: "PRODUCT" | "COLLECTION" | "CONTENT" | "CAMPAIGN" | "BUSINESS_QUESTION";
  input: Record<string, unknown>;
  system: string;
  prompt: string;
  schema: ZodType<T>;
  actor: { userId: string; email: string };
}) {
  const sb = db();
  const { data: row } = await sb
    .from("ai_generations")
    .insert({ brand_id: env.brandId(), kind: input.kind, input: input.input, model: env.aiModel(), created_by: input.actor.userId })
    .select("id")
    .single();
  try {
    const output = await generateJSON({ system: input.system, prompt: input.prompt, schema: input.schema });
    await sb.from("ai_generations").update({ output: output as object, status: "DRAFT" }).eq("id", row!.id);
    await audit({ action: "ai.generate", actorId: input.actor.userId, actorEmail: input.actor.email, entityType: "ai_generation", entityId: row!.id, after: { kind: input.kind } });
    return { id: row!.id as string, output };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await sb.from("ai_generations").update({ status: "FAILED", error: msg }).eq("id", row!.id);
    log.error("AI", "generation failed", { kind: input.kind, msg });
    throw e;
  }
}

const BRAND_VOICE = `You write for a premium Spanish identity & lifestyle brand (fashion, home, travel, motor, Mediterranean culture).
Voice: confident, warm, editorial, understated — never souvenir-like, never political, no flag overuse, no clichés.
Primary language: Spanish (Spain). Never invent facts, reviews, statistics, scarcity or awards.
1492 and other historical dates are historical references only — never the brand's founding year.`;

export const PRODUCT_SCHEMA = z.object({
  product_name: z.string(),
  short_description: z.string(),
  long_description: z.string(),
  seo_title: z.string(),
  seo_description: z.string(),
  tags: z.array(z.string()),
  marketing_angle: z.string(),
  product_story: z.string(),
  social_hooks: z.array(z.string()),
  video_concepts: z.array(z.string()),
  email_copy: z.object({ subject: z.string(), body: z.string() }),
  recommended_collection: z.string(),
});

export const COLLECTION_SCHEMA = z.object({
  collection_name: z.string(),
  story: z.string(),
  product_recommendations: z.array(z.object({ product_type: z.string(), why: z.string() })),
  product_concepts: z.array(z.object({ name: z.string(), concept: z.string() })),
  design_directions: z.array(z.string()),
  visual_directions: z.array(z.string()),
  social_content_ideas: z.array(z.string()),
  video_ideas: z.array(z.string()),
  landing_page_copy: z.object({ headline: z.string(), subheadline: z.string(), body: z.string(), cta: z.string() }),
  email_campaign: z.array(z.object({ subject: z.string(), body: z.string() })),
  ad_concepts: z.array(z.string()),
});

export const CAMPAIGN_SCHEMA = z.object({
  tiktok_concepts: z.array(z.object({ hook: z.string(), script: z.string(), cta: z.string() })),
  reels_concepts: z.array(z.object({ hook: z.string(), script: z.string(), cta: z.string() })),
  product_photo_concepts: z.array(z.string()),
  lifestyle_concepts: z.array(z.string()),
  story_concepts: z.array(z.string()),
  ad_hooks: z.array(z.string()),
  email_campaigns: z.array(z.object({ subject: z.string(), body: z.string() })),
  landing_page_variants: z.array(z.object({ headline: z.string(), subheadline: z.string(), cta: z.string() })),
});

export const CONTENT_SCHEMA = z.object({
  items: z.array(z.object({ hook: z.string(), script: z.string(), caption: z.string(), cta: z.string(), hashtags: z.array(z.string()), video_concept: z.string(), image_concept: z.string() })),
});

export const prompts = {
  system: BRAND_VOICE,
  product: (i: Record<string, string>) =>
    `Create product copy.\nCollection: ${i.collection}\nTheme: ${i.theme}\nTarget customer: ${i.target}\nProduct type: ${i.productType}\nDesign concept: ${i.concept}\nTone: ${i.tone}\nReturn keys: product_name, short_description, long_description, seo_title (≤60 chars), seo_description (≤155 chars), tags, marketing_angle, product_story, social_hooks (5), video_concepts (3), email_copy {subject, body}, recommended_collection.`,
  collection: (brief: string) =>
    `Create a complete collection concept from this brief: "${brief}".\nOnly recommend product types that print-on-demand providers fulfil automatically (tees, hoodies, caps, totes, mugs, bottles, posters, framed posters, canvas, phone cases, blankets, towels, notebooks).\nReturn keys: collection_name, story, product_recommendations[{product_type, why}], product_concepts[{name, concept}], design_directions, visual_directions, social_content_ideas, video_ideas, landing_page_copy {headline, subheadline, body, cta}, email_campaign[{subject, body}] (3), ad_concepts.`,
  campaign: (collection: string, story: string) =>
    `Collection: ${collection}\nStory: ${story}\nGenerate: 10 tiktok_concepts, 10 reels_concepts [{hook, script, cta}], 5 product_photo_concepts, 5 lifestyle_concepts, 5 story_concepts, 5 ad_hooks, 3 email_campaigns [{subject, body}], 3 landing_page_variants [{headline, subheadline, cta}].`,
  content: (type: string, topic: string, n: number) =>
    `Content type: ${type}\nTopic / product / collection: ${topic}\nGenerate ${n} items: {hook, script, caption, cta, hashtags, video_concept, image_concept}. Return {"items": [...]}.`,
};
