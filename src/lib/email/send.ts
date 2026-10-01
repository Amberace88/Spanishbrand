import "server-only";
import { env, isConfigured } from "@/lib/env";
import { dbOrNull } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import { MARKETING_TEMPLATES, renderEmail, type EmailContext, type EmailTemplate } from "./templates";

/**
 * Event-based email sender (Resend REST API). Deduplicated by dedupe_key,
 * marketing templates require consent, every attempt is logged in email_events.
 */
export async function sendEmail(input: {
  template: EmailTemplate;
  to: string;
  context: Omit<EmailContext, "brandName" | "siteUrl"> & { brandName?: string };
  customerId?: string | null;
  orderId?: string | null;
  dedupeKey?: string;
  marketingConsent?: boolean;
}) {
  const sb = dbOrNull();
  const brandName = input.context.brandName ?? "ROJO Y GUALDA";
  const ctx: EmailContext = { ...input.context, brandName, siteUrl: env.siteUrl() };

  const logRow = async (status: string, extra: { provider_message_id?: string; error?: string } = {}) => {
    if (!sb) return;
    const { error } = await sb.from("email_events").insert({
      brand_id: env.brandId(),
      customer_id: input.customerId ?? null,
      email: input.to,
      template: input.template,
      status,
      order_id: input.orderId ?? null,
      dedupe_key: input.dedupeKey ?? null,
      provider_message_id: extra.provider_message_id ?? null,
      error: extra.error ?? null,
    });
    return error;
  };

  if (MARKETING_TEMPLATES.includes(input.template) && !input.marketingConsent) {
    await logRow("SKIPPED_NO_CONSENT");
    return { sent: false, reason: "NO_CONSENT" as const };
  }

  // Claim the dedupe key first so concurrent workers never double-send.
  if (input.dedupeKey && sb) {
    const { data } = await sb.from("email_events").select("id").eq("dedupe_key", input.dedupeKey).maybeSingle();
    if (data) return { sent: false, reason: "DUPLICATE" as const };
  }

  if (!isConfigured.email()) {
    await logRow("SKIPPED_NOT_CONFIGURED");
    log.warn("EMAIL", "RESEND_API_KEY missing — email skipped", { template: input.template });
    return { sent: false, reason: "NOT_CONFIGURED" as const };
  }

  const { subject, html } = renderEmail(input.template, ctx);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.emailFrom(), to: [input.to], subject, html }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`);
    const dupErr = await logRow("SENT", { provider_message_id: body.id });
    if (dupErr?.code === "23505") log.warn("EMAIL", "dedupe race after send", { key: input.dedupeKey });
    log.info("EMAIL", "sent", { template: input.template, id: body.id });
    return { sent: true as const, id: body.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logRow("FAILED", { error: msg });
    log.error("EMAIL", "send failed", { template: input.template, msg });
    return { sent: false, reason: "FAILED" as const };
  }
}
