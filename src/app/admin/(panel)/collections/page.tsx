import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { Badge, Card, Field, PageTitle, SubmitButton, inputCls } from "@/components/admin/ui";
import { saveCollectionAction } from "../../actions/content";

type Col = { id: string; name: string; slug: string; tagline: string | null; story: string | null; hero_image: string | null; accent_color: string | null; status: string; featured: boolean; sort: number; seo_title: string | null; seo_description: string | null };

function CollectionForm({ c }: { c?: Col }) {
  return (
    <form action={saveCollectionAction} className="grid gap-3 sm:grid-cols-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Nombre"><input name="name" defaultValue={c?.name} required className={inputCls} /></Field>
      <Field label="Slug"><input name="slug" defaultValue={c?.slug} className={inputCls} /></Field>
      <Field label="Estado">
        <select name="status" defaultValue={c?.status ?? "DRAFT"} className={inputCls}><option>DRAFT</option><option>ACTIVE</option><option>ARCHIVED</option></select>
      </Field>
      <Field label="Orden"><input name="sort" type="number" defaultValue={c?.sort ?? 0} className={inputCls} /></Field>
      <div className="sm:col-span-2"><Field label="Tagline"><input name="tagline" defaultValue={c?.tagline ?? ""} className={inputCls} /></Field></div>
      <Field label="Color acento"><input name="accent_color" defaultValue={c?.accent_color ?? ""} placeholder="#B3122E" className={inputCls} /></Field>
      <Field label="Imagen hero (URL)"><input name="hero_image" defaultValue={c?.hero_image ?? ""} className={inputCls} /></Field>
      <div className="sm:col-span-4"><Field label="Historia"><textarea name="story" defaultValue={c?.story ?? ""} rows={2} className={inputCls} /></Field></div>
      <Field label="SEO title"><input name="seo_title" defaultValue={c?.seo_title ?? ""} className={inputCls} /></Field>
      <div className="sm:col-span-2"><Field label="SEO description"><input name="seo_description" defaultValue={c?.seo_description ?? ""} className={inputCls} /></Field></div>
      <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="featured" defaultChecked={c?.featured} /> Destacada</label>
      <div className="sm:col-span-4"><SubmitButton>{c ? "Guardar" : "Crear colección"}</SubmitButton></div>
    </form>
  );
}

export default async function CollectionsAdmin() {
  await requireStaff(["ADMIN", "CONTENT_MANAGER"]);
  const { data } = await db().from("collections").select("*").eq("brand_id", env.brandId()).order("sort");
  return (
    <>
      <PageTitle title="Colecciones" sub="Las colecciones son más importantes que los productos individuales." />
      <Card title="Nueva colección" className="mb-6"><CollectionForm /></Card>
      <div className="space-y-4">
        {((data ?? []) as Col[]).map((c) => (
          <details key={c.id} className="border border-sand bg-white">
            <summary className="flex cursor-pointer items-center justify-between px-5 py-3">
              <span className="display text-2xl">{c.name}</span>
              <span className="flex gap-2"><Badge status={c.status} />{c.featured && <Badge status="APPROVED">DESTACADA</Badge>}</span>
            </summary>
            <div className="border-t border-sand p-5"><CollectionForm c={c} /></div>
          </details>
        ))}
      </div>
    </>
  );
}
