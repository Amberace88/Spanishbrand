import type { Metadata } from "next";
import { getCurrentCustomer } from "@/lib/account";
import { getT } from "@/lib/i18n/server";
import { db } from "@/lib/supabase/admin";
import { requestDeletionAction, updateProfileAction } from "@/app/actions/account";

export const metadata: Metadata = { title: "Perfil", robots: { index: false } };

export default async function ProfilePage() {
  const [t, { user, customer }] = await Promise.all([getT(), getCurrentCustomer()]);
  const { data: pendingDelete } = user ? await db().from("gdpr_requests").select("id").eq("user_id", user.id).eq("type", "DELETE").eq("status", "PENDING").maybeSingle() : { data: null };

  return (
    <div className="grid max-w-4xl gap-14 lg:grid-cols-2">
      <form action={updateProfileAction} className="space-y-5">
        <label className="block">
          <span className="eyebrow mb-2 block text-muted">Nombre</span>
          <input name="name" defaultValue={customer?.name ?? ""} className="field" />
        </label>
        <label className="block">
          <span className="eyebrow mb-2 block text-muted">Teléfono</span>
          <input name="phone" defaultValue={customer?.phone ?? ""} className="field" />
        </label>
        <label className="flex items-start gap-3 text-sm text-muted">
          <input type="checkbox" name="marketing" defaultChecked={customer?.marketing_consent ?? false} className="mt-1 accent-[var(--accent)]" />
          {t("checkout.marketing")}
        </label>
        <button className="btn btn-ink">Guardar</button>
      </form>
      <div className="space-y-6">
        <p className="eyebrow text-muted">Privacidad (RGPD)</p>
        <a href="/api/account/export" className="btn btn-ghost w-full">
          {t("account.export")}
        </a>
        {pendingDelete ? (
          <p className="text-sm text-muted">Solicitud de eliminación recibida. La procesaremos en un máximo de 30 días.</p>
        ) : (
          <form action={requestDeletionAction}>
            <button className="btn btn-ghost w-full text-accent">{t("account.delete")}</button>
          </form>
        )}
      </div>
    </div>
  );
}
