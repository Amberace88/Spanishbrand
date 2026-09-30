import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { Badge, Card, Empty, FilterLink, PageTitle, SubmitButton, inputCls } from "@/components/admin/ui";
import { createProductFromProviderAction, loadVariantsAction, reviewProviderProductAction } from "../../../actions/providers";

const PAGE = 50;

export default async function ProviderCatalog({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string; f?: string; cat?: string; open?: string; msg?: string; p?: string }> }) {
  await requireStaff(["ADMIN"]);
  const { id } = await params;
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.p) || 0);
  const sb = db();
  let q = sb.from("provider_products").select("id, external_id, title, type, brand, internal_category_code, image, variant_count, eligible, review_status, min_cost, currency, discontinued, available, eligibility_report", { count: "exact" }).eq("provider_id", id);
  if (sp.q) q = q.ilike("title", `%${sp.q}%`);
  if (sp.f === "eligible") q = q.eq("eligible", true);
  if (sp.f === "approved") q = q.eq("review_status", "APPROVED");
  if (sp.f === "imported") q = q.eq("review_status", "IMPORTED");
  if (sp.cat) q = q.eq("internal_category_code", sp.cat);
  const { data: rows, count } = await q.order("review_status").order("title").range(page * PAGE, page * PAGE + PAGE - 1);

  const open = sp.open ? rows?.find((r) => r.id === sp.open) ?? (await sb.from("provider_products").select("*").eq("id", sp.open).maybeSingle()).data : null;
  const { data: variants } = open ? await sb.from("provider_variants").select("external_id, name, size, color, color_code, cost, currency, status").eq("provider_product_id", open.id).order("color").order("size").limit(400) : { data: null };
  const { data: collections } = await sb.from("collections").select("id, name").eq("brand_id", env.brandId()).order("sort");
  const qs = (o: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: sp.q, f: sp.f, cat: sp.cat, ...o })) if (v) u.set(k, v);
    return `?${u.toString()}`;
  };

  return (
    <>
      <PageTitle title={`Catálogo · ${id}`} sub={`${count ?? 0} productos del proveedor · IMPORTED → APPROVE → configurar → test → publicar`} actions={<Link href="/admin/providers" className="text-sm underline">← Proveedores</Link>} />
      {sp.msg && <p className="mb-4 border-l-2 border-oro bg-white px-4 py-3 text-sm">{sp.msg}</p>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[["", "Todos"], ["imported", "Importados"], ["eligible", "Elegibles"], ["approved", "Aprobados"]].map(([k, l]) => (
          <FilterLink key={k} href={qs({ f: k || undefined, p: undefined })} active={(sp.f ?? "") === k}>{l}</FilterLink>
        ))}
        <form className="ml-auto flex gap-2">
          <input name="q" defaultValue={sp.q} placeholder="Buscar…" className={inputCls} />
          {sp.f && <input type="hidden" name="f" value={sp.f} />}
        </form>
      </div>

      {open && (
        <Card title={`Crear producto desde: ${open.title}`} className="mb-6">
          {open.review_status !== "APPROVED" ? (
            <p className="text-sm">Aprueba primero este producto del proveedor.</p>
          ) : !variants?.length ? (
            <form action={loadVariantsAction}>
              <input type="hidden" name="id" value={open.id} />
              <input type="hidden" name="providerId" value={id} />
              <SubmitButton>Cargar variantes del proveedor</SubmitButton>
            </form>
          ) : (
            <form action={createProductFromProviderAction} className="space-y-4">
              <input type="hidden" name="providerProductRowId" value={open.id} />
              <div className="grid gap-3 sm:grid-cols-5">
                <input name="name" required placeholder="Nombre (p. ej. Heritage Tee)" className={`${inputCls} sm:col-span-2`} />
                <input name="productType" required placeholder="Tipo: TSHIRT, HOODIE, POSTER…" className={inputCls} />
                <select name="collectionId" className={inputCls}>
                  <option value="">Sin colección</option>
                  {(collections ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input name="retailPrice" type="number" step="0.01" placeholder="PVP €" className={inputCls} />
              </div>
              <input name="fulfillmentMethod" placeholder="Método (DTG, EMBROIDERY, SUBLIMATION…)" defaultValue={(open as { techniques?: string[] }).techniques?.[0] ?? ""} className={inputCls} />
              <div className="max-h-80 overflow-auto border border-sand">
                <table className="admin-table">
                  <thead><tr><th></th><th>Variante</th><th>Talla</th><th>Color</th><th>Coste</th><th>Estado</th></tr></thead>
                  <tbody>
                    {variants.map((v) => (
                      <tr key={v.external_id}>
                        <td><input type="checkbox" name="variant" value={v.external_id} disabled={v.status === "DISCONTINUED"} /></td>
                        <td className="text-xs">{v.name}</td>
                        <td>{v.size}</td>
                        <td className="flex items-center gap-2">{v.color_code && <span className="h-3 w-3 rounded-full border" style={{ background: v.color_code }} />}{v.color}</td>
                        <td className="tabular-nums">{v.cost != null ? formatMoney(Number(v.cost), v.currency ?? "EUR") : "—"}</td>
                        <td><Badge status={v.status === "ACTIVE" ? "ACTIVE" : v.status === "UNKNOWN" ? "UNKNOWN" : "FAILED"}>{v.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <SubmitButton variant="primary">Crear producto interno (borrador)</SubmitButton>
            </form>
          )}
        </Card>
      )}

      <Card>
        {rows?.length ? (
          <table className="admin-table">
            <thead>
              <tr><th></th><th>Producto</th><th>Categoría</th><th>Variantes</th><th>Coste desde</th><th>Elegible</th><th>Revisión</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{/* eslint-disable-next-line @next/next/no-img-element */}{r.image ? <img src={r.image} alt="" className="h-12 w-12 object-cover" /> : null}</td>
                  <td>
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-xs text-stone">{r.type} · {r.brand} · #{r.external_id}</p>
                  </td>
                  <td className="text-xs">{r.internal_category_code ?? <span className="text-rojo">sin mapear</span>}</td>
                  <td className="tabular-nums">{r.variant_count}</td>
                  <td className="tabular-nums">{r.min_cost != null ? formatMoney(Number(r.min_cost), r.currency ?? "EUR") : "—"}</td>
                  <td>{r.eligible ? <Badge status="ACTIVE">SÍ</Badge> : <Badge status="FAILED">{((r.eligibility_report as { reasons?: string[] })?.reasons ?? []).join(", ") || "NO"}</Badge>}</td>
                  <td><Badge status={r.review_status} /></td>
                  <td className="whitespace-nowrap">
                    <div className="flex gap-1">
                      {r.review_status !== "APPROVED" && (
                        <form action={reviewProviderProductAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="APPROVED" />
                          <SubmitButton variant="ghost">Aprobar</SubmitButton>
                        </form>
                      )}
                      {r.review_status === "APPROVED" && (
                        <Link href={qs({ open: r.id })} className="btn btn-ink px-3 py-2 text-[0.6rem]">Crear producto</Link>
                      )}
                      {r.review_status !== "REJECTED" && (
                        <form action={reviewProviderProductAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="REJECTED" />
                          <SubmitButton variant="ghost">✕</SubmitButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>Sin productos. Ejecuta “Sync catalog” en Proveedores (requiere la API key del proveedor).</Empty>
        )}
        <div className="mt-4 flex justify-between text-sm">
          {page > 0 ? <Link href={qs({ p: String(page - 1) })} className="underline">← Anterior</Link> : <span />}
          {(count ?? 0) > (page + 1) * PAGE && <Link href={qs({ p: String(page + 1) })} className="underline">Siguiente →</Link>}
        </div>
      </Card>
    </>
  );
}
