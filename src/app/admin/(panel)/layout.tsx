import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession, hasRole, type StaffRole } from "@/lib/auth/rbac";
import { isConfigured } from "@/lib/env";
import { getBrand } from "@/lib/brand";
import { Wordmark } from "@/components/brand/Wordmark";
import { signOutAction } from "@/app/actions/account";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NAV: { href: string; label: string; roles: StaffRole[] }[] = [
  { href: "/admin", label: "Dashboard", roles: ["ADMIN", "ANALYST", "CUSTOMER_SUPPORT", "CONTENT_MANAGER"] },
  { href: "/admin/orders", label: "Pedidos", roles: ["ADMIN", "CUSTOMER_SUPPORT"] },
  { href: "/admin/fulfillment", label: "Fulfillment", roles: ["ADMIN", "CUSTOMER_SUPPORT"] },
  { href: "/admin/products", label: "Productos", roles: ["ADMIN", "CONTENT_MANAGER"] },
  { href: "/admin/catalogo", label: "Constructor de catálogo", roles: ["ADMIN"] },
  { href: "/admin/providers", label: "Proveedores", roles: ["ADMIN"] },
  { href: "/admin/collections", label: "Colecciones", roles: ["ADMIN", "CONTENT_MANAGER"] },
  { href: "/admin/drops", label: "Drops", roles: ["ADMIN", "CONTENT_MANAGER"] },
  { href: "/admin/customers", label: "Clientes (CRM)", roles: ["ADMIN", "CUSTOMER_SUPPORT"] },
  { href: "/admin/content", label: "Content Studio", roles: ["ADMIN", "CONTENT_MANAGER"] },
  { href: "/admin/ai", label: "AI Creator", roles: ["ADMIN", "CONTENT_MANAGER", "ANALYST"] },
  { href: "/admin/analytics", label: "Analítica", roles: ["ADMIN", "ANALYST"] },
  { href: "/admin/creators", label: "Creadores", roles: ["ADMIN"] },
  { href: "/admin/b2b", label: "Empresas / B2B", roles: ["ADMIN", "CUSTOMER_SUPPORT"] },
  { href: "/admin/causas", label: "Causas solidarias", roles: ["ADMIN"] },
  { href: "/admin/community", label: "Comunidad", roles: ["ADMIN", "CONTENT_MANAGER"] },
  { href: "/admin/settings", label: "Ajustes", roles: ["ADMIN"] },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!isConfigured.db() || !isConfigured.auth()) {
    return (
      <main className="force-light flex min-h-dvh items-center justify-center bg-warm p-6">
        <div className="max-w-lg border border-sand bg-white p-8">
          <h1 className="display text-4xl">Configuración pendiente</h1>
          <p className="mt-3 text-sm text-stone-2">Añade NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY en las variables de entorno para activar el panel.</p>
        </div>
      </main>
    );
  }
  const staff = await getStaffSession();
  if (!staff) redirect("/admin/login");
  const brand = await getBrand();
  const nav = NAV.filter((n) => hasRole(staff, n.roles));

  return (
    <div className="force-light min-h-dvh bg-[#f7f3ec] text-ink lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="bg-ink text-bone lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/admin">
            <Wordmark name={brand.name} className="text-sm" />
          </Link>
          <Link href="/" className="text-[0.6rem] uppercase tracking-widest text-bone/50 hover:text-bone">
            Tienda ↗
          </Link>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="shrink-0 rounded-sm px-3 py-2 text-[0.8rem] text-bone/75 hover:bg-bone/10 hover:text-bone">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-bone/10 px-5 py-4 text-xs text-bone/50 lg:block">
          <p className="truncate">{staff.email}</p>
          <p className="mt-1">{staff.roles.join(", ")}</p>
          <form action={signOutAction} className="mt-3">
            <button className="underline hover:text-bone">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 p-4 sm:p-8">{children}</main>
    </div>
  );
}
