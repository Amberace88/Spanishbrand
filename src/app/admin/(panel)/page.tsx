import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env, isConfigured } from "@/lib/env";
import { getBusinessMetrics, getTopCollections, getTopContent, getTopProducts } from "@/lib/analytics/business";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Badge, Card, Dot, Empty, PageTitle, Stat } from "@/components/admin/ui";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ forbidden?: string }> }) {
  await requireStaff(["ADMIN", "ANALYST", "CUSTOMER_SUPPORT", "CONTENT_MANAGER"]);
  const { forbidden } = await searchParams;
  const sb = db();
  const [m, topProducts, topCollections, topContent, { data: providers }, { data: pending }, { count: openErrors }, { data: productCounts }] = await Promise.all([
    getBusinessMetrics(30),
    getTopProducts(5),
    getTopCollections(5),
    getTopContent(5),
    sb.from("providers").select("id, name, health_status, last_health_check_at, last_sync_at"),
    sb.from("orders").select("id, order_number, status, total, currency, created_at").eq("brand_id", env.brandId()).in("status", ["PAID", "PROCESSING", "REQUIRES_REVIEW", "FULFILLMENT_FAILED"]).order("created_at", { ascending: false }).limit(8),
    sb.from("fulfillment_errors").select("id", { count: "exact", head: true }).eq("resolved", false),
    sb.from("products").select("status").eq("brand_id", env.brandId()),
  ]);
  const published = (productCounts ?? []).filter((p) => p.status === "PUBLISHED").length;

  const setup = [
    ["Base de datos (service role)", isConfigured.db()],
    ["Stripe", isConfigured.stripe()],
    ["Printful API", isConfigured.printful()],
    ["Gelato API", isConfigured.gelato()],
    ["Email (Resend)", isConfigured.email()],
    ["IA", isConfigured.ai()],
    ["CRON_SECRET", Boolean(env.cronSecret())],
    ["Productos publicados", published > 0],
  ] as const;

  return (
    <>
      {forbidden && <p className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-sm">Tu rol no tiene acceso a esa sección.</p>}
      <PageTitle title="Dashboard" sub="Últimos 30 días · datos reales de la base de datos" />

      {setup.some(([, ok]) => !ok) && (
        <Card title="Puesta en marcha" className="mb-6">
          <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {setup.map(([label, ok]) => (
              <li key={label} className="flex items-center gap-2">
                <span className={ok ? "text-emerald-600" : "text-rojo"}>{ok ? "●" : "○"}</span>
                {label}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ingresos" value={formatMoney(m.revenue)} />
        <Stat label="Pedidos" value={m.orders} />
        <Stat label="Ticket medio" value={formatMoney(m.aov)} />
        <Stat label="Conversión" value={m.conversionRate != null ? `${m.conversionRate}%` : "—"} hint="sesiones con consentimiento" />
        <Stat label="Clientes" value={m.customers} hint={`+${m.newCustomers} nuevos`} />
        <Stat label="Margen de contribución" value={formatMoney(m.contributionMargin)} hint="estimado (comisiones de pago)" tone="oro" />
        <Stat label="Fulfillment con incidencias" value={m.failedFulfillment} tone={m.failedFulfillment ? "rojo" : "green"} />
        <Stat label="Alertas abiertas" value={openErrors ?? 0} tone={openErrors ? "rojo" : "green"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Proveedores de fulfillment" actions={<Link href="/admin/providers" className="text-xs underline">Gestionar</Link>}>
          <ul className="space-y-3">
            {(providers ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Dot status={p.health_status} /> {p.name}
                </span>
                <span className="text-xs text-stone">{p.health_status} · {formatDateTime(p.last_health_check_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Pedidos pendientes / con revisión" className="lg:col-span-2" actions={<Link href="/admin/orders" className="text-xs underline">Todos</Link>}>
          {pending?.length ? (
            <table className="admin-table">
              <tbody>
                {pending.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold underline">
                        #{o.order_number}
                      </Link>
                    </td>
                    <td><Badge status={o.status} /></td>
                    <td className="text-right tabular-nums">{formatMoney(Number(o.total), o.currency)}</td>
                    <td className="text-right text-stone">{formatDateTime(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>Sin pedidos pendientes.</Empty>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Top productos">
          {topProducts.length ? (
            <ol className="space-y-2 text-sm">
              {topProducts.map((p) => (
                <li key={p.product_id} className="flex justify-between gap-3">
                  <span className="truncate">{p.name}</span>
                  <span className="tabular-nums">{formatMoney(Number(p.gross_revenue))}</span>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>Aún sin ventas.</Empty>
          )}
        </Card>
        <Card title="Top colecciones">
          {topCollections.length ? (
            <ol className="space-y-2 text-sm">
              {topCollections.map((c) => (
                <li key={c.id} className="flex justify-between gap-3">
                  <span>{c.name}</span>
                  <span className="tabular-nums">{formatMoney(c.revenue)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>Aún sin ventas.</Empty>
          )}
        </Card>
        <Card title="Top contenido (por pedidos, no por vistas)">
          {topContent.length ? (
            <ol className="space-y-2 text-sm">
              {topContent.map((c) => (
                <li key={c.content_id} className="flex justify-between gap-3">
                  <span className="truncate">{c.title}</span>
                  <span className="tabular-nums">{c.orders} ped.</span>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>Sin métricas de contenido.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
