import type { Metadata } from "next";
import { getCurrentCustomer } from "@/lib/account";
import { getT } from "@/lib/i18n/server";
import { dbOrNull } from "@/lib/supabase/admin";
import { requestDeletionAction, saveProfileAction } from "@/app/actions/account";
import { ProfileView } from "@/components/account/panel/ProfileView";

export const metadata: Metadata = { title: "Perfil", robots: { index: false } };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const { reset } = await searchParams;
  const [t, { user, customer }] = await Promise.all([getT(), getCurrentCustomer()]);
  const sb = dbOrNull();
  const { data: pendingDelete } = user && sb ? await sb.from("gdpr_requests").select("id").eq("user_id", user.id).eq("type", "DELETE").eq("status", "PENDING").maybeSingle() : { data: null };

  return (
    <ProfileView
      t={t}
      email={user?.email ?? ""}
      name={(customer?.name as string | null) ?? ""}
      phone={(customer?.phone as string | null) ?? ""}
      marketing={Boolean(customer?.marketing_consent)}
      hasPassword={Boolean(user?.user_metadata?.has_password)}
      highlightSecurity={Boolean(reset)}
      deletionPending={Boolean(pendingDelete)}
      saveAction={saveProfileAction}
      deleteAction={requestDeletionAction}
    />
  );
}
