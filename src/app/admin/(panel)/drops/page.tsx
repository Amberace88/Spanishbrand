import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, Field, PageTitle, SubmitButton, inputCls } from "@/components/admin/ui";
import { saveDropAction, startDropNowAction } from "../../actions/content";

type Drop = { id: string; name: string; slug: string; number: number | null; description: string | null; collection_id: string | null; start_date: string | null; end_date: string | null; status: string; featured: boolean; limited: boolean; drop_products: { product_id: string }[] };

export default async function DropsAdmin({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const { msg } = await searchParams;
  const sb = db();
  const [{ data: drops }, { data: collections }, { data: products }] = await Promise.all([
    sb.from("drops").select("*, drop_products(product_id)").eq("brand_id", env.brandId()).order("created_at", { ascending: false }),
    sb.from("collections").select("id, name").eq("brand_id", env.brandId()).order("sort"),
    sb.from("products").select("id, name, status").eq("brand_id", env.brandId()).neq("status", "ARCHIVED").order("name"),
  ]);

  const Form = ({ d }: { d?: Drop }) => (
    <form action={saveDropAction} className="grid gap-3 sm:grid-cols-4">
      {d && <input type="hidden" name="id" value={d.id} />}
      <Field label="Nombre"><input name="name" defaultValue={d?.name} required className={inputCls} placeholder="DROP 001 — HERITAGE" /></Field>
      <Field label="Nº"><input name="number" type="number" defaultValue={d?.number ?? ""} className={inputCls} /></Field>
      <Field label="Colección">
        <select name="collection_id" defaultValue={d?.collection_id ?? ""} className={inputCls}>
          <option value="">—</option>
          {(collections ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Estado">
        <select name="status" defaultValue={d?.status ?? "DRAFT"} className={inputCls}>{["DRAFT", "SCHEDULED", "LIVE", "ENDED", "ARCHIVED"].map((s) => <option key={s}>{s}</option>)}</select>
      </Field>
      <Field label="Inicio (real)"><input name="start_date" type="datetime-local" defaultValue={d?.start_date?.slice(0, 16) ?? ""} className={inputCls} /></Field>
      <Field label="Fin"><input name="end_date" type="datetime-local" defaultValue={d?.end_date?.slice(0, 16) ?? ""} className={inputCls} /></Field>
      <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="featured" defaultChecked={d?.featured} /> Destacado</label>
      <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="limited" defaultChecked={d?.limited} /> Por tiempo limitado</label>
      <div className="sm:col-span-4"><Field label="Descripción"><textarea name="description" defaultValue={d?.description ?? ""} rows={2} className={inputCls} /></Field></div>
      <div className="sm:col-span-4">
        <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-stone-2">Productos del drop</p>
        <div className="grid max-h-48 gap-1 overflow-auto sm:grid-cols-3">
          {(products ?? []).map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="product" value={p.id} defaultChecked={d?.drop_products.some((x) => x.product_id === p.id)} /> {p.name} <span className="text-xs text-stone">{p.status}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="sm:col-span-4"><SubmitButton>{d ? "Guardar" : "Crear drop"}</SubmitButton></div>
    </form>
  );

  return (
    <>
      <PageTitle title="Drops" sub="Lanzamientos completos de colección. Cuenta atrás solo con fechas reales. SCHEDULED → LIVE automático por cron." />
      {msg && <p className="mb-6 border-l-2 border-oro bg-white px-4 py-3 text-sm">{msg}</p>}
      <Card title="Nuevo drop" className="mb-6"><Form /></Card>
      <div className="space-y-4">
        {((drops ?? []) as Drop[]).map((d) => (
          <details key={d.id} className="border border-sand bg-white">
            <summary className="flex cursor-pointer items-center justify-between px-5 py-3">
              <span className="display text-2xl">{d.name}</span>
              <span className="flex items-center gap-3 text-xs"><Badge status={d.status} /> {formatDateTime(d.start_date)} · {d.drop_products.length} productos</span>
            </summary>
            <div className="border-t border-sand p-5">
              <Form d={d} />
              {d.status !== "LIVE" && (
                <form action={startDropNowAction} className="mt-4">
                  <input type="hidden" name="id" value={d.id} />
                  <SubmitButton variant="primary">Lanzar ahora (activa + email a suscriptores)</SubmitButton>
                </form>
              )}
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
