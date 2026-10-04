import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { getBrand } from "@/lib/brand";
import { Badge, Card, Field, PageTitle, SubmitButton, inputCls } from "@/components/admin/ui";
import { saveDonationAction, savePartnerAction, saveReportAction } from "../../actions/growth";

const CAUSES = ["VETERANOS", "MAYORES", "INFANCIA", "ANIMALES"];

export default async function CausesAdmin() {
  await requireStaff(["ADMIN"]);
  const sb = db();
  const brand = await getBrand();
  const st = brand.settings as { donation_per_item?: number; donations_enabled?: boolean };
  const perItem = Number(st.donation_per_item ?? 1);
  const enabled = st.donations_enabled !== false;
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - i);
    return d.toISOString().slice(0, 7);
  });
  const [{ data: partners }, { data: reports }, ...totals] = await Promise.all([
    sb.from("cause_partners").select("*").eq("brand_id", env.brandId()).order("created_at"),
    sb.from("cause_reports").select("*").eq("brand_id", env.brandId()).order("period", { ascending: false }),
    ...months.map((m) => {
      const from = new Date(`${m}-01T00:00:00Z`);
      const to = new Date(from);
      to.setUTCMonth(to.getUTCMonth() + 1);
      return sb.rpc("cause_totals", { p_brand: env.brandId(), p_from: from.toISOString(), p_to: to.toISOString() });
    }),
  ]);
  return (
    <>
      <PageTitle title="Causas solidarias" sub="Donación de la marca por artículo vendido, de nuestro margen (el cliente no paga más). Los nombres de organizaciones solo se muestran con convenio firmado." />
      <Card title="Compromiso solidario">
        <form action={saveDonationAction} className="flex flex-wrap items-end gap-4">
          <Field label="€ por artículo vendido (0–5)"><input name="donation_per_item" type="number" step="0.5" min="0" max="5" defaultValue={perItem} className={inputCls} /></Field>
          <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="donations_enabled" defaultChecked={enabled} /> Mostrar en la tienda (ficha de producto, carrito, checkout, /causas)</label>
          <div className="pb-1"><SubmitButton>Guardar</SubmitButton></div>
          <p className="basis-full text-xs text-stone">Ahora: {enabled ? `${formatMoney(perItem)} por artículo, visible` : "oculto en la tienda"}. Recomendado 1–2 €. Si aún no hay convenios, el importe se acumula por causa y se dona al firmar; publícalo en «Informes mensuales».</p>
        </form>
      </Card>
      <div className="mt-6" />
      <Card title="Importe a donar por mes (calculado de pedidos pagados)">
        <table className="admin-table">
          <thead><tr><th>Mes</th>{CAUSES.map((c) => <th key={c}>{c}</th>)}<th>Sin elegir</th></tr></thead>
          <tbody>
            {months.map((m, i) => {
              const rows = ((totals[i] as { data: { cause: string; items: number }[] | null }).data ?? []);
              const v = (k: string) => formatMoney(Number(rows.find((r) => r.cause === k)?.items ?? 0) * perItem);
              return <tr key={m}><td className="font-mono">{m}</td>{CAUSES.map((c) => <td key={c} className="tabular-nums">{v(c)}</td>)}<td className="tabular-nums text-stone">{v("SIN_ELEGIR")}</td></tr>;
            })}
          </tbody>
        </table>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Organizaciones colaboradoras">
          <div className="space-y-4">
            {(partners ?? []).map((p) => (
              <form key={p.id} action={savePartnerAction} className="grid gap-2 border border-sand p-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={p.id} />
                <Field label="Causa"><select name="cause" defaultValue={p.cause} className={inputCls}>{CAUSES.map((c) => <option key={c}>{c}</option>)}</select></Field>
                <Field label="Nombre"><input name="name" defaultValue={p.name} className={inputCls} /></Field>
                <Field label="Forma jurídica"><input name="legal_form" defaultValue={p.legal_form ?? ""} className={inputCls} /></Field>
                <Field label="Nº registro"><input name="registry_number" defaultValue={p.registry_number ?? ""} className={inputCls} /></Field>
                <Field label="Web"><input name="website" defaultValue={p.website ?? ""} className={inputCls} /></Field>
                <Field label="URL donación directa"><input name="donate_url" defaultValue={p.donate_url ?? ""} className={inputCls} /></Field>
                <Field label="Fecha convenio"><input type="date" name="agreement_date" defaultValue={p.agreement_date ?? ""} className={inputCls} /></Field>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="agreement_signed" defaultChecked={p.agreement_signed} /> Convenio firmado (visible al público)</label>
                <div className="flex items-center gap-2 sm:col-span-2"><Badge status={p.agreement_signed ? "ACTIVE" : "DRAFT"} /><SubmitButton variant="ghost">Guardar</SubmitButton></div>
              </form>
            ))}
            <form action={savePartnerAction} className="grid gap-2 border border-dashed border-sand p-3 sm:grid-cols-2">
              <p className="text-sm font-semibold sm:col-span-2">Añadir organización</p>
              <Field label="Causa"><select name="cause" className={inputCls}>{CAUSES.map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Nombre"><input name="name" required className={inputCls} /></Field>
              <Field label="Forma jurídica"><input name="legal_form" placeholder="Fundación / Asociación de utilidad pública" className={inputCls} /></Field>
              <Field label="Nº registro"><input name="registry_number" className={inputCls} /></Field>
              <Field label="Web"><input name="website" className={inputCls} /></Field>
              <Field label="URL donación directa"><input name="donate_url" className={inputCls} /></Field>
              <div className="sm:col-span-2"><SubmitButton>Añadir</SubmitButton></div>
            </form>
          </div>
        </Card>

        <Card title="Informes mensuales (transparencia)">
          <form action={saveReportAction} className="grid gap-2 sm:grid-cols-3">
            <Field label="Mes"><input name="period" type="month" required className={inputCls} /></Field>
            <Field label="Causa"><select name="cause" className={inputCls}>{CAUSES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Organización"><select name="partner_id" className={inputCls}><option value="">—</option>{(partners ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Importe donado €"><input name="amount" type="number" step="0.01" min="0" required className={inputCls} /></Field>
            <Field label="URL certificado"><input name="certificate_url" className={inputCls} /></Field>
            <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="published" /> Publicar</label>
            <div className="sm:col-span-3"><SubmitButton>Guardar informe</SubmitButton></div>
          </form>
          <table className="admin-table mt-4">
            <thead><tr><th>Mes</th><th>Causa</th><th>Importe</th><th>Certificado</th><th>Público</th></tr></thead>
            <tbody>
              {(reports ?? []).map((r) => (
                <tr key={r.id}><td className="font-mono">{String(r.period).slice(0, 7)}</td><td>{r.cause}</td><td className="tabular-nums">{formatMoney(Number(r.amount))}</td><td>{r.certificate_url ? <a href={r.certificate_url} className="underline" target="_blank" rel="noopener noreferrer">ver</a> : "—"}</td><td>{r.published ? "Sí" : "No"}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
