import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { Card, PageTitle } from "@/components/admin/ui";
import { InviteForm } from "@/components/admin/InviteForm";
import { removeRoleAction } from "@/app/admin/actions/team";

export const dynamic = "force-dynamic";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const [staff, { e }] = await Promise.all([requireStaff(["ADMIN"]), searchParams]);
  const sb = db();
  const { data: rows } = await sb.from("user_roles").select("user_id, role, created_at").eq("brand_id", env.brandId()).order("created_at");
  const ids = [...new Set((rows ?? []).map((r) => r.user_id))];
  const { data: profiles } = ids.length ? await sb.from("profiles").select("id, email, full_name").in("id", ids) : { data: [] };
  const users = await Promise.all(ids.map(async (id) => (await sb.auth.admin.getUserById(id)).data.user));
  const members = ids.map((id) => {
    const p = profiles?.find((x) => x.id === id);
    const u = users.find((x) => x?.id === id);
    return { id, email: p?.email ?? u?.email ?? id, name: p?.full_name ?? null, roles: (rows ?? []).filter((r) => r.user_id === id), lastSignIn: u?.last_sign_in_at ?? null, confirmed: Boolean(u?.email_confirmed_at) };
  });
  const isSuper = staff.roles.includes("SUPER_ADMIN");

  return (
    <>
      <PageTitle title="Equipo" sub="Quién puede entrar en el panel y qué puede hacer" />
      {e === "last" && <p className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-sm">No puedes quitar el último SUPER_ADMIN.</p>}
      {e === "perm" && <p className="mb-6 border-l-2 border-rojo bg-white px-4 py-3 text-sm">Solo un SUPER_ADMIN puede gestionar ese rol.</p>}
      <Card title="Añadir miembro" className="mb-6">
        <p className="mb-4 text-sm text-stone-600">Si el email ya tiene cuenta, recibe el rol al instante. Si no, le enviamos una invitación por email; al aceptarla entra en «Mi cuenta» y puede crear su contraseña.</p>
        <InviteForm />
      </Card>
      <Card title={`Miembros (${members.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-sand text-[11px] uppercase tracking-wider text-stone-2">
              <tr>
                <th className="py-2 pr-4">Persona</th>
                <th className="py-2 pr-4">Roles</th>
                <th className="py-2 pr-4">Último acceso</th>
                <th className="py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-sand/60 align-top">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{m.email}</p>
                    {m.name && <p className="text-xs text-stone-2">{m.name}</p>}
                    {m.id === staff.userId && <p className="text-xs text-oro">tú</p>}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1.5">
                      {m.roles.map((r) => (
                        <form key={r.role} action={removeRoleAction} className="flex items-center gap-1 bg-[#f1ece2] px-2 py-0.5 text-[11px] font-semibold">
                          <input type="hidden" name="userId" value={m.id} />
                          <input type="hidden" name="role" value={r.role} />
                          {r.role}
                          {(r.role !== "SUPER_ADMIN" || isSuper) && (
                            <button title="Quitar rol" className="ml-1 text-rojo hover:font-bold">
                              ×
                            </button>
                          )}
                        </form>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-stone-600">{m.lastSignIn ? formatDateTime(m.lastSignIn) : "Nunca"}</td>
                  <td className="py-3">{m.confirmed ? <span className="text-emerald-700">Activo</span> : <span className="text-amber-700">Invitación pendiente</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
