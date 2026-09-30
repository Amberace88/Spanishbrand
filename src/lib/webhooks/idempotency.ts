import "server-only";
import { db } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

/**
 * Stores the raw webhook payload. unique(provider, event_id) guarantees a webhook
 * is processed at most once; already-processed duplicates are acknowledged and skipped.
 */
export async function recordWebhook(input: {
  provider: string;
  eventId: string;
  eventType: string;
  payload: unknown;
  signatureValid: boolean | null;
}): Promise<{ id: string; duplicate: boolean }> {
  const sb = db();
  const { data, error } = await sb
    .from("webhook_events")
    .insert({
      provider: input.provider,
      event_id: input.eventId,
      event_type: input.eventType,
      payload: input.payload as object,
      signature_valid: input.signatureValid,
    })
    .select("id")
    .single();

  if (!error && data) return { id: data.id, duplicate: false };

  if (error?.code === "23505") {
    const { data: existing } = await sb
      .from("webhook_events")
      .select("id, processed")
      .eq("provider", input.provider)
      .eq("event_id", input.eventId)
      .single();
    if (existing && !existing.processed) {
      // Previous attempt failed mid-way → allow retry-safe reprocessing.
      await sb.from("webhook_events").update({ attempts: 1 }).eq("id", existing.id);
      return { id: existing.id, duplicate: false };
    }
    log.info("WEBHOOK", "duplicate ignored", { provider: input.provider, eventId: input.eventId });
    return { id: existing?.id ?? "", duplicate: true };
  }
  throw new Error(`webhook store failed: ${error?.message}`);
}

export async function markWebhook(id: string, result: { error?: string | null }) {
  await db()
    .from("webhook_events")
    .update({ processed: !result.error, processed_at: new Date().toISOString(), error: result.error ?? null })
    .eq("id", id);
}
