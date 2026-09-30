import { requireStaff, hasRole } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env, isConfigured } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { Card, Field, PageTitle, SubmitButton, inputCls } from "@/components/admin/ui";
import { assignRoleAction, removeRoleAction, saveBrandAction, saveShippingRuleAction, saveTaxRateAction } from "../../actions/settings";

export default async function SettingsAdmin({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const staff = await requireStaff(["ADMIN"]);
  const { msg } = await searchParams;
  const sb = db();
  const [{ data: b }, { data: rules }, { data: taxes }, { data: roles }, { data: audits }] = await Promise.all([
    sb.from("brand_settings").select("*").eq("brand_id", env.brandId()).single(),
    sb.from("shipping_rules").select("*").eq("brand_id", env.brandId()).order("sort"),
    sb.from("tax_rates").select("*").order("country"),
    sb.from("user_roles").select("user_id, role, profiles:user_id(email)").eq("brand_id", env.brandId()),
    sb.from("audit_logs").select("actor_email, action, entity_type, entity_id, created_at").order("created_at", { ascending: false }).limit(40),
  ]);
  const st = (b?.settings ?? {}) as Record<string, number>;
  const social = (b?.social_links ?? {}) as Record<string, string>;
  const site = env.siteUrl();
  const integrations: [string, boolean, string][] = [
    ["Supabase (DB + Auth)", isConfigured.db() && isConfigured.auth(), "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY"],
    ["Stripe", isConfigured.stripe() && Boolean(env.stripeWebhookSecret()), `STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET · webhook: ${site}/api/webhooks/stripe`],
    ["Printful", isConfigured.printful() && Boolean(env.printfulWebhookSecret()), "PRINTFUL_API_KEY, PRINTFUL_WEBHOOK_SECRET (registro desde Proveedores)"],
    ["Gelato", isConfigured.gelato() && Boolean(env.gelatoWebhookSecret()), `GELATO_API_KEY, GELATO_WEBHOOK_SECRET · webhook en portal: ${site}/api/webhooks/gelato?token=…`],
    ["Email (Resend)", isConfigured.email(), "RESEND_API_KEY, EMAIL_FROM"],
    ["IA", isConfigured.ai(), "AI_PROVIDER_API_KEY, AI_MODEL"],
    ["Cron", Boolean(env.cronSecret()), "CRON_SECRET"],
  ];

  return (
    <>
      <PageTitle title="Ajustes" />
      {msg && <p className="mb-6 border-l-2 border-oro bg-white px-4 py-3 text-sm">{decodeURIComponent(msg)}</p>}

      <Card title="Integraciones (secretos solo en servidor)" className="mb-6">
        <ul className="space-y-2 text-sm">
          {integrations.map(([name, ok, hint]) => (
            <li key={name} className="grid gap-1 sm:grid-cols-[220px_1fr]">
              <span className="flex items-center gap-2"><span className={ok ? "text-emerald-600" : "text-rojo"}>{ok ? "●" : "○"}</span>{name}</span>
              <span className="break-all text-xs text-stone">{hint}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Marca (brand_settings)" className="mb-6">
        <form action={saveBrandAction} className="grid gap-3 sm:grid-cols-3">
          <Field label="Nombre de marca"><input name="brand_name" defaultValue={b?.brand_name} className={inputCls} /></Field>
          <Field label="Tagline"><input name="brand_tagline" defaultValue={b?.brand_tagline ?? ""} className={inputCls} /></Field>
          <Field label="Año de fundación"><input name="founded_year" type="number" defaultValue={b?.founded_year ?? ""} className={inputCls} /></Field>
          <div className="sm:col-span-3"><Field label="Descripción"><textarea name="brand_description" defaultValue={b?.brand_description ?? ""} rows={2} className={inputCls} /></Field></div>
          <Field label="Logo URL"><input name="brand_logo" defaultValue={b?.brand_logo ?? ""} className={inputCls} /></Field>
          <Field label="Email soporte"><input name="support_email" defaultValue={b?.support_email ?? ""} className={inputCls} /></Field>
          <Field label="Países de envío (ISO, coma)"><input name="supported_countries" defaultValue={(b?.supported_countries ?? []).join(", ")} className={inputCls} /></Field>
          <Field label="Color primario"><input name="primary_color" defaultValue={b?.primary_color} className={inputCls} /></Field>
          <Field label="Color secundario"><input name="secondary_color" defaultValue={b?.secondary_color} className={inputCls} /></Field>
          <Field label="Color acento"><input name="accent_color" defaultValue={b?.accent_color} className={inputCls} /></Field>
          {["instagram", "tiktok", "youtube", "pinterest", "facebook"].map((k) => (
            <Field key={k} label={k}><input name={`social_${k}`} defaultValue={social[k] ?? ""} className={inputCls} /></Field>
          ))}
          <Field label="Comisión pago %" hint="0.015 = 1,5%"><input name="payment_fee_percent" type="number" step="0.001" defaultValue={st.payment_fee_percent ?? 0.015} className={inputCls} /></Field>
          <Field label="Comisión pago fija €"><input name="payment_fee_fixed" type="number" step="0.01" defaultValue={st.payment_fee_fixed ?? 0.25} className={inputCls} /></Field>
          <Field label="Reserva devoluciones" hint="0.02 = 2%"><input name="refund_reserve_percent" type="number" step="0.005" defaultValue={st.refund_reserve_percent ?? 0.02} className={inputCls} /></Field>
          <Field label="Carrito abandonado (horas)"><input name="abandoned_cart_hours" type="number" defaultValue={st.abandoned_cart_hours ?? 4} className={inputCls} /></Field>
          <div className="sm:col-span-3"><SubmitButton>Guardar marca</SubmitButton></div>
        </form>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Reglas de envío (fallback si no hay tarifa del proveedor)">
          {(rules ?? []).map((r) => (
            <form key={r.id} action={saveShippingRuleAction} className="mb-3 grid grid-cols-4 gap-2 border-b border-sand pb-3">
              <input type="hidden" name="id" value={r.id} />
              <input name="name" defaultValue={r.name} className={`${inputCls} col-span-2`} />
              <input name="country_codes" defaultValue={r.country_codes.join(",")} className={`${inputCls} col-span-2`} />
              <input name="base_rate" type="number" step="0.01" defaultValue={r.base_rate} title="Base €" className={inputCls} />
              <input name="per_additional_item" type="number" step="0.01" defaultValue={r.per_additional_item} title="+ artículo" className={inputCls} />
              <input name="free_over" type="number" step="0.01" defaultValue={r.free_over ?? ""} placeholder="gratis desde" className={inputCls} />
              <div className="flex gap-1"><input name="min_days" type="number" defaultValue={r.min_days ?? ""} className={inputCls} /><input name="max_days" type="number" defaultValue={r.max_days ?? ""} className={inputCls} /></div>
              <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={r.active} /> activa</label>
              <div className="col-span-2 text-right"><SubmitButton variant="ghost">Guardar</SubmitButton></div>
            </form>
          ))}
        </Card>
        <Card title="IVA (validación legal requerida antes de producción)">
          <table className="admin-table">
            <tbody>
              {(taxes ?? []).map((t) => (
                <tr key={t.id}>
                  <td>{t.country}{t.region ? `-${t.region}` : ""}</td>
                  <td className="text-xs">{t.name}{t.requires_review && <span className="ml-1 text-rojo">revisar</span>}</td>
                  <td>
                    <form action={saveTaxRateAction} className="flex gap-1">
                      <input type="hidden" name="id" value={t.id} />
                      <input name="rate" type="number" step="0.0001" defaultValue={t.rate} className="w-20 border border-sand px-1 py-1 text-xs" />
                      <input type="checkbox" name="active" defaultChecked={t.active} />
                      <button className="text-xs underline">OK</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Usuarios y roles">
          <table className="admin-table">
            <tbody>
              {(roles ?? []).map((r) => (
                <tr key={`${r.user_id}-${r.role}`}>
                  <td>{(r.profiles as unknown as { email: string } | null)?.email ?? r.user_id}</td>
                  <td>{r.role}</td>
                  <td>{hasRole(staff, ["SUPER_ADMIN"]) && <form action={removeRoleAction}><input type="hidden" name="userId" value={r.user_id} /><input type="hidden" name="role" value={r.role} /><button className="text-xs text-rojo underline">quitar</button></form>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasRole(staff, ["SUPER_ADMIN"]) && (
            <form action={assignRoleAction} className="mt-4 flex gap-2">
              <input name="email" type="email" placeholder="email (debe haber iniciado sesión)" required className={inputCls} />
              <select name="role" className={inputCls}>{["ADMIN", "CONTENT_MANAGER", "CUSTOMER_SUPPORT", "ANALYST", "SUPER_ADMIN"].map((r) => <option key={r}>{r}</option>)}</select>
              <SubmitButton>Asignar</SubmitButton>
            </form>
          )}
        </Card>
        <Card title="Audit log">
          <ol className="max-h-80 space-y-1 overflow-auto text-xs">
            {(audits ?? []).map((a, i) => (
              <li key={i}><span className="text-stone">{formatDateTime(a.created_at)}</span> · {a.actor_email ?? "system"} · <strong>{a.action}</strong> {a.entity_type} {a.entity_id?.slice(0, 8)}</li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
