import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge, Card, Field, PageTitle, SubmitButton, inputCls } from "@/components/admin/ui";
import { saveCreatorAction, saveDiscountAction, setCommissionStatusAction } from "../../actions/settings";
import { reviewCreatorAction } from "../../actions/growth";

export default async function CreatorsAdmin({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireStaff(["ADMIN"]);
  const { msg } = await searchParams;
  const sb = db();
  const [{ data: creators }, { data: commissions }, { data: discounts }] = await Promise.all([
    sb.from("creators").select("*, creator_links(slug, clicks, target_path)").eq("brand_id", env.brandId()).order("created_at", { ascending: false }),
    sb.from("creator_commissions").select("id, amount, base_amount, status, created_at, creators(name), orders(order_number)").order("created_at", { ascending: false }).limit(100),
    sb.from("discounts").select("*").eq("brand_id", env.brandId()).order("created_at", { ascending: false }),
  ]);
  return (
    <>
      <PageTitle title="Creadores & afiliados" sub="Código de referido + enlace de seguimiento + atribución de campañas" />
      {msg && <p className="mb-6 border-l-2 border-oro bg-white px-4 py-3 text-sm">{msg}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Nuevo creador">
          <form action={saveCreatorAction} className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre"><input name="name" required className={inputCls} /></Field>
            <Field label="Email"><input name="email" type="email" className={inputCls} /></Field>
            <Field label="Código" hint="p. ej. BRAVO10"><input name="code" required className={`${inputCls} uppercase`} /></Field>
            <Field label="Comisión %"><input name="commission_rate" type="number" step="0.5" defaultValue={10} className={inputCls} /></Field>
            <Field label="Descuento cliente %" hint="0 = sin código de descuento"><input name="discount_rate" type="number" step="1" defaultValue={10} className={inputCls} /></Field>
            <Field label="Destino del enlace"><input name="target_path" defaultValue="/" className={inputCls} /></Field>
            <div className="sm:col-span-2"><SubmitButton>Crear</SubmitButton></div>
          </form>
        </Card>
        <Card title="Nuevo código de descuento">
          <form action={saveDiscountAction} className="grid gap-3 sm:grid-cols-2">
            <Field label="Código"><input name="code" required className={`${inputCls} uppercase`} /></Field>
            <Field label="Tipo"><select name="type" className={inputCls}><option value="PERCENT">% porcentaje</option><option value="FIXED">€ fijo</option></select></Field>
            <Field label="Valor"><input name="value" type="number" step="0.01" required className={inputCls} /></Field>
            <Field label="Usos máx."><input name="max_uses" type="number" className={inputCls} /></Field>
            <Field label="Caduca"><input name="ends_at" type="datetime-local" className={inputCls} /></Field>
            <div className="flex items-end"><SubmitButton>Crear</SubmitButton></div>
          </form>
        </Card>
      </div>

      <Card title="Creadores" className="mt-6">
        <table className="admin-table">
          <thead><tr><th>Creador</th><th>Código</th><th>Enlace</th><th>Clics</th><th>Pedidos</th><th>Ingresos</th><th>Comisión</th><th>Estado</th></tr></thead>
          <tbody>
            {(creators ?? []).map((c) => (
              <tr key={c.id}>
                <td>{c.name}<br /><span className="text-xs text-stone">{c.email}</span></td>
                <td className="font-mono">{c.code}</td>
                <td className="font-mono text-xs">{(c.creator_links ?? []).map((l: { slug: string }) => `${env.siteUrl()}/r/${l.slug}`).join(" ")}</td>
                <td className="tabular-nums">{c.total_clicks}</td>
                <td className="tabular-nums">{c.total_orders}</td>
                <td className="tabular-nums">{formatMoney(Number(c.total_revenue))}</td>
                <td className="tabular-nums">{(Number(c.commission_rate) * 100).toFixed(1)}%</td>
                <td>
                  <Badge status={c.status} />
                  {c.status === "PENDING" && (
                    <div className="mt-2 text-xs">
                      <p className="text-stone-2">{c.kind} · {c.platform} {c.handle} · {c.audience_size ?? "—"} seg.{c.portfolio_url && <> · <a href={c.portfolio_url} target="_blank" rel="noopener noreferrer" className="underline">portfolio</a></>}</p>
                      {c.application_message && <p className="mt-1 max-w-xs text-stone-2">{c.application_message}</p>}
                      <div className="mt-2 flex gap-1">
                        <form action={reviewCreatorAction}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="ACTIVE" /><SubmitButton variant="primary">Aprobar</SubmitButton></form>
                        <form action={reviewCreatorAction}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="REJECTED" /><SubmitButton variant="danger">Rechazar</SubmitButton></form>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Comisiones">
          <table className="admin-table">
            <tbody>
              {(commissions ?? []).map((c) => (
                <tr key={c.id}>
                  <td>{(c.creators as unknown as { name: string })?.name}</td>
                  <td>#{(c.orders as unknown as { order_number: number })?.order_number}</td>
                  <td className="tabular-nums">{formatMoney(Number(c.amount))}</td>
                  <td><Badge status={c.status} /></td>
                  <td>
                    <form action={setCommissionStatusAction} className="flex gap-1">
                      <input type="hidden" name="id" value={c.id} />
                      {["APPROVED", "PAID", "VOID"].map((s) => <button key={s} name="status" value={s} className="text-xs underline">{s}</button>)}
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Códigos de descuento">
          <table className="admin-table">
            <tbody>
              {(discounts ?? []).map((d) => (
                <tr key={d.id}>
                  <td className="font-mono">{d.code}</td>
                  <td>{d.type === "PERCENT" ? `${d.value}%` : formatMoney(Number(d.value))}</td>
                  <td className="tabular-nums">{d.uses}{d.max_uses ? `/${d.max_uses}` : ""}</td>
                  <td className="text-xs">{d.ends_at ? formatDate(d.ends_at) : "—"}</td>
                  <td>{d.active ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
