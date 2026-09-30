import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getBrand } from "@/lib/brand";
import { formatMoney } from "@/lib/format";
import { productMargin } from "@/lib/analytics/business";
import { Badge, Card, Empty, FilterLink, PageTitle, SubmitButton } from "@/components/admin/ui";
import { createManualProductAction } from "../../actions/products";

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<{ status?: string; provider?: string; eligible?: string; collection?: string; category?: string }> }) {
  await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const sp = await searchParams;
  const sb = db();
  const brand = await getBrand();
  let q = sb
    .from("products")
    .select("id, name, slug, status, primary_provider, provider_product_id, fulfillment_eligible, production_cost, shipping_cost, retail_price, eligibility_report, categories:category_id(code, name), collections:collection_id(name)")
    .eq("brand_id", env.brandId());
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.provider) q = q.eq("primary_provider", sp.provider);
  if (sp.eligible === "1") q = q.eq("fulfillment_eligible", true);
  if (sp.eligible === "0") q = q.eq("fulfillment_eligible", false);
  if (sp.collection) q = q.eq("collection_id", sp.collection);
  const [{ data: products }, { data: collections }, { data: providers }] = await Promise.all([q.order("updated_at", { ascending: false }).limit(300), sb.from("collections").select("id, name").eq("brand_id", env.brandId()).order("sort"), sb.from("providers").select("id, name")]);
  const list = (products ?? []).filter((p) => !sp.category || (p.categories as unknown as { code: string } | null)?.code === sp.category);
  const qs = (o: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...o })) if (v) u.set(k, v);
    return `?${u.toString()}`;
  };

  return (
    <>
      <PageTitle
        title="Productos"
        sub="Solo los productos con API_FULFILLMENT_ELIGIBILITY = TRUE pueden publicarse."
        actions={
          <>
            <Link href="/admin/providers" className="btn btn-primary px-4 py-2.5 text-[0.62rem]">+ Desde catálogo de proveedor</Link>
            <form action={createManualProductAction}>
              <SubmitButton variant="ghost">+ Borrador vacío</SubmitButton>
            </form>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {[["", "Todos"], ["PUBLISHED", "Publicados"], ["DRAFT", "Borrador"], ["READY_FOR_CONFIGURATION", "Configurar"], ["READY_FOR_FULFILLMENT", "Listos"], ["PAUSED", "Pausados"], ["OUT_OF_STOCK", "Sin stock"], ["PROVIDER_UNAVAILABLE", "No disponibles"]].map(([k, l]) => (
          <FilterLink key={k} href={qs({ status: k || undefined })} active={(sp.status ?? "") === k}>{l}</FilterLink>
        ))}
        <span className="mx-2 w-px bg-sand" />
        <FilterLink href={qs({ eligible: sp.eligible === "1" ? undefined : "1" })} active={sp.eligible === "1"}>Elegibles</FilterLink>
        <FilterLink href={qs({ eligible: sp.eligible === "0" ? undefined : "0" })} active={sp.eligible === "0"}>No elegibles</FilterLink>
        {(providers ?? []).map((pr) => (
          <FilterLink key={pr.id} href={qs({ provider: sp.provider === pr.id ? undefined : pr.id })} active={sp.provider === pr.id}>{pr.name}</FilterLink>
        ))}
        {(collections ?? []).slice(0, 6).map((c) => (
          <FilterLink key={c.id} href={qs({ collection: sp.collection === c.id ? undefined : c.id })} active={sp.collection === c.id}>{c.name}</FilterLink>
        ))}
      </div>
      <Card>
        {list.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr><th>Nombre</th><th>Categoría</th><th>Colección</th><th>Proveedor</th><th>ID proveedor</th><th>Elegible</th><th>Coste</th><th>PVP</th><th>Margen (est.)</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const m = p.retail_price ? productMargin({ retail: Number(p.retail_price), production: p.production_cost != null ? Number(p.production_cost) : null, shipping: p.shipping_cost != null ? Number(p.shipping_cost) : null }, brand.settings) : null;
                  const fails = ((p.eligibility_report as { failures?: string[] })?.failures ?? []).length;
                  return (
                    <tr key={p.id}>
                      <td><Link href={`/admin/products/${p.id}`} className="font-semibold underline">{p.name}</Link></td>
                      <td className="text-xs">{(p.categories as unknown as { name: string } | null)?.name ?? "—"}</td>
                      <td className="text-xs">{(p.collections as unknown as { name: string } | null)?.name ?? "—"}</td>
                      <td>{p.primary_provider ?? "—"}</td>
                      <td className="font-mono text-xs">{p.provider_product_id ?? "—"}</td>
                      <td>{p.fulfillment_eligible ? <Badge status="ACTIVE">SÍ</Badge> : <Badge status="FAILED">{fails} fallos</Badge>}</td>
                      <td className="tabular-nums">{p.production_cost != null ? formatMoney(Number(p.production_cost)) : "—"}</td>
                      <td className="tabular-nums">{p.retail_price != null ? formatMoney(Number(p.retail_price)) : "—"}</td>
                      <td className="tabular-nums">{m?.contributionMargin != null ? `${formatMoney(m.contributionMargin)} (${m.marginPercent}%)` : "—"}</td>
                      <td><Badge status={p.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Sin productos. Empieza por Proveedores → Sync catalog → Aprobar → Crear producto.</Empty>
        )}
      </Card>
    </>
  );
}
