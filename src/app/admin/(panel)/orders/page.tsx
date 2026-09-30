import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Badge, Card, Empty, FilterLink, PageTitle, inputCls } from "@/components/admin/ui";

const STATUSES = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SENT_TO_PROVIDER", "IN_PRODUCTION", "SHIPPED", "DELIVERED", "REQUIRES_REVIEW", "FULFILLMENT_FAILED", "CANCELLED", "REFUNDED"];

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireStaff(["ADMIN", "CUSTOMER_SUPPORT"]);
  const sp = await searchParams;
  let q = db().from("orders").select("id, order_number, status, payment_status, fulfillment_status, provider, total, currency, customer_email, created_at").eq("brand_id", env.brandId());
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.q) q = /^\d+$/.test(sp.q) ? q.eq("order_number", Number(sp.q)) : q.ilike("customer_email", `%${sp.q}%`);
  const { data: orders } = await q.order("created_at", { ascending: false }).limit(200);

  return (
    <>
      <PageTitle title="Pedidos" sub="Ciclo de vida completo: pago → proveedor → producción → envío → entrega" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterLink href="/admin/orders" active={!sp.status}>Todos</FilterLink>
        {STATUSES.map((s) => <FilterLink key={s} href={`/admin/orders?status=${s}`} active={sp.status === s}>{s}</FilterLink>)}
        <form className="ml-auto">
          <input name="q" defaultValue={sp.q} placeholder="Nº pedido o email" className={inputCls} />
        </form>
      </div>
      <Card>
        {orders?.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead><tr><th>Pedido</th><th>Cliente</th><th>Estado</th><th>Pago</th><th>Fulfillment</th><th>Proveedor</th><th className="text-right">Total</th><th>Fecha</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`} className="font-semibold underline">#{o.order_number}</Link></td>
                    <td className="text-xs">{o.customer_email}</td>
                    <td><Badge status={o.status} /></td>
                    <td><Badge status={o.payment_status} /></td>
                    <td><Badge status={o.fulfillment_status} /></td>
                    <td className="text-xs">{o.provider ?? "—"}</td>
                    <td className="text-right tabular-nums">{formatMoney(Number(o.total), o.currency)}</td>
                    <td className="text-xs">{formatDateTime(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No hay pedidos.</Empty>
        )}
      </Card>
    </>
  );
}
