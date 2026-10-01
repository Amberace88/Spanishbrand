import "server-only";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";

export type AuditAction =
  | "return.update"
  | "return.claim"
  | "site.image"
  | "admin.login"
  | "admin.bootstrap"
  | "personalization.approve"
  | "personalization.reject"
  | "b2b.update"
  | "creator.review"
  | "cause.update"
  | "giftcard.create"
  | "product.create"
  | "product.update"
  | "product.delete"
  | "product.publish"
  | "product.unpublish"
  | "product.price_change"
  | "product.approve"
  | "provider.change"
  | "provider.mapping_approve"
  | "provider.fulfillment_test"
  | "provider.sync"
  | "order.modify"
  | "order.retry"
  | "order.change_provider"
  | "order.cancel"
  | "order.refund"
  | "manual.override"
  | "ai.generate"
  | "ai.review"
  | "content.publish"
  | "settings.update"
  | "role.change"
  | "team.invite"
  | "team.remove"
  | "auth.signout_all";

export async function audit(entry: {
  action: AuditAction;
  actorId?: string | null;
  actorEmail?: string | null;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}) {
  const sb = dbOrNull();
  if (!sb) return;
  const { error } = await sb.from("audit_logs").insert({
    brand_id: env.brandId(),
    actor_id: entry.actorId ?? null,
    actor_email: entry.actorEmail ?? null,
    action: entry.action,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    ip: entry.ip ?? null,
  });
  if (error) log.error("ADMIN", "audit insert failed", { error: error.message, action: entry.action });
}
