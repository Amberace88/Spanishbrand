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
}): Promise<{ id: string; duplicate: boolean; inFlight?: boolean }> {
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
      .select("id, processed, error, attempts, created_at")
      .eq("provider", input.provider)
      .eq("event_id", input.eventId)
      .single();
    if (existing && !existing.processed) {
      const recent = Date.now() - new Date(existing.created_at).getTime() < 120_000;
      if (recent && !existing.error) {
        // Another worker is processing this event right now → ask the sender to retry later.
        return { id: existing.id, duplicate: false, inFlight: true };
      }
      // Previous attempt failed or died → optimistic lease, then reprocess (handlers are idempotent).
      const { data: lease } = await sb.from("webhook_events").update({ attempts: existing.attempts + 1, error: null }).eq("id", existing.id).eq("attempts", existing.attempts).select("id");
      if (!lease?.length) return { id: existing.id, duplicate: false, inFlight: true };
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
