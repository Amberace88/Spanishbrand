import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { getBrand } from "@/lib/brand";
import { Card, Field, PageTitle, SubmitButton, inputCls } from "@/components/admin/ui";
import { saveReturnsSettingsAction } from "@/app/admin/actions/returns";
import { returnsSettings } from "@/lib/returns/service";

export const dynamic = "force-dynamic";

export default async function ReturnsSettingsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireStaff(["ADMIN"]);
  const [sp, rs, brand] = await Promise.all([searchParams, returnsSettings(), getBrand()]);
  const a = rs.address ?? {};
  const le = brand.legalEntity;
  return (
    <>
      <PageTitle
        title="Ajustes de devoluciones"
        sub="Dirección a la que los clientes envían los desistimientos y datos del vendedor para los textos legales"
        actions={
          <Link href="/admin/devoluciones" className="btn btn-ghost px-4 py-2.5 text-[0.62rem]">
            ← Devoluciones
          </Link>
        }
      />
      {sp.msg && <p className="mb-6 border-l-2 border-oro bg-white px-4 py-3 text-sm">{sp.msg}</p>}
      <form action={saveReturnsSettingsAction} className="grid gap-6 xl:grid-cols-2">
        <Card title="Dirección de devolución">
          <div className="grid gap-4 sm:grid-cols-6">
            <div className="sm:col-span-6"><Field label="Nombre / empresa"><input name="r_name" defaultValue={a.name ?? brand.name} className={inputCls} /></Field></div>
            <div className="sm:col-span-4"><Field label="Dirección"><input name="r_line1" defaultValue={a.line1 ?? ""} className={inputCls} /></Field></div>
            <div className="sm:col-span-2"><Field label="Piso, puerta"><input name="r_line2" defaultValue={a.line2 ?? ""} className={inputCls} /></Field></div>
            <div className="sm:col-span-2"><Field label="Código postal"><input name="r_postal" defaultValue={a.postalCode ?? ""} className={inputCls} /></Field></div>
            <div className="sm:col-span-2"><Field label="Ciudad"><input name="r_city" defaultValue={a.city ?? ""} className={inputCls} /></Field></div>
            <div className="sm:col-span-2"><Field label="Provincia"><input name="r_province" defaultValue={a.province ?? ""} className={inputCls} /></Field></div>
            <div className="sm:col-span-3"><Field label="País"><input name="r_country" defaultValue={a.country ?? "España"} className={inputCls} /></Field></div>
            <div className="sm:col-span-3"><Field label="Teléfono (para el transportista)"><input name="r_phone" defaultValue={a.phone ?? ""} className={inputCls} /></Field></div>
            <div className="sm:col-span-6"><Field label="Avisos de nuevas solicitudes a" hint={`Si se deja vacío: ${brand.supportEmail ?? "email de soporte de Ajustes"}`}><input name="r_notify" type="email" defaultValue={rs.notifyEmail ?? ""} className={inputCls} /></Field></div>
          </div>
          <p className="mt-4 text-xs text-stone-2">Se muestra al cliente solo cuando ejerce el desistimiento (en la confirmación, el email y la página de estado). Las incidencias con foto normalmente no requieren devolver el artículo.</p>
        </Card>
        <Card title="Datos del vendedor (textos legales)">
          <div className="space-y-4">
            <Field label="Razón social / nombre"><input name="le_name" defaultValue={le.name ?? ""} className={inputCls} /></Field>
            <Field label="NIF / NIE / CIF"><input name="le_tax" defaultValue={le.taxId ?? ""} className={inputCls} /></Field>
            <Field label="Domicilio"><input name="le_address" defaultValue={le.address ?? ""} className={inputCls} /></Field>
            <Field label="Email de contacto legal"><input name="le_email" type="email" defaultValue={le.email ?? ""} className={inputCls} /></Field>
          </div>
          <p className="mt-4 text-xs text-stone-2">Aparecen en el modelo de formulario de desistimiento (Anexo B TRLGDCU) de la página de Devoluciones. Obligatorio identificar al vendedor antes del lanzamiento.</p>
        </Card>
        <div className="xl:col-span-2">
          <SubmitButton variant="primary">Guardar ajustes</SubmitButton>
        </div>
      </form>
    </>
  );
}
