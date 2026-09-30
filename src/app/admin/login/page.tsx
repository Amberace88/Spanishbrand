import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/rbac";
import { getSessionUser } from "@/lib/supabase/server";
import { MagicLinkForm } from "@/components/account/MagicLinkForm";
import { Wordmark } from "@/components/brand/Wordmark";
import { getBrand } from "@/lib/brand";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLogin() {
  const [staff, user, brand] = await Promise.all([getStaffSession(), getSessionUser(), getBrand()]);
  if (staff) redirect("/admin");
  return (
    <main className="grain relative flex min-h-dvh items-center justify-center bg-ink px-4 text-bone">
      <div className="w-full max-w-sm">
        <Wordmark name={brand.name} className="text-lg" />
        <h1 className="display mt-10 text-6xl">Brand OS</h1>
        <p className="mt-2 text-sm text-bone/60">Acceso restringido al equipo.</p>
        {user ? (
          <p className="mt-8 border border-bone/15 p-4 text-sm text-bone/80">
            {user.email} no tiene rol de equipo. Un SUPER_ADMIN debe asignarte un rol, o añade tu email a ADMIN_EMAILS para el primer acceso.
          </p>
        ) : (
          <div className="mt-8">
            <MagicLinkForm next="/admin" dark />
          </div>
        )}
      </div>
    </main>
  );
}
