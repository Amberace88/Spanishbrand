import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getBrand } from "@/lib/brand";
import { formatMoney, formatDateTime } from "@/lib/format";
import { FAILURE_LABELS, type EligibilityFailure } from "@/lib/products/eligibility";
import { productMargin } from "@/lib/analytics/business";
import { Badge, Card, Field, PageTitle, SubmitButton, inputCls } from "@/components/admin/ui";
import {
  addBackupMappingAction,
  addImageAction,
  approveMappingAction,
  brandApproveAction,
  publishAction,
  removeImageAction,
  runTestAction,
  setStatusAction,
  updateMappingAction,
  updateProductAction,
  updateVariantAction,
  savePersonalizationAction,
} from "../../../actions/products";

type Mapping = {
  id: string;
  provider_id: string;
  role: "PRIMARY" | "BACKUP";
  provider_product_id: string;
  fulfillment_method: string | null;
  print_config: { files?: { type: string; url: string }[] } | null;
  approved: boolean;
  approved_at: string | null;
  test_passed_at: string | null;
  test_result: Record<string, unknown> | null;
  variant_provider_mappings: { variant_id: string; provider_variant_id: string; status: string }[];
};

export default async function ProductAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const [{ id }, { msg }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sb = db();
  const [{ data: p }, { data: variants }, { data: images }, { data: mappings }, { data: collections }, { data: providers }, brand] = await Promise.all([
    sb.from("products").select("*").eq("id", id).single(),
    sb.from("product_variants").select("*").eq("product_id", id).order("sort"),
    sb.from("product_images").select("*").eq("product_id", id).order("sort"),
    sb.from("product_provider_mappings").select("*, variant_provider_mappings(variant_id, provider_variant_id, status)").eq("product_id", id),
    sb.from("collections").select("id, name").eq("brand_id", env.brandId()).order("sort"),
    sb.from("providers").select("id, name"),
    getBrand(),
  ]);
  if (!p) notFound();
  const report = (p.eligibility_report ?? {}) as { eligible?: boolean; failures?: EligibilityFailure[] };
  const ms = (mappings ?? []) as Mapping[];
  const primary = ms.find((m) => m.role === "PRIMARY");
  const backup = ms.find((m) => m.role === "BACKUP");
  const margin = p.retail_price ? productMargin({ retail: Number(p.retail_price), production: p.production_cost != null ? Number(p.production_cost) : null, shipping: p.shipping_cost != null ? Number(p.shipping_cost) : null }, brand.settings) : null;

  const MappingCard = ({ m }: { m: Mapping }) => {
    const files = m.print_config?.files ?? [];
    return (
      <Card title={`Mapeo ${m.role} · ${m.provider_id} #${m.provider_product_id}`}>
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge status={m.approved ? "APPROVED" : "PENDING"}>{m.approved ? "APROBADO" : "SIN APROBAR"}</Badge>
          <Badge status={m.test_passed_at ? "ACTIVE" : "FAILED"}>{m.test_passed_at ? `TEST OK ${formatDateTime(m.test_passed_at)}` : "TEST PENDIENTE"}</Badge>
          <span className="text-xs text-stone">{m.variant_provider_mappings.length} variantes mapeadas</span>
        </div>
        <form action={updateMappingAction} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="role" value={m.role} />
          <Field label="Método de producción">
            <input name="fulfillment_method" defaultValue={m.fulfillment_method ?? ""} placeholder="DTG / EMBROIDERY / SUBLIMATION / DIGITAL" className={inputCls} />
          </Field>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-stone-2">Archivos de impresión (placement + URL pública PNG/PDF)</p>
          {Array.from({ length: Math.max(2, files.length + 1) }).map((_, i) => (
            <div key={i} className="grid grid-cols-[140px_1fr] gap-2">
              <input name={`file_type_${i}`} defaultValue={files[i]?.type ?? (i === 0 ? (m.provider_id === "gelato" ? "default" : "front") : "")} placeholder="front / back / default" className={inputCls} />
              <input name={`file_url_${i}`} defaultValue={files[i]?.url ?? ""} placeholder="https://…/design.png" className={inputCls} />
            </div>
          ))}
          <SubmitButton variant="ghost">Guardar configuración</SubmitButton>
        </form>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-sand pt-4">
          <form action={approveMappingAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="role" value={m.role} />
            <SubmitButton variant="ghost">Aprobar mapeo</SubmitButton>
          </form>
          <form action={runTestAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="role" value={m.role} />
            <SubmitButton>Ejecutar test de fulfillment</SubmitButton>
          </form>
        </div>
        {m.test_result && <pre className="mt-3 max-h-40 overflow-auto bg-stone-50 p-3 text-[0.7rem]">{JSON.stringify(m.test_result, null, 2)}</pre>}
      </Card>
    );
  };

  return (
    <>
      <PageTitle
        title={p.name}
        sub={`/${p.slug} · ${p.product_type}`}
        actions={
          <>
            <Link href="/admin/products" className="text-sm underline">← Productos</Link>
            {p.status === "PUBLISHED" && <Link href={`/products/${p.slug}`} target="_blank" className="text-sm underline">Ver en tienda ↗</Link>}
          </>
        }
      />
      {msg && <p className="mb-6 border-l-2 border-oro bg-white px-4 py-3 text-sm">{msg}</p>}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card title="Contenido y precio">
            <form action={updateProductAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={id} />
              <Field label="Nombre"><input name="name" defaultValue={p.name} className={inputCls} required /></Field>
              <Field label="Slug"><input name="slug" defaultValue={p.slug} className={inputCls} /></Field>
              <Field label="Tipo de producto"><input name="product_type" defaultValue={p.product_type} className={inputCls} /></Field>
              <Field label="Colección">
                <select name="collection_id" defaultValue={p.collection_id ?? ""} className={inputCls}>
                  <option value="">—</option>
                  {(collections ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2"><Field label="Descripción corta"><input name="short_description" defaultValue={p.short_description ?? ""} className={inputCls} /></Field></div>
              <div className="sm:col-span-2"><Field label="Descripción"><textarea name="description" defaultValue={p.description ?? ""} rows={5} className={inputCls} /></Field></div>
              <div className="sm:col-span-2"><Field label="Historia"><textarea name="story" defaultValue={p.story ?? ""} rows={3} className={inputCls} /></Field></div>
              <Field label="PVP (IVA incl.) €"><input name="retail_price" type="number" step="0.01" defaultValue={p.retail_price ?? ""} className={inputCls} /></Field>
              <Field label="Precio tachado €"><input name="compare_at_price" type="number" step="0.01" defaultValue={p.compare_at_price ?? ""} className={inputCls} /></Field>
              <Field label="Margen objetivo %"><input name="margin_target" type="number" step="0.1" defaultValue={p.margin_target ?? ""} className={inputCls} /></Field>
              <Field label="Tags (coma)"><input name="tags" defaultValue={(p.tags ?? []).join(", ")} className={inputCls} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={p.featured} /> Destacado</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="limited" defaultChecked={p.limited} /> Edición limitada</label>
              <Field label="Tipo de limitación" hint="QUANTITY solo si se puede aplicar técnicamente (se aplica en el pago).">
                <select name="limited_type" defaultValue={p.limited_type ?? ""} className={inputCls}>
                  <option value="">—</option>
                  {["TIME", "COLLECTION", "DESIGN", "SEASONAL", "QUANTITY"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Cantidad limitada"><input name="limited_quantity" type="number" defaultValue={p.limited_quantity ?? ""} className={inputCls} /></Field>
              <Field label="Disponible hasta"><input name="limited_until" type="datetime-local" defaultValue={p.limited_until?.slice(0, 16) ?? ""} className={inputCls} /></Field>
              <div />
              <Field label="SEO title"><input name="seo_title" defaultValue={p.seo_title ?? ""} maxLength={70} className={inputCls} /></Field>
              <Field label="SEO description"><input name="seo_description" defaultValue={p.seo_description ?? ""} maxLength={170} className={inputCls} /></Field>
              <div className="sm:col-span-2"><SubmitButton>Guardar</SubmitButton></div>
            </form>
          </Card>

          <Card title="Personalización (cliente)">
            {(() => {
              const cfg = p.personalization as { mode?: string; template?: string; extraPrice?: number; placements?: string[] } | null;
              const current = cfg?.mode === "designer" ? "designer" : cfg?.template ?? "none";
              return (
                <form action={savePersonalizationAction} className="grid gap-3 sm:grid-cols-3">
                  <input type="hidden" name="id" value={p.id} />
                  <Field label="Tipo">
                    <select name="kind" defaultValue={current} className={inputCls}>
                      <option value="none">Sin personalización</option>
                      <option value="jersey">Nombre + dorsal (espalda)</option>
                      <option value="pueblo">Mi pueblo (frontal)</option>
                      <option value="year">Desde año (frontal)</option>
                      <option value="text">Frase libre (frontal)</option>
                      <option value="designer">Diseño propio del cliente (diseñador)</option>
                    </select>
                  </Field>
                  <Field label="Recargo €"><input name="extraPrice" type="number" step="0.01" min="0" defaultValue={cfg?.extraPrice ?? 5} className={inputCls} /></Field>
                  <Field label="Zonas (diseñador)">
                    <select name="placements" defaultValue={(cfg?.placements ?? ["front"]).join(",")} className={inputCls}>
                      <option value="front">Frontal</option>
                      <option value="back">Espalda</option>
                      <option value="front,back">Frontal o espalda</option>
                    </select>
                  </Field>
                  <p className="text-xs text-stone sm:col-span-3">El archivo de impresión se genera automáticamente para cada pedido y reemplaza el archivo de la marca en esa zona (las demás zonas mantienen el diseño de la marca). Los diseños con imágenes subidas por el cliente quedan en revisión antes de producción. Para productos solo-diseñador, el test de fulfillment usa un archivo de muestra.</p>
                  <div className="sm:col-span-3"><SubmitButton variant="primary">Guardar personalización</SubmitButton></div>
                </form>
              );
            })()}
          </Card>

          <Card title="Imágenes / mockups">
            <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {(images ?? []).map((img) => (
                <div key={img.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="aspect-[4/5] w-full object-cover" />
                  <span className="absolute left-1 top-1 bg-white/90 px-1 text-[0.6rem]">{img.kind}</span>
                  <form action={removeImageAction} className="absolute right-1 top-1">
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="imageId" value={img.id} />
                    <button className="bg-white/90 px-1.5 text-xs text-rojo">✕</button>
                  </form>
                </div>
              ))}
            </div>
            <form action={addImageAction} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
              <input type="hidden" name="id" value={id} />
              <input name="url" placeholder="https://… (Supabase Storage / mockup del proveedor)" className={inputCls} required />
              <select name="kind" className={inputCls}>
                <option>MOCKUP</option><option>IMAGE</option><option>LIFESTYLE</option><option>PRINT_FILE</option>
              </select>
              <SubmitButton variant="ghost">Añadir</SubmitButton>
            </form>
          </Card>

          <Card title="Variantes">
            <table className="admin-table">
              <thead><tr><th>Variante</th><th>Mapeo proveedor</th><th>Coste</th><th>PVP propio</th><th>Activa</th><th></th></tr></thead>
              <tbody>
                {(variants ?? []).map((v) => {
                  const pm = primary?.variant_provider_mappings.find((x) => x.variant_id === v.id);
                  return (
                    <tr key={v.id}>
                      <td colSpan={6} className="p-0">
                        <form action={updateVariantAction} className="grid grid-cols-[1.4fr_1fr_80px_100px_50px_auto] items-center gap-2 px-3 py-2">
                          <input type="hidden" name="id" value={id} />
                          <input type="hidden" name="variantId" value={v.id} />
                          <input name="variant_name" defaultValue={v.variant_name} className={inputCls} />
                          <span className="font-mono text-xs">{pm ? `${pm.provider_variant_id} · ${pm.status}` : <span className="text-rojo">sin mapear</span>}<br /><span className="text-stone">{v.id.slice(0, 8)}</span></span>
                          <span className="tabular-nums text-xs">{v.production_cost != null ? formatMoney(Number(v.production_cost)) : "—"}</span>
                          <input name="retail_price" type="number" step="0.01" defaultValue={v.retail_price ?? ""} placeholder="base" className={inputCls} />
                          <input type="checkbox" name="active" defaultChecked={v.active} />
                          <SubmitButton variant="ghost">OK</SubmitButton>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Elegibilidad API fulfillment">
            <p className={`display text-4xl ${report.eligible ? "text-emerald-700" : "text-rojo"}`}>{report.eligible ? "ELEGIBLE" : "NO ELEGIBLE"}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {(report.failures ?? []).map((f) => <li key={f} className="text-rojo">✕ {FAILURE_LABELS[f] ?? f}</li>)}
            </ul>
            <p className="mt-3 text-xs text-stone">Estado: <Badge status={p.status} /> · aprobación de marca: {p.brand_approved ? "sí" : "no"}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={brandApproveAction}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="approved" value={String(!p.brand_approved)} />
                <SubmitButton variant="ghost">{p.brand_approved ? "Retirar aprobación" : "Aprobar marca"}</SubmitButton>
              </form>
              <form action={publishAction}>
                <input type="hidden" name="id" value={id} />
                <SubmitButton variant="primary">Publicar</SubmitButton>
              </form>
              {["PAUSED", "ARCHIVED", "DRAFT"].map((s) => (
                <form key={s} action={setStatusAction}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="status" value={s} />
                  <SubmitButton variant="ghost">{s}</SubmitButton>
                </form>
              ))}
            </div>
          </Card>

          <Card title="Motor de costes (estimado)">
            {margin ? (
              <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
                {[
                  ["PVP", margin.retail],
                  ["IVA", -margin.tax],
                  ["Producción", margin.production != null ? -margin.production : null],
                  ["Envío (coste)", margin.shipping != null ? -margin.shipping : null],
                  ["Comisión pago", -margin.paymentFee],
                  ["Reserva devoluciones", -margin.refundReserve],
                ].map(([l, v]) => (
                  <div key={String(l)} className="contents">
                    <dt className="text-stone-2">{l}</dt>
                    <dd className="text-right tabular-nums">{v == null ? "desconocido" : formatMoney(Number(v))}</dd>
                  </div>
                ))}
                <dt className="border-t border-sand pt-2 font-semibold">Margen contribución</dt>
                <dd className="border-t border-sand pt-2 text-right font-semibold tabular-nums">{margin.contributionMargin != null ? `${formatMoney(margin.contributionMargin)} · ${margin.marginPercent}%` : "—"}</dd>
              </dl>
            ) : (
              <p className="text-sm text-stone-2">Define el PVP.</p>
            )}
            <p className="mt-2 text-xs text-stone">Estimado: {margin?.estimatedComponents.join(", ")}. Los márgenes reales se calculan con costes reales de cada pedido.</p>
          </Card>

          {primary ? <MappingCard m={primary} /> : <Card title="Mapeo principal"><p className="text-sm text-rojo">Sin proveedor principal. Crea el producto desde el catálogo de un proveedor.</p></Card>}
          {backup && <MappingCard m={backup} />}

          <Card title={backup ? "Reemplazar backup" : "Proveedor de respaldo (fallback controlado)"}>
            <form action={addBackupMappingAction} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <select name="providerId" className={inputCls}>
                {(providers ?? []).filter((x) => x.id !== primary?.provider_id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <input name="providerProductId" placeholder="ID producto/catálogo del proveedor" className={inputCls} required />
              <input name="fulfillment_method" placeholder="Método" className={inputCls} />
              <textarea name="variantMap" rows={4} placeholder={(variants ?? []).map((v) => `${v.id}=<provider variant id>`).join("\n")} className={`${inputCls} font-mono text-xs`} />
              <p className="text-xs text-stone">El fallback solo se usa si este mapeo se aprueba explícitamente.</p>
              <SubmitButton variant="ghost">Guardar backup</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
