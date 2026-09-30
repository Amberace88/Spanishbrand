import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Badge, Card, PageTitle, Stat } from "@/components/admin/ui";

export default async function CustomerAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["ADMIN", "CUSTOMER_SUPPORT"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sb = db();
  const { data: c } = await sb.from("customers").select("*").eq("id", id).single();
  if (!c) notFound();
  const [{ data: orders }, { data: events }, { data: emails }, { data: analytics }] = await Promise.all([
    sb.from("orders").select("id, order_number, status, total, currency, created_at").eq("customer_id", id).order("created_at", { ascending: false }),
    sb.from("customer_events").select("type, data, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
    sb.from("email_events").select("template, status, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
    c.user_id ? sb.from("analytics_events").select("event, path, created_at").eq("user_id", c.user_id).order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [] as { event: string; path: string | null; created_at: string }[] }),
  ]);
  const timeline = [
    ...(events ?? []).map((e) => ({ at: e.created_at, label: e.type, detail: JSON.stringify(e.data) })),
    ...(orders ?? []).map((o) => ({ at: o.created_at, label: `pedido #${o.order_number}`, detail: o.status })),
    ...(emails ?? []).map((e) => ({ at: e.created_at, label: `email ${e.template}`, detail: e.status })),
    ...(analytics ?? []).map((a) => ({ at: a.created_at, label: a.event, detail: a.path ?? "" })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <PageTitle title={c.email} sub={`${c.name ?? ""} · ${c.country ?? ""} · desde ${formatDateTime(c.created_at)}`} actions={<Link href="/admin/customers" className="text-sm underline">← Clientes</Link>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Segmento" value={<span className="text-2xl">{c.customer_segment}</span>} />
        <Stat label="Pedidos" value={c.total_orders} />
        <Stat label="Gastado" value={formatMoney(Number(c.total_spent))} />
        <Stat label="Marketing" value={<span className="text-2xl">{c.marketing_consent ? "Sí" : "No"}</span>} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Pedidos">
          {(orders ?? []).map((o) => (
            <p key={o.id} className="flex justify-between py-1 text-sm">
              <Link href={`/admin/orders/${o.id}`} className="underline">#{o.order_number}</Link>
              <Badge status={o.status} />
              <span className="tabular-nums">{formatMoney(Number(o.total), o.currency)}</span>
            </p>
          ))}
        </Card>
        <Card title="Línea temporal">
          <ol className="max-h-[520px] space-y-2 overflow-auto text-sm">
            {timeline.map((t, i) => (
              <li key={i} className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-xs text-stone">{formatDateTime(t.at)}</span>
                <span><strong>{t.label}</strong> <span className="text-xs text-stone-2">{t.detail}</span></span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
