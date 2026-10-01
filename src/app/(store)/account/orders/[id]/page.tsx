import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentCustomer } from "@/lib/account";
import { db } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n/server";
import { formatDate, formatMoney } from "@/lib/format";
import type { TKey } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = { title: "Pedido", robots: { index: false } };

const STEPS = ["PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"] as const;
const RANK: Record<string, number> = { PAID: 0, PROCESSING: 0, SENT_TO_PROVIDER: 1, PROVIDER_ACCEPTED: 1, IN_PRODUCTION: 1, SHIPPED: 2, DELIVERED: 3 };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, { customer }] = await Promise.all([getT(), getCurrentCustomer()]);
  if (!customer || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  // Ownership enforced server-side: order must belong to the signed-in customer.
  const { data: o } = await db()
    .from("orders")
    .select("id, order_number, status, total, subtotal, shipping, discount, tax, currency, created_at, shipping_address, order_items(product_name, variant_name, quantity, total, image), shipments(carrier, tracking_number, tracking_url, status, shipped_at, estimated_delivery_min, estimated_delivery_max)")
    .eq("id", id)
    .eq("customer_id", customer.id)
    .maybeSingle();
  if (!o) notFound();
  const rank = RANK[o.status] ?? -1;
  const addr = o.shipping_address as { name?: string; line1?: string; line2?: string; city?: string; postal_code?: string; country?: string } | null;

  return (
    <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <Link href="/account/orders" className="eyebrow link-u text-[0.62rem] text-muted">
          ← {t("account.orders")}
        </Link>
        <h2 className="headline mt-3 text-4xl">#{o.order_number}</h2>
        <p className="mt-2 text-sm text-muted">
          {formatDate(o.created_at)} · <span className="eyebrow text-[0.62rem] text-fg">{t(`status.${o.status}` as TKey)}</span>
        </p>

        {rank >= 0 && (
          <ol className="mt-10 grid grid-cols-4 gap-2">
            {STEPS.map((s, i) => (
              <li key={s}>
                <div className={`h-1 ${i <= rank ? "bg-accent" : "bg-fg/10"}`} />
                <p className={`eyebrow mt-3 text-[0.58rem] ${i <= rank ? "text-fg" : "text-muted"}`}>{t(`status.${s}` as TKey)}</p>
              </li>
            ))}
          </ol>
        )}

        {(o.shipments ?? []).length > 0 && (
          <div className="mt-10 space-y-3">
            <p className="eyebrow text-muted">{t("account.tracking")}</p>
            {(o.shipments as { carrier: string | null; tracking_number: string | null; tracking_url: string | null; estimated_delivery_max: string | null }[]).map((s, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface-2 p-4 text-sm">
                <span>
                  {s.carrier ?? "—"} · <span className="tabular-nums">{s.tracking_number ?? "—"}</span>
                  {s.estimated_delivery_max && <span className="text-muted"> · {formatDate(s.estimated_delivery_max)}</span>}
                </span>
                {s.tracking_url && (
                  <a href={s.tracking_url} target="_blank" rel="noopener noreferrer" className="btn btn-ink py-2.5">
                    {t("account.tracking")} →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <ul className="mt-10 divide-y divide-line border-y border-line">
          {(o.order_items as { product_name: string; variant_name: string | null; quantity: number; total: number; image: string | null }[]).map((i, k) => (
            <li key={k} className="flex items-center gap-4 py-4">
              <div className="relative aspect-[4/5] w-14 shrink-0 bg-surface-2">{i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />}</div>
              <div className="flex-1 text-sm">
                <p className="font-medium">{i.product_name}</p>
                <p className="text-muted">
                  {i.variant_name} × {i.quantity}
                </p>
              </div>
              <p className="text-sm tabular-nums">{formatMoney(Number(i.total), o.currency)}</p>
            </li>
          ))}
        </ul>
      </div>
      <aside className="h-fit space-y-6 border border-line bg-surface-2 p-6">
        <div className="space-y-2 text-sm">
          {[
            [t("cart.subtotal"), o.subtotal],
            ["Descuento", -Number(o.discount)],
            ["Envío", o.shipping],
          ].map(([l, v]) => (
            <div key={String(l)} className="flex justify-between">
              <span className="text-muted">{l}</span>
              <span className="tabular-nums">{formatMoney(Number(v), o.currency)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(Number(o.total), o.currency)}</span>
          </div>
          <p className="text-xs text-muted">IVA incluido: {formatMoney(Number(o.tax), o.currency)}</p>
        </div>
        {addr && (
          <div className="text-sm">
            <p className="eyebrow mb-2 text-muted">Envío</p>
            <p>{addr.name}</p>
            <p>{addr.line1}</p>
            {addr.line2 && <p>{addr.line2}</p>}
            <p>
              {addr.postal_code} {addr.city}, {addr.country}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
