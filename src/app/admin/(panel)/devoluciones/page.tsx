import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, Empty, FilterLink, PageTitle, Stat } from "@/components/admin/ui";
import { STATUS_LABELS } from "@/lib/returns/rules";
import { returnsSettings, formatAddress } from "@/lib/returns/service";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = { SUBMITTED: "REQUIRES_REVIEW", NEED_INFO: "PAUSED", APPROVED: "SHIPPED", AWAITING_RETURN: "PAUSED", RECEIVED: "SHIPPED", RESOLVED: "DELIVERED", REJECTED: "REJECTED", CANCELLED: "CANCELLED" };
const days = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null);

export default async function ReturnsAdminPage({ searchParams }: { searchParams: Promise<{ s?: string; t?: string }> }) {
  await requireStaff(["ADMIN", "CUSTOMER_SUPPORT"]);
  const sp = await searchParams;
  const sb = db();
  let q = sb
    .from("return_requests")
    .select("id, rma, type, status, resolution, customer_email, contact, created_at, provider_id, provider_deadline, return_deadline, provider_claim, refund_amount, orders(order_number), return_items(quantity), return_photos(id)")
    .eq("brand_id", env.brandId())
    .order("created_at", { ascending: false })
    .limit(200);
  if (sp.s === "open") q = q.not("status", "in", "(RESOLVED,REJECTED,CANCELLED)");
  else if (sp.s) q = q.eq("status", sp.s);
  if (sp.t) q = q.eq("type", sp.t);
  const [{ data: rows }, { data: all }, rs] = await Promise.all([q, sb.from("return_requests").select("status, type, provider_claim, provider_deadline, refund_amount").eq("brand_id", env.brandId()), returnsSettings()]);
  const list = all ?? [];
  const open = list.filter((r) => !["RESOLVED", "REJECTED", "CANCELLED"].includes(r.status)).length;
  const claimsDue = list.filter((r) => r.type === "ISSUE" && ((r.provider_claim as { status?: string })?.status ?? "NOT_SUBMITTED") === "NOT_SUBMITTED" && !["REJECTED", "CANCELLED"].includes(r.status)).length;
  const recovered = list.reduce((a, r) => a + Number((r.provider_claim as { recovered_amount?: number })?.recovered_amount ?? 0), 0);
  const refunded = list.reduce((a, r) => a + Number(r.refund_amount ?? 0), 0);
  const addr = formatAddress(rs.address);

  return (
    <>
      <PageTitle
        title="Devoluciones"
        sub="Desistimientos (14 días) e incidencias con foto, con reclamación al fabricante"
        actions={
          <>
            <Link href="/admin/devoluciones/ajustes" className="btn btn-ghost px-4 py-2.5 text-[0.62rem]">
              Ajustes y dirección
            </Link>
            <Link href="/returns/new" target="_blank" className="btn btn-ink px-4 py-2.5 text-[0.62rem]">
              Formulario público ↗
            </Link>
          </>
        }
      />
      {!addr && (
        <p className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-sm">
          Falta la <strong>dirección de devolución</strong>: los clientes que desisten la necesitan para enviar los artículos. <Link href="/admin/devoluciones/ajustes" className="underline">Configurarla</Link>
        </p>
      )}
      <div className="mb-8 grid gap-3 sm:grid-cols-4">
        <Stat label="Abiertas" value={open} tone={open ? "rojo" : "ink"} />
        <Stat label="Reclamaciones por enviar" value={claimsDue} hint="Incidencias aún no reclamadas al proveedor" tone={claimsDue ? "oro" : "ink"} />
        <Stat label="Recuperado de proveedores" value={`${recovered.toFixed(2)} €`} tone="green" />
        <Stat label="Reembolsado a clientes" value={`${refunded.toFixed(2)} €`} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterLink href="/admin/devoluciones" active={!sp.s && !sp.t}>Todas</FilterLink>
        <FilterLink href="/admin/devoluciones?s=open" active={sp.s === "open"}>Abiertas</FilterLink>
        {["SUBMITTED", "AWAITING_RETURN", "RECEIVED", "RESOLVED", "REJECTED"].map((s) => (
          <FilterLink key={s} href={`/admin/devoluciones?s=${s}`} active={sp.s === s}>
            {STATUS_LABELS[s].es.split(" — ")[0]}
          </FilterLink>
        ))}
        <FilterLink href="/admin/devoluciones?t=ISSUE" active={sp.t === "ISSUE"}>Incidencias</FilterLink>
        <FilterLink href="/admin/devoluciones?t=WITHDRAWAL" active={sp.t === "WITHDRAWAL"}>Desistimientos</FilterLink>
      </div>
      <Card>
        {!rows?.length ? (
          <Empty>No hay solicitudes.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ref.</th>
                  <th>Pedido</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Cliente</th>
                  <th>Uds · fotos</th>
                  <th>Plazos</th>
                  <th>Proveedor</th>
                  <th>Creada</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pd = days(r.provider_deadline);
                  const rd = days(r.return_deadline);
                  const claim = (r.provider_claim as { status?: string })?.status ?? "NOT_SUBMITTED";
                  return (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/admin/devoluciones/${r.id}`} className="font-mono font-semibold underline">
                          {r.rma}
                        </Link>
                      </td>
                      <td>#{(r.orders as unknown as { order_number: number })?.order_number}</td>
                      <td>{r.type === "ISSUE" ? "Incidencia" : "Desistimiento"}</td>
                      <td>
                        <Badge status={TONE[r.status] ?? r.status}>{STATUS_LABELS[r.status]?.es.split(" — ")[0]}</Badge>
                      </td>
                      <td>
                        {(r.contact as { name?: string })?.name}
                        <span className="block text-xs text-stone-2">{r.customer_email}</span>
                      </td>
                      <td className="tabular-nums">
                        {(r.return_items as { quantity: number }[]).reduce((a, i) => a + i.quantity, 0)} · {(r.return_photos as unknown[]).length}
                      </td>
                      <td className="text-xs">
                        {r.type === "ISSUE" && pd != null && claim === "NOT_SUBMITTED" && <span className={pd <= 5 ? "font-bold text-rojo" : ""}>Reclamar: {pd} d</span>}
                        {r.type === "WITHDRAWAL" && rd != null && r.status === "AWAITING_RETURN" && <span>Envío cliente: {rd} d</span>}
                      </td>
                      <td className="text-xs">
                        {r.provider_id ?? "—"}
                        {r.type === "ISSUE" && <span className="block text-stone-2">{claim}</span>}
                      </td>
                      <td className="text-xs">{formatDateTime(r.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
