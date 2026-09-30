import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, Dot, Empty, PageTitle, Stat } from "@/components/admin/ui";

const BUCKETS: [string, string[]][] = [
  ["WAITING", ["PENDING", "RETRY_SCHEDULED", "SUBMITTING"]],
  ["PROCESSING", ["SENT_TO_PROVIDER", "PROVIDER_ACCEPTED"]],
  ["IN_PRODUCTION", ["IN_PRODUCTION"]],
  ["SHIPPED", ["SHIPPED", "PARTIALLY_SHIPPED"]],
  ["FAILED", ["FAILED"]],
  ["REQUIRES_REVIEW", ["REQUIRES_REVIEW"]],
];

function alertType(code: string | null, msg: string) {
  const s = `${code} ${msg}`.toLowerCase();
  if (/stock/.test(s)) return "Stock";
  if (/variant/.test(s)) return "Variante";
  if (/address|destination|ship/.test(s)) return "Envío";
  if (/http_|network|timeout|api/.test(s)) return "API";
  return "Pedido";
}

export default async function FulfillmentAdmin() {
  await requireStaff(["ADMIN", "CUSTOMER_SUPPORT"]);
  const sb = db();
  const [{ data: providers }, { data: groups }, { data: alerts }, { data: webhooks }] = await Promise.all([
    sb.from("providers").select("*"),
    sb.from("fulfillment_orders").select("id, order_id, provider_id, status, attempts, next_retry_at, last_error, updated_at, orders(order_number)").order("updated_at", { ascending: false }).limit(500),
    sb.from("fulfillment_errors").select("id, order_id, provider, error_code, error_message, permanent, retry_count, created_at, orders(order_number)").eq("resolved", false).order("created_at", { ascending: false }).limit(100),
    sb.from("webhook_events").select("provider, event_type, processed, error, created_at").order("created_at", { ascending: false }).limit(15),
  ]);

  return (
    <>
      <PageTitle title="Fulfillment" sub="Estado de producción y envío en todos los proveedores" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(providers ?? []).map((p) => (
          <div key={p.id} className="flex items-center justify-between border border-sand bg-white p-4">
            <span className="flex items-center gap-2 font-semibold"><Dot status={p.health_status} /> {p.name}</span>
            <span className="text-xs text-stone">{p.health_status}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        {BUCKETS.map(([label, statuses]) => (
          <Stat key={label} label={label} value={(groups ?? []).filter((g) => statuses.includes(g.status)).length} tone={label === "FAILED" || label === "REQUIRES_REVIEW" ? "rojo" : "ink"} />
        ))}
      </div>

      <Card title={`Alertas abiertas (${alerts?.length ?? 0})`} className="mt-6">
        {alerts?.length ? (
          <table className="admin-table">
            <thead><tr><th>Pedido</th><th>Tipo</th><th>Proveedor</th><th>Detalle</th><th>Clase</th><th>Fecha</th></tr></thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td><Link href={`/admin/orders/${a.order_id}`} className="font-semibold underline">#{(a.orders as unknown as { order_number: number })?.order_number}</Link></td>
                  <td>{alertType(a.error_code, a.error_message)}</td>
                  <td>{a.provider ?? "—"}</td>
                  <td className="max-w-md text-xs">{a.error_message}</td>
                  <td>{a.permanent ? <Badge status="FAILED">PERMANENTE</Badge> : <Badge status="PENDING">TEMPORAL</Badge>}</td>
                  <td className="text-xs">{formatDateTime(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>Sin alertas abiertas. ✓</Empty>
        )}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Grupos activos">
          <table className="admin-table">
            <tbody>
              {(groups ?? []).filter((g) => !["DELIVERED", "CANCELLED"].includes(g.status)).slice(0, 30).map((g) => (
                <tr key={g.id}>
                  <td><Link href={`/admin/orders/${g.order_id}`} className="underline">#{(g.orders as unknown as { order_number: number })?.order_number}</Link></td>
                  <td>{g.provider_id}</td>
                  <td><Badge status={g.status} /></td>
                  <td className="text-xs">{g.status === "RETRY_SCHEDULED" ? `reintento ${formatDateTime(g.next_retry_at)}` : formatDateTime(g.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Últimos webhooks">
          <table className="admin-table">
            <tbody>
              {(webhooks ?? []).map((w, i) => (
                <tr key={i}>
                  <td>{w.provider}</td>
                  <td className="text-xs">{w.event_type}</td>
                  <td>{w.processed ? <Badge status="ACTIVE">OK</Badge> : <Badge status="FAILED">{w.error ? "ERROR" : "PENDIENTE"}</Badge>}</td>
                  <td className="text-xs">{formatDateTime(w.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
