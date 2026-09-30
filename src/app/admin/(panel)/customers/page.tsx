import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge, Card, Empty, FilterLink, PageTitle, inputCls } from "@/components/admin/ui";

const SEGMENTS = ["NEW", "FIRST_PURCHASE", "REPEAT_CUSTOMER", "VIP", "HIGH_VALUE", "INACTIVE"];

export default async function CustomersAdmin({ searchParams }: { searchParams: Promise<{ seg?: string; q?: string }> }) {
  await requireStaff(["ADMIN", "CUSTOMER_SUPPORT"]);
  const sp = await searchParams;
  let q = db().from("customers").select("id, email, name, country, customer_segment, total_orders, total_spent, last_order_at, marketing_consent, created_at").eq("brand_id", env.brandId()).is("deleted_at", null);
  if (sp.seg) q = q.eq("customer_segment", sp.seg);
  if (sp.q) q = q.ilike("email", `%${sp.q}%`);
  const { data } = await q.order("created_at", { ascending: false }).limit(300);
  return (
    <>
      <PageTitle title="Clientes" sub="CRM ligero · segmentos calculados de pedidos reales" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterLink href="/admin/customers" active={!sp.seg}>Todos</FilterLink>
        {SEGMENTS.map((s) => <FilterLink key={s} href={`/admin/customers?seg=${s}`} active={sp.seg === s}>{s}</FilterLink>)}
        <form className="ml-auto"><input name="q" defaultValue={sp.q} placeholder="email" className={inputCls} /></form>
      </div>
      <Card>
        {data?.length ? (
          <table className="admin-table">
            <thead><tr><th>Cliente</th><th>País</th><th>Segmento</th><th>Pedidos</th><th>Gastado</th><th>Último pedido</th><th>Marketing</th><th>Alta</th></tr></thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/admin/customers/${c.id}`} className="font-semibold underline">{c.email}</Link><br /><span className="text-xs text-stone">{c.name}</span></td>
                  <td>{c.country ?? "—"}</td>
                  <td><Badge status="UNKNOWN">{c.customer_segment}</Badge></td>
                  <td className="tabular-nums">{c.total_orders}</td>
                  <td className="tabular-nums">{formatMoney(Number(c.total_spent))}</td>
                  <td className="text-xs">{formatDate(c.last_order_at)}</td>
                  <td>{c.marketing_consent ? "✓" : "—"}</td>
                  <td className="text-xs">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>Sin clientes todavía.</Empty>
        )}
      </Card>
    </>
  );
}
