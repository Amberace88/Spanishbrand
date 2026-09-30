import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env, isConfigured } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, Field, PageTitle, SubmitButton, inputCls } from "@/components/admin/ui";
import { GenerationView } from "@/components/admin/GenerationView";
import { addMetricsAction, aiCampaignAction, aiContentAction, createContentAction, reviewGenerationAction, saveContentItemsAction, setContentStatusAction } from "../../actions/content";

const TYPES = ["PRODUCT", "LIFESTYLE", "HERITAGE", "CULTURE", "MOTOR", "MEDITERRANEAN", "COMMUNITY", "UGC", "CREATOR", "DROP", "LIMITED", "EXPERIMENTAL", "JOURNAL"];
const PLATFORMS = ["TIKTOK", "INSTAGRAM", "FACEBOOK", "PINTEREST", "YOUTUBE", "EMAIL", "WEBSITE", "OTHER"];

export default async function ContentStudio({ searchParams }: { searchParams: Promise<{ gen?: string; msg?: string }> }) {
  await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const sp = await searchParams;
  const sb = db();
  const [{ data: collections }, { data: gens }, { data: perf }] = await Promise.all([
    sb.from("collections").select("id, name").eq("brand_id", env.brandId()).order("sort"),
    sb.from("ai_generations").select("id, kind, input, output, status, error, created_at").eq("brand_id", env.brandId()).in("kind", ["CONTENT", "CAMPAIGN"]).order("created_at", { ascending: false }).limit(12),
    sb.from("v_content_performance").select("*").eq("brand_id", env.brandId()).limit(200),
  ]);
  const { data: content } = await sb.from("content").select("id, title, type, platform, status, published_at, collection_id").eq("brand_id", env.brandId()).order("created_at", { ascending: false }).limit(100);
  const perfById = new Map((perf ?? []).map((p) => [p.content_id, p]));

  return (
    <>
      <PageTitle title="Content Studio" sub="Contenido → engagement → clic → producto → compra. Ganadores por pedidos y margen, no por vistas." />
      {!isConfigured.ai() && <p className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-sm">Configura AI_PROVIDER_API_KEY para la generación con IA.</p>}
      {sp.msg && <p className="mb-6 border-l-2 border-oro bg-white px-4 py-3 text-sm">{sp.msg}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Generar ideas (IA)">
          <form action={aiContentAction} className="space-y-3">
            <Field label="Tipo"><select name="type" className={inputCls}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Colección"><select name="collectionId" className={inputCls}><option value="">—</option>{(collections ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Tema / producto"><input name="topic" required className={inputCls} /></Field>
            <Field label="Cantidad"><input name="n" type="number" min={1} max={10} defaultValue={5} className={inputCls} /></Field>
            <SubmitButton variant="primary">Generar hooks, guiones y captions</SubmitButton>
          </form>
        </Card>
        <Card title="Campaign Engine (IA)">
          <form action={aiCampaignAction} className="space-y-3">
            <Field label="Colección"><select name="collectionId" className={inputCls}>{(collections ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <p className="text-xs text-stone-2">10 TikTok · 10 Reels · 5 foto producto · 5 lifestyle · 5 stories · 5 ad hooks · 3 emails · 3 landings</p>
            <SubmitButton variant="primary">Generar campaña</SubmitButton>
          </form>
        </Card>
        <Card title="Nuevo contenido manual">
          <form action={createContentAction} className="space-y-3">
            <Field label="Título"><input name="title" required className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <select name="type" className={inputCls}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              <select name="platform" className={inputCls}><option value="">—</option>{PLATFORMS.map((t) => <option key={t}>{t}</option>)}</select>
            </div>
            <select name="collectionId" className={inputCls}><option value="">Colección —</option>{(collections ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <input name="external_url" placeholder="URL del post" className={inputCls} />
            <textarea name="body" rows={3} placeholder="Texto / artículo (JOURNAL)" className={inputCls} />
            <SubmitButton>Crear</SubmitButton>
          </form>
        </Card>
      </div>

      <Card title="Generaciones IA" className="mt-6">
        <div className="space-y-3">
          {(gens ?? []).map((g) => (
            <details key={g.id} open={g.id === sp.gen} className="border border-sand">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-2 text-sm">
                <span><strong>{g.kind}</strong> · {formatDateTime(g.created_at)} · <span className="text-stone">{JSON.stringify(g.input).slice(0, 70)}</span></span>
                <Badge status={g.status} />
              </summary>
              <div className="border-t border-sand p-4">
                {g.error ? <p className="text-sm text-rojo">{g.error}</p> : <GenerationView data={g.output} />}
                <div className="mt-4 flex gap-2">
                  {g.status === "DRAFT" && (
                    <>
                      <form action={reviewGenerationAction}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="status" value="APPROVED" /><SubmitButton>Aprobar</SubmitButton></form>
                      <form action={reviewGenerationAction}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="status" value="REJECTED" /><SubmitButton variant="ghost">Rechazar</SubmitButton></form>
                    </>
                  )}
                  {g.status === "APPROVED" && g.kind === "CONTENT" && (
                    <form action={saveContentItemsAction}><input type="hidden" name="id" value={g.id} /><SubmitButton variant="ghost">Guardar como borradores</SubmitButton></form>
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>
      </Card>

      <Card title="Biblioteca de contenido + rendimiento" className="mt-6">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>Título</th><th>Tipo</th><th>Plataforma</th><th>Estado</th><th>Vistas</th><th>CTR</th><th>Pedidos</th><th>Ingresos</th><th>Conv.</th><th>Métricas</th><th></th></tr></thead>
            <tbody>
              {(content ?? []).map((c) => {
                const p = perfById.get(c.id);
                return (
                  <tr key={c.id}>
                    <td className="max-w-xs">{c.title}</td>
                    <td className="text-xs">{c.type}</td>
                    <td className="text-xs">{c.platform ?? "—"}</td>
                    <td><Badge status={c.status} /></td>
                    <td className="tabular-nums">{p?.views ?? 0}</td>
                    <td className="tabular-nums">{p?.ctr != null ? `${(Number(p.ctr) * 100).toFixed(1)}%` : "—"}</td>
                    <td className="tabular-nums">{p?.orders ?? 0}</td>
                    <td className="tabular-nums">{Number(p?.revenue ?? 0).toFixed(2)}</td>
                    <td className="tabular-nums">{p?.conversion_rate != null ? `${(Number(p.conversion_rate) * 100).toFixed(1)}%` : "—"}</td>
                    <td>
                      <form action={addMetricsAction} className="flex gap-1">
                        <input type="hidden" name="id" value={c.id} />
                        {["views", "likes", "shares", "saves", "clicks"].map((k) => <input key={k} name={k} placeholder={k} className="w-16 border border-sand px-1 py-1 text-xs" />)}
                        <button className="text-xs underline">+</button>
                      </form>
                    </td>
                    <td>
                      <form action={setContentStatusAction} className="flex gap-1">
                        <input type="hidden" name="id" value={c.id} />
                        <select name="status" defaultValue={c.status} className="border border-sand px-1 py-1 text-xs">{["DRAFT", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"].map((s) => <option key={s}>{s}</option>)}</select>
                        <button className="text-xs underline">OK</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
