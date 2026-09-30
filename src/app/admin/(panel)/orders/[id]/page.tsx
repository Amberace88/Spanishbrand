import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Badge, Card, PageTitle, SubmitButton, inputCls } from "@/components/admin/ui";
import { cancelOrderAction, changeProviderAction, refreshFromProviderAction, refundOrderAction, reprocessOrderAction, resolveErrorAction, retryFulfillmentAction } from "../../../actions/orders";

export default async function OrderAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  await requireStaff(["ADMIN", "CUSTOMER_SUPPORT"]);
  const [{ id }, { msg }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sb = db();
  const [{ data: o }, { data: items }, { data: groups }, { data: events }, { data: errors }, { data: shipments }, { data: payments }, { data: refunds }, { data: providers }] = await Promise.all([
    sb.from("orders").select("*, customers(id, email, name, customer_segment), creators(name, code)").eq("id", id).single(),
    sb.from("order_items").select("*").eq("order_id", id),
    sb.from("fulfillment_orders").select("*, fulfillment_items(order_item_id, provider_variant_id, quantity)").eq("order_id", id),
    sb.from("order_events").select("*").eq("order_id", id).order("created_at"),
    sb.from("fulfillment_errors").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    sb.from("shipments").select("*").eq("order_id", id),
    sb.from("payments").select("*").eq("order_id", id),
    sb.from("refunds").select("*").eq("order_id", id),
    sb.from("providers").select("id, name"),
  ]);
  if (!o) notFound();
  const addr = o.shipping_address as Record<string, string> | null;
  const hidden = (name: string, value: string) => <input type="hidden" name={name} value={value} />;

  return (
    <>
      <PageTitle title={`Pedido #${o.order_number}`} sub={`${o.customer_email} · ${formatDateTime(o.created_at)}`} actions={<Link href="/admin/orders" className="text-sm underline">← Pedidos</Link>} />
      {msg && <p className="mb-6 border-l-2 border-oro bg-white px-4 py-3 text-sm">{msg}</p>}
      {o.review_reason && <p className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-sm"><strong>REQUIRES REVIEW:</strong> {o.review_reason}</p>}
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge status={o.status} /> <Badge status={o.payment_status}>pago: {o.payment_status}</Badge> <Badge status={o.fulfillment_status}>fulfillment: {o.fulfillment_status}</Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card title="Grupos de fulfillment (por proveedor)">
            {groups?.length ? (
              <div className="space-y-4">
                {groups.map((g) => (
                  <div key={g.id} className="border border-sand p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{g.provider_id} <span className="text-xs text-stone">({g.mapping_role})</span></p>
                      <Badge status={g.status} />
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-1 text-xs sm:grid-cols-4">
                      <div><dt className="text-stone">ID proveedor</dt><dd className="font-mono">{g.provider_order_id ?? "—"}</dd></div>
                      <div><dt className="text-stone">Estado proveedor</dt><dd>{g.provider_status ?? "—"}</dd></div>
                      <div><dt className="text-stone">Intentos</dt><dd>{g.attempts}</dd></div>
                      <div><dt className="text-stone">Próximo reintento</dt><dd>{formatDateTime(g.next_retry_at)}</dd></div>
                      <div><dt className="text-stone">Coste proveedor</dt><dd>{g.cost_total != null ? formatMoney(Number(g.cost_total), g.currency ?? "EUR") : "—"}</dd></div>
                      <div><dt className="text-stone">Enviado</dt><dd>{formatDateTime(g.submitted_at)}</dd></div>
                      <div><dt className="text-stone">Expedido</dt><dd>{formatDateTime(g.shipped_at)}</dd></div>
                      <div><dt className="text-stone">Entregado</dt><dd>{formatDateTime(g.delivered_at)}</dd></div>
                    </dl>
                    {g.last_error && <p className="mt-2 text-xs text-rojo">{g.last_error}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!g.provider_order_id && ["FAILED", "REQUIRES_REVIEW", "RETRY_SCHEDULED", "PENDING"].includes(g.status) && (
                        <form action={retryFulfillmentAction}>{hidden("orderId", id)}{hidden("foId", g.id)}<SubmitButton>Reintentar</SubmitButton></form>
                      )}
                      {!g.provider_order_id && (
                        <form action={changeProviderAction} className="flex gap-1">
                          {hidden("orderId", id)}{hidden("foId", g.id)}
                          <select name="targetProvider" className={inputCls}>{(providers ?? []).filter((p) => p.id !== g.provider_id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                          <SubmitButton variant="ghost">Cambiar proveedor</SubmitButton>
                        </form>
                      )}
                      {g.provider_order_id && (
                        <form action={refreshFromProviderAction}>{hidden("orderId", id)}{hidden("foId", g.id)}<SubmitButton variant="ghost">Actualizar desde proveedor</SubmitButton></form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-2">Sin grupos de fulfillment todavía.</p>
            )}
            {o.payment_status === "PAID" && ["REQUIRES_REVIEW", "FULFILLMENT_FAILED", "PAID"].includes(o.status) && (
              <form action={reprocessOrderAction} className="mt-4">{hidden("orderId", id)}<SubmitButton variant="primary">Revisado → reprocesar pedido</SubmitButton></form>
            )}
          </Card>

          <Card title="Alertas de fulfillment">
            {errors?.length ? (
              <table className="admin-table">
                <thead><tr><th>Proveedor</th><th>Código</th><th>Detalle</th><th>Tipo</th><th></th></tr></thead>
                <tbody>
                  {errors.map((e) => (
                    <tr key={e.id} className={e.resolved ? "opacity-50" : ""}>
                      <td>{e.provider ?? "—"}</td>
                      <td className="font-mono text-xs">{e.error_code}<br />{e.http_status ?? ""}</td>
                      <td className="text-xs">
                        {e.error_message}
                        {e.endpoint && <p className="text-stone">{e.endpoint} · req {e.request_id ?? "—"} · {formatDateTime(e.created_at)}</p>}
                        {e.payload && <details><summary className="cursor-pointer text-stone">payload</summary><pre className="max-h-40 overflow-auto text-[0.65rem]">{JSON.stringify(e.payload, null, 2)}</pre></details>}
                      </td>
                      <td>{e.permanent ? <Badge status="FAILED">PERMANENTE</Badge> : <Badge status="PENDING">TEMPORAL #{e.retry_count}</Badge>}</td>
                      <td>{!e.resolved && <form action={resolveErrorAction}>{hidden("errorId", e.id)}{hidden("orderId", id)}<SubmitButton variant="ghost">Resolver</SubmitButton></form>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-stone-2">Sin alertas.</p>
            )}
          </Card>

          <Card title="Línea temporal">
            <ol className="space-y-2 text-sm">
              {(events ?? []).map((e) => (
                <li key={e.id} className="grid grid-cols-[130px_1fr] gap-3">
                  <span className="text-xs text-stone">{formatDateTime(e.created_at)}</span>
                  <span><strong>{e.type}</strong>{e.to_status ? ` → ${e.to_status}` : ""} {e.message && <span className="text-stone-2">— {e.message}</span>} <span className="text-xs text-stone">({e.actor})</span></span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Artículos">
            <ul className="space-y-2 text-sm">
              {(items ?? []).map((i) => (
                <li key={i.id} className="flex justify-between gap-3">
                  <span>{i.product_name} <span className="text-stone">· {i.variant_name} × {i.quantity}</span></span>
                  <span className="tabular-nums">{formatMoney(Number(i.total), o.currency)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 grid grid-cols-2 gap-1 border-t border-sand pt-3 text-sm">
              <dt>Subtotal</dt><dd className="text-right tabular-nums">{formatMoney(Number(o.subtotal), o.currency)}</dd>
              <dt>Descuento {o.discount_code ? `(${o.discount_code})` : ""}</dt><dd className="text-right tabular-nums">−{formatMoney(Number(o.discount), o.currency)}</dd>
              <dt>Envío</dt><dd className="text-right tabular-nums">{formatMoney(Number(o.shipping), o.currency)}</dd>
              <dt>IVA incluido</dt><dd className="text-right tabular-nums">{formatMoney(Number(o.tax), o.currency)}</dd>
              <dt className="font-semibold">Total</dt><dd className="text-right font-semibold tabular-nums">{formatMoney(Number(o.total), o.currency)}</dd>
            </dl>
          </Card>
          <Card title="Cliente y envío">
            <p className="text-sm">{o.customer_name ?? "—"} · {o.customer_email} · {o.customer_phone ?? ""}</p>
            {o.customers && <Link href={`/admin/customers/${(o.customers as { id: string }).id}`} className="text-xs underline">Ficha CRM</Link>}
            {addr && <p className="mt-2 text-sm text-stone-2">{addr.line1} {addr.line2} · {addr.postal_code} {addr.city} · {addr.country}</p>}
            {o.creators && <p className="mt-2 text-xs">Creador: {(o.creators as { name: string; code: string }).name} ({(o.creators as { code: string }).code})</p>}
          </Card>
          <Card title="Envíos / tracking">
            {shipments?.length ? shipments.map((s) => (
              <p key={s.id} className="text-sm">{s.carrier} · {s.tracking_number} · <Badge status={s.status} /> {s.tracking_url && <a href={s.tracking_url} target="_blank" rel="noopener noreferrer" className="underline">seguir ↗</a>}</p>
            )) : <p className="text-sm text-stone-2">Aún sin envío.</p>}
          </Card>
          <Card title="Pagos y reembolsos">
            {(payments ?? []).map((p) => <p key={p.id} className="text-sm">{p.provider} {p.provider_payment_id} · {formatMoney(Number(p.amount), p.currency)} · <Badge status={p.status} /></p>)}
            {(refunds ?? []).map((r) => <p key={r.id} className="text-sm text-stone-2">Reembolso {formatMoney(Number(r.amount), r.currency)} · {r.status}</p>)}
            {o.payment_status === "PAID" || o.payment_status === "PARTIALLY_REFUNDED" ? (
              <form action={refundOrderAction} className="mt-3 flex gap-2">
                {hidden("orderId", id)}
                <input name="amount" type="number" step="0.01" placeholder={String(o.total)} className={inputCls} />
                <SubmitButton variant="danger">Reembolsar</SubmitButton>
              </form>
            ) : null}
          </Card>
          {!["CANCELLED", "REFUNDED", "DELIVERED", "SHIPPED"].includes(o.status) && (
            <form action={cancelOrderAction}>{hidden("orderId", id)}<SubmitButton variant="danger">Cancelar pedido</SubmitButton></form>
          )}
        </div>
      </div>
    </>
  );
}
