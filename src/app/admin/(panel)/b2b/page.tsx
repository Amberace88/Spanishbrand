import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, Empty, PageTitle, SubmitButton, inputCls } from "@/components/admin/ui";
import { setB2BStatusAction } from "../../actions/growth";

export default async function B2BAdmin() {
  await requireStaff(["ADMIN", "CUSTOMER_SUPPORT"]);
  const { data } = await db().from("b2b_requests").select("*").eq("brand_id", env.brandId()).order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <PageTitle title="Empresas, peñas y eventos" sub="Solicitudes de presupuesto desde /empresas" />
      <Card>
        {data?.length ? (
          <table className="admin-table">
            <thead><tr><th>Fecha</th><th>Empresa</th><th>Contacto</th><th>Tipo</th><th>Cantidad</th><th>Detalle</th><th>Estado</th></tr></thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-xs">{formatDateTime(r.created_at)}</td>
                  <td className="font-semibold">{r.company}</td>
                  <td>{r.contact_name}<br /><a href={`mailto:${r.email}`} className="text-xs underline">{r.email}</a>{r.phone && <><br /><span className="text-xs">{r.phone}</span></>}</td>
                  <td className="text-xs">{r.type}</td>
                  <td className="tabular-nums">{r.quantity ?? "—"}</td>
                  <td className="max-w-xs text-xs">{r.products}{r.deadline && <><br />Fecha: {r.deadline}</>}{r.message && <><br /><span className="text-stone-2">{r.message}</span></>}</td>
                  <td>
                    <Badge status={r.status} />
                    <form action={setB2BStatusAction} className="mt-2 flex gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <select name="status" defaultValue={r.status} className={`${inputCls} !py-1 text-xs`}>
                        {["NEW", "CONTACTED", "QUOTED", "WON", "LOST"].map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <SubmitButton variant="ghost">OK</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>Aún no hay solicitudes.</Empty>
        )}
      </Card>
    </>
  );
}
