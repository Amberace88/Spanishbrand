import { requireStaff } from "@/lib/auth/rbac";
import { getBusinessMetrics, getTopCollections, getTopContent, getTopProducts } from "@/lib/analytics/business";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { Card, Empty, FilterLink, PageTitle, Stat } from "@/components/admin/ui";

export default async function AnalyticsAdmin({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  await requireStaff(["ADMIN", "ANALYST"]);
  const { d } = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(d)) ? Number(d) : 30;
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const [m, products, collections, content, { data: events }] = await Promise.all([
    getBusinessMetrics(days),
    getTopProducts(15),
    getTopCollections(10),
    getTopContent(15),
    db().from("analytics_events").select("event").eq("brand_id", env.brandId()).gte("created_at", since).limit(100000),
  ]);
  const funnel: Record<string, number> = {};
  for (const e of events ?? []) funnel[e.event] = (funnel[e.event] ?? 0) + 1;
  const steps = ["page_view", "product_view", "add_to_cart", "checkout_started", "purchase"];
  const maxStep = Math.max(1, ...steps.map((s) => funnel[s] ?? 0));

  return (
    <>
      <PageTitle title="Analítica" sub="Solo datos reales. Los valores estimados se marcan como tales." actions={<div className="flex gap-1">{[7, 30, 90, 365].map((n) => <FilterLink key={n} href={`?d=${n}`} active={days === n}>{n}d</FilterLink>)}</div>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Ingresos" value={formatMoney(m.revenue)} />
        <Stat label="Ventas brutas" value={formatMoney(m.grossSales)} />
        <Stat label="Descuentos" value={formatMoney(m.discounts)} />
        <Stat label="Reembolsos" value={formatMoney(m.refunds)} />
        <Stat label="IVA" value={formatMoney(m.tax)} />
        <Stat label="Ingresos envío" value={formatMoney(m.shippingRevenue)} />
        <Stat label="Coste fulfillment" value={formatMoney(m.fulfillmentCost)} hint="real, del proveedor" />
        <Stat label="Comisiones pago" value={formatMoney(m.paymentFeesEstimated)} hint="estimado" />
        <Stat label="Comisiones creadores" value={formatMoney(m.creatorCommissions)} />
        <Stat label="Margen contribución" value={formatMoney(m.contributionMargin)} hint="estimado" tone="oro" />
        <Stat label="AOV" value={formatMoney(m.aov)} />
        <Stat label="Conversión" value={m.conversionRate != null ? `${m.conversionRate}%` : "—"} />
        <Stat label="Repetición" value={m.repeatPurchaseRate != null ? `${m.repeatPurchaseRate}%` : "—"} />
        <Stat label="Clientes nuevos" value={m.newCustomers} />
        <Stat label="Pedidos" value={m.orders} />
      </div>

      <Card title="Embudo (eventos con consentimiento)" className="mt-6">
        <div className="space-y-2">
          {steps.map((s) => (
            <div key={s} className="grid grid-cols-[140px_1fr_60px] items-center gap-3 text-sm">
              <span>{s}</span>
              <div className="h-5 bg-bone"><div className="h-5 bg-rojo" style={{ width: `${((funnel[s] ?? 0) / maxStep) * 100}%` }} /></div>
              <span className="text-right tabular-nums">{funnel[s] ?? 0}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Rentabilidad por producto">
          {products.length ? (
            <table className="admin-table">
              <thead><tr><th>Producto</th><th>Uds</th><th>Ingresos</th><th>Contribución*</th></tr></thead>
              <tbody>{products.map((p) => <tr key={p.product_id}><td>{p.name}</td><td className="tabular-nums">{p.units_sold}</td><td className="tabular-nums">{formatMoney(Number(p.gross_revenue))}</td><td className="tabular-nums">{formatMoney(p.contribution)}</td></tr>)}</tbody>
            </table>
          ) : <Empty>Sin ventas.</Empty>}
          <p className="mt-2 text-xs text-stone">*Ingresos − coste de producción registrado.</p>
        </Card>
        <Card title="Rentabilidad por colección">
          {collections.length ? (
            <table className="admin-table">
              <thead><tr><th>Colección</th><th>Uds</th><th>Ingresos</th><th>Contribución*</th></tr></thead>
              <tbody>{collections.map((c) => <tr key={c.id}><td>{c.name}</td><td className="tabular-nums">{c.units}</td><td className="tabular-nums">{formatMoney(c.revenue)}</td><td className="tabular-nums">{formatMoney(c.contribution)}</td></tr>)}</tbody>
            </table>
          ) : <Empty>Sin ventas.</Empty>}
        </Card>
      </div>

      <Card title="AI Winner Detection — contenido que vende (no solo vistas)" className="mt-6">
        {content.length ? (
          <table className="admin-table">
            <thead><tr><th>Contenido</th><th>Vistas</th><th>Clics</th><th>CTR</th><th>Pedidos</th><th>Conversión</th><th>Ingresos</th></tr></thead>
            <tbody>
              {content.map((c) => (
                <tr key={c.content_id}>
                  <td>{c.title}</td>
                  <td className="tabular-nums">{c.views}</td>
                  <td className="tabular-nums">{c.clicks}</td>
                  <td className="tabular-nums">{c.ctr != null ? `${(Number(c.ctr) * 100).toFixed(2)}%` : "—"}</td>
                  <td className="tabular-nums font-semibold">{c.orders}</td>
                  <td className="tabular-nums">{c.conversion_rate != null ? `${(Number(c.conversion_rate) * 100).toFixed(1)}%` : "—"}</td>
                  <td className="tabular-nums">{formatMoney(Number(c.revenue))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>Registra métricas en Content Studio para detectar ganadores.</Empty>}
      </Card>
    </>
  );
}
