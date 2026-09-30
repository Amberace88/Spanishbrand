import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, Field, PageTitle, SubmitButton, inputCls } from "@/components/admin/ui";
import { closePollAction, createPollAction, moderateCommentAction } from "../../actions/content";

export default async function CommunityAdmin({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const { msg } = await searchParams;
  const sb = db();
  const [{ data: posts }, { data: votes }, { data: comments }] = await Promise.all([
    sb.from("community_posts").select("*").eq("brand_id", env.brandId()).order("created_at", { ascending: false }),
    sb.from("community_votes").select("post_id, option_key"),
    sb.from("community_comments").select("id, body, display_name, status, created_at").eq("status", "PENDING").order("created_at"),
  ]);
  const tally = (postId: string) => {
    const r: Record<string, number> = {};
    for (const v of votes ?? []) if (v.post_id === postId) r[v.option_key] = (r[v.option_key] ?? 0) + 1;
    return r;
  };
  return (
    <>
      <PageTitle title="Comunidad" sub="Votaciones que deciden diseños, colores y colecciones. Resultados guardados." />
      {msg && <p className="mb-6 border-l-2 border-oro bg-white px-4 py-3 text-sm">{decodeURIComponent(msg)}</p>}
      <Card title="Nueva votación" className="mb-6">
        <form action={createPollAction} className="grid gap-3 sm:grid-cols-2">
          <Field label="Título"><input name="title" required placeholder="¿Qué diseño será la próxima gorra?" className={inputCls} /></Field>
          <Field label="Tipo"><select name="type" className={inputCls}><option>DESIGN_VOTE</option><option>COLLECTION_VOTE</option><option>POLL</option></select></Field>
          <Field label="Opciones (una por línea)"><textarea name="options" rows={3} required placeholder={"Sol\nAzulejo\nN-340"} className={inputCls} /></Field>
          <div className="space-y-3">
            <Field label="Descripción"><input name="body" className={inputCls} /></Field>
            <Field label="Cierra"><input name="closes_at" type="datetime-local" className={inputCls} /></Field>
          </div>
          <div className="sm:col-span-2"><SubmitButton>Publicar votación</SubmitButton></div>
        </form>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {(posts ?? []).map((p) => {
          const t = tally(p.id);
          const total = Object.values(t).reduce((a, b) => a + b, 0);
          return (
            <Card key={p.id} title={`${p.type} · ${formatDateTime(p.created_at)}`} actions={<Badge status={p.status} />}>
              <p className="display text-2xl">{p.title}</p>
              <ul className="mt-3 space-y-1.5">
                {((p.options ?? []) as { key: string; label: string }[]).map((o) => (
                  <li key={o.key} className="grid grid-cols-[1fr_120px_40px] items-center gap-2 text-sm">
                    <span>{o.key}. {o.label}</span>
                    <div className="h-3 bg-bone"><div className="h-3 bg-rojo" style={{ width: `${total ? ((t[o.key] ?? 0) / total) * 100 : 0}%` }} /></div>
                    <span className="text-right tabular-nums">{t[o.key] ?? 0}</span>
                  </li>
                ))}
              </ul>
              {p.status === "OPEN" && (
                <form action={closePollAction} className="mt-4"><input type="hidden" name="id" value={p.id} /><SubmitButton variant="ghost">Cerrar y guardar resultado</SubmitButton></form>
              )}
            </Card>
          );
        })}
      </div>
      <Card title="Comentarios pendientes de moderación" className="mt-6">
        {(comments ?? []).map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-4 border-b border-sand py-2 text-sm">
            <p><strong>{c.display_name ?? "Anónimo"}</strong>: {c.body}</p>
            <form action={moderateCommentAction} className="flex gap-2">
              <input type="hidden" name="id" value={c.id} />
              <button name="status" value="APPROVED" className="text-xs underline">Aprobar</button>
              <button name="status" value="REJECTED" className="text-xs text-rojo underline">Rechazar</button>
            </form>
          </div>
        ))}
        {!comments?.length && <p className="text-sm text-stone-2">Nada pendiente.</p>}
      </Card>
    </>
  );
}
