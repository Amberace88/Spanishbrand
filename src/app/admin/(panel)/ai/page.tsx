import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env, isConfigured } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, Field, PageTitle, SubmitButton, inputCls } from "@/components/admin/ui";
import { GenerationView } from "@/components/admin/GenerationView";
import { AssistantBox } from "@/components/admin/AssistantBox";
import { aiCollectionAction, aiProductAction, applyProductCopyAction, reviewGenerationAction } from "../../actions/content";

export default async function AiAdmin({ searchParams }: { searchParams: Promise<{ gen?: string; msg?: string }> }) {
  await requireStaff(["ADMIN", "CONTENT_MANAGER", "ANALYST"]);
  const sp = await searchParams;
  const sb = db();
  const [{ data: gens }, { data: collections }, { data: products }] = await Promise.all([
    sb.from("ai_generations").select("id, kind, input, output, status, error, created_at").eq("brand_id", env.brandId()).in("kind", ["PRODUCT", "COLLECTION"]).order("created_at", { ascending: false }).limit(20),
    sb.from("collections").select("name").eq("brand_id", env.brandId()).order("sort"),
    sb.from("products").select("id, name").eq("brand_id", env.brandId()).neq("status", "ARCHIVED").order("name"),
  ]);
  const focus = sp.gen ? gens?.find((g) => g.id === sp.gen) : null;

  return (
    <>
      <PageTitle title="AI Creator" sub="IA genera → humano revisa → aprueba → publica. La IA nunca publica sola." />
      {!isConfigured.ai() && <p className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-sm">Configura AI_PROVIDER_API_KEY para activar la IA.</p>}
      {sp.msg && <p className="mb-6 border-l-2 border-oro bg-white px-4 py-3 text-sm">{sp.msg}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="AI Product Creator">
          <form action={aiProductAction} className="grid gap-3 sm:grid-cols-2">
            <Field label="Colección">
              <select name="collection" className={inputCls}>{(collections ?? []).map((c) => <option key={c.name}>{c.name}</option>)}</select>
            </Field>
            <Field label="Tipo de producto"><input name="productType" required placeholder="Camiseta premium" className={inputCls} /></Field>
            <Field label="Tema"><input name="theme" placeholder="Carretera N-340" className={inputCls} /></Field>
            <Field label="Cliente objetivo"><input name="target" placeholder="25–40, urbano, viajero" className={inputCls} /></Field>
            <div className="sm:col-span-2"><Field label="Concepto de diseño"><textarea name="concept" rows={2} className={inputCls} /></Field></div>
            <Field label="Tono"><input name="tone" defaultValue="editorial, cálido, seguro" className={inputCls} /></Field>
            <div className="flex items-end"><SubmitButton variant="primary">Generar</SubmitButton></div>
          </form>
        </Card>
        <Card title="AI Collection Creator">
          <form action={aiCollectionAction} className="space-y-3">
            <Field label="Brief"><textarea name="brief" rows={4} required placeholder="Crea una colección de estilo de vida mediterráneo." className={inputCls} /></Field>
            <SubmitButton variant="primary">Generar colección</SubmitButton>
          </form>
        </Card>
      </div>

      <Card title="AI Business Assistant" className="mt-6"><AssistantBox /></Card>

      {focus && (
        <Card title={`Resultado · ${focus.kind}`} className="mt-6">
          <GenerationView data={focus.output} />
        </Card>
      )}

      <Card title="Generaciones recientes" className="mt-6">
        <div className="space-y-3">
          {(gens ?? []).map((g) => (
            <details key={g.id} open={g.id === sp.gen} className="border border-sand">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-2 text-sm">
                <span><strong>{g.kind}</strong> · {formatDateTime(g.created_at)} · <span className="text-stone">{JSON.stringify(g.input).slice(0, 80)}</span></span>
                <Badge status={g.status} />
              </summary>
              <div className="border-t border-sand p-4">
                {g.error ? <p className="text-sm text-rojo">{g.error}</p> : <GenerationView data={g.output} />}
                <div className="mt-4 flex flex-wrap gap-2">
                  {g.status === "DRAFT" && (
                    <>
                      <form action={reviewGenerationAction}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="status" value="APPROVED" /><SubmitButton>Aprobar</SubmitButton></form>
                      <form action={reviewGenerationAction}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="status" value="REJECTED" /><SubmitButton variant="ghost">Rechazar</SubmitButton></form>
                    </>
                  )}
                  {g.status === "APPROVED" && g.kind === "PRODUCT" && (
                    <form action={applyProductCopyAction} className="flex gap-2">
                      <input type="hidden" name="id" value={g.id} />
                      <select name="productId" className={inputCls}>{(products ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                      <SubmitButton variant="ghost">Aplicar texto a producto</SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>
      </Card>
    </>
  );
}
