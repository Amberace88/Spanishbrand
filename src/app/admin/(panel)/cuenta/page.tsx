import { requireStaff } from "@/lib/auth/rbac";
import { getSessionUser } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { Card, PageTitle } from "@/components/admin/ui";
import { PasswordForm } from "@/components/account/PasswordForm";
import { signOutEverywhereAction } from "@/app/admin/actions/team";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const [staff, user, { reset }] = await Promise.all([requireStaff(["ADMIN", "ANALYST", "CUSTOMER_SUPPORT", "CONTENT_MANAGER"]), getSessionUser(), searchParams]);
  const hasPassword = Boolean(user?.user_metadata?.has_password);
  return (
    <>
      <PageTitle title="Mi cuenta" sub="Acceso, contraseña y sesiones" />
      {reset && <p className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-sm">Has entrado con el enlace de recuperación: crea ahora tu contraseña nueva.</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Perfil">
          <dl className="grid grid-cols-[120px_1fr] gap-y-3 text-sm">
            <dt className="text-stone-2">Email</dt>
            <dd className="font-medium">{staff.email}</dd>
            <dt className="text-stone-2">Roles</dt>
            <dd className="flex flex-wrap gap-1.5">
              {staff.roles.map((r) => (
                <span key={r} className="bg-ink px-2 py-0.5 text-[11px] font-semibold tracking-wide text-bone">
                  {r}
                </span>
              ))}
            </dd>
            <dt className="text-stone-2">Último acceso</dt>
            <dd>{user?.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : "—"}</dd>
            <dt className="text-stone-2">Método</dt>
            <dd>{hasPassword ? "Contraseña + enlace por email" : "Solo enlace por email"}</dd>
          </dl>
        </Card>
        <Card title={hasPassword ? "Cambiar contraseña" : "Crear contraseña"}>
          <PasswordForm hasPassword={hasPassword} admin />
        </Card>
        <Card title="Sesiones">
          <p className="text-sm text-stone-600">¿Has entrado desde un ordenador ajeno o has perdido el móvil? Cierra la sesión en todos los dispositivos. Tendrás que volver a entrar aquí.</p>
          <form action={signOutEverywhereAction} className="mt-4">
            <button className="border border-rojo px-4 py-2 text-sm font-semibold text-rojo hover:bg-rojo hover:text-white">Cerrar sesión en todos los dispositivos</button>
          </form>
        </Card>
        <Card title="Buenas prácticas">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-stone-600">
            <li>Usa una contraseña única de 14+ caracteres (un gestor de contraseñas ayuda).</li>
            <li>El enlace por email siempre funciona como alternativa: no te quedarás fuera.</li>
            <li>Da a cada persona su propio acceso en «Equipo» con el rol mínimo necesario.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
