import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { fulfillmentProviderFactory } from "@/lib/fulfillment/factory";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, Dot, PageTitle, SubmitButton } from "@/components/admin/ui";
import { healthCheckAction, registerWebhookAction, syncCatalogAction, toggleProviderAction } from "../../actions/providers";

export default async function ProvidersPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireStaff(["ADMIN"]);
  const { msg } = await searchParams;
  const sb = db();
  const [{ data: providers }, { data: caps }, { data: logs }, { data: errors }] = await Promise.all([
    sb.from("providers").select("*").order("id"),
    sb.from("provider_capabilities").select("*"),
    sb.from("provider_sync_logs").select("*").order("started_at", { ascending: false }).limit(10),
    sb.from("fulfillment_errors").select("provider, resolved").eq("resolved", false),
  ]);
  const counts = await Promise.all(
    (providers ?? []).map(async (p) => {
      const [{ count: total }, { count: eligible }, { count: approved }] = await Promise.all([
        sb.from("provider_products").select("id", { count: "exact", head: true }).eq("provider_id", p.id),
        sb.from("provider_products").select("id", { count: "exact", head: true }).eq("provider_id", p.id).eq("eligible", true),
        sb.from("provider_products").select("id", { count: "exact", head: true }).eq("provider_id", p.id).eq("review_status", "APPROVED"),
      ]);
      return { id: p.id, total: total ?? 0, eligible: eligible ?? 0, approved: approved ?? 0 };
    }),
  );

  return (
    <>
      <PageTitle
        title="Proveedores"
        sub="Capacidades verificadas en documentación oficial. Nada se publica automáticamente."
        actions={
          <form action={healthCheckAction}>
            <SubmitButton>Health check</SubmitButton>
          </form>
        }
      />
      {msg && <p className="mb-6 border-l-2 border-oro bg-white px-4 py-3 text-sm">{msg}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        {(providers ?? []).map((p) => {
          const impl = fulfillmentProviderFactory.has(p.id) ? fulfillmentProviderFactory.getProvider(p.id) : null;
          const c = counts.find((x) => x.id === p.id)!;
          const pcaps = (caps ?? []).filter((x) => x.provider_id === p.id);
          const webhookUrl = `${env.siteUrl()}/api/webhooks/${p.id}?token=•••`;
          return (
            <Card key={p.id} title={p.name}>
              <div className="flex flex-wrap items-center gap-3">
                <Dot status={p.health_status} />
                <span className="font-semibold">{p.health_status}</span>
                <Badge status={impl?.isConfigured() ? "ACTIVE" : "UNKNOWN"}>{impl?.isConfigured() ? "CONNECTED" : "API KEY MISSING"}</Badge>
                {!p.active && <Badge status="PAUSED">INACTIVO</Badge>}
                {!p.auto_routing_enabled && <Badge status="PAUSED">AUTO-ROUTING OFF</Badge>}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><dt className="text-xs text-stone">Última sync</dt><dd>{formatDateTime(p.last_sync_at)}</dd></div>
                <div><dt className="text-xs text-stone">Productos</dt><dd className="tabular-nums">{c.total}</dd></div>
                <div><dt className="text-xs text-stone">Elegibles</dt><dd className="tabular-nums">{c.eligible}</dd></div>
                <div><dt className="text-xs text-stone">Aprobados</dt><dd className="tabular-nums">{c.approved}</dd></div>
                <div><dt className="text-xs text-stone">Último webhook</dt><dd>{formatDateTime(p.last_webhook_at)}</dd></div>
                <div><dt className="text-xs text-stone">Errores abiertos</dt><dd className="tabular-nums">{(errors ?? []).filter((e) => e.provider === p.id).length}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {pcaps.map((cap) => (
                  <span key={cap.capability} title={cap.notes ?? ""} className={`rounded-sm px-2 py-0.5 text-[0.65rem] font-semibold ${cap.supported ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-500 line-through"}`}>
                    {cap.capability}
                  </span>
                ))}
              </div>
              <p className="mt-4 break-all text-xs text-stone">Webhook: {webhookUrl}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <form action={syncCatalogAction} className="flex items-center gap-2">
                  <input type="hidden" name="providerId" value={p.id} />
                  <SubmitButton variant="primary">Sync catalog</SubmitButton>
                </form>
                <Link href={`/admin/providers/${p.id}`} className="btn btn-ghost px-4 py-2.5 text-[0.62rem]">
                  Ver productos
                </Link>
                <Link href="/admin/fulfillment" className="btn btn-ghost px-4 py-2.5 text-[0.62rem]">
                  Ver errores
                </Link>
                <form action={registerWebhookAction}>
                  <input type="hidden" name="providerId" value={p.id} />
                  <SubmitButton variant="ghost">Registrar webhook</SubmitButton>
                </form>
                <form action={toggleProviderAction}>
                  <input type="hidden" name="providerId" value={p.id} />
                  <input type="hidden" name="field" value="auto_routing_enabled" />
                  <input type="hidden" name="value" value={String(!p.auto_routing_enabled)} />
                  <SubmitButton variant="ghost">{p.auto_routing_enabled ? "Pausar auto-routing" : "Activar auto-routing"}</SubmitButton>
                </form>
              </div>
            </Card>
          );
        })}
      </div>
      <Card title="Historial de sincronización" className="mt-6">
        <table className="admin-table">
          <thead>
            <tr><th>Proveedor</th><th>Estado</th><th>Stats</th><th>Error</th><th>Inicio</th></tr>
          </thead>
          <tbody>
            {(logs ?? []).map((l) => (
              <tr key={l.id}>
                <td>{l.provider_id}</td>
                <td><Badge status={l.status === "SUCCESS" ? "ACTIVE" : l.status === "FAILED" ? "FAILED" : "PENDING"}>{l.status}</Badge></td>
                <td className="font-mono text-xs">{JSON.stringify(l.stats)}</td>
                <td className="max-w-xs truncate text-xs text-rojo">{l.error}</td>
                <td className="text-xs">{formatDateTime(l.started_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
