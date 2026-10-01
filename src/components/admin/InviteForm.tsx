"use client";
import { useActionState } from "react";
import { inviteMemberAction, type TeamState } from "@/app/admin/actions/team";

const ROLES: [string, string][] = [
  ["ADMIN", "Admin — productos, pedidos, proveedores, ajustes"],
  ["CONTENT_MANAGER", "Contenido — colecciones, contenido, IA"],
  ["CUSTOMER_SUPPORT", "Atención al cliente — pedidos y clientes"],
  ["ANALYST", "Analista — solo lectura de analítica"],
  ["SUPER_ADMIN", "Super admin — control total, incluido el equipo"],
];

export function InviteForm() {
  const [state, action, pending] = useActionState<TeamState, FormData>(inviteMemberAction, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_260px_auto]">
      <input name="email" type="email" required placeholder="email@empresa.com" className="border border-sand bg-white px-3 py-2.5 text-sm outline-none focus:border-ink" />
      <select name="role" defaultValue="CUSTOMER_SUPPORT" className="border border-sand bg-white px-3 py-2.5 text-sm">
        {ROLES.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <button disabled={pending} className="bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "…" : "Añadir / invitar"}
      </button>
      {state.message && <p className="text-sm text-emerald-700 sm:col-span-3">{state.message}</p>}
      {state.error && <p className="text-sm text-red-700 sm:col-span-3">{state.error}</p>}
    </form>
  );
}
