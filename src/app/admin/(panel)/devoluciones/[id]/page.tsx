import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Badge, Card, Field, PageTitle, SubmitButton, inputCls } from "@/components/admin/ui";
import { CopyButton } from "@/components/admin/CopyButton";
import { providerClaimAction, updateReturnAction } from "@/app/admin/actions/returns";
import { PHOTO_KINDS, REASONS, STATUS_LABELS, fmtDate, type PhotoKind, type ReasonCode, type Resolution } from "@/lib/returns/rules";
import { RES_ES, signedPhotoUrls } from "@/lib/returns/service";

export const dynamic = "force-dynamic";

const PROVIDER_DASH: Record<string, { name: string; url: string; help: string }> = {
  printful: { name: "Printful", url: "https://www.printful.com/dashboard/default/orders", help: "Pedidos → abre el pedido → «Report a problem». Plazo: 30 días desde la entrega." },
  printify: { name: "Printify", url: "https://printify.com/app/orders", help: "Orders → pedido → «Report an issue» con fotos. Plazo: 30 días desde la entrega." },
  gelato: { name: "Gelato", url: "https://dashboard.gelato.com/orders", help: "Orders → pedido → «Report a problem». Plazo: 30 días desde la recepción." },
  prodigi: { name: "Prodigi", url: "https://dashboard.prodigi.com/orders", help: "Orders → pedido → Support / contacta con soporte con las fotos." },
};
const DECL_ES: Record<string, string> = {
  truthful: "Fotos e información veraces",
  keep_item: "Conserva el artículo hasta resolver",
  withdraw: "Declaración de desistimiento (art. 106)",
  return_cost: "Asume costes de devolución (art. 108.1)",
  return_deadline: "Enviará en 14 días",
  condition: "Acepta descuento por depreciación (art. 108.2)",
  privacy: "Acepta tratamiento de datos",
};
const REASON_EN: Record<string, string> = { PRINT_DEFECT: "Print / manufacturing defect", DAMAGED: "Damaged in transit", WRONG_ITEM: "Wrong product, size or colour", MISSING_ITEM: "Missing item" };

export default async function ReturnDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  await requireStaff(["ADMIN", "CUSTOMER_SUPPORT"]);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const sb = db();
  const { data: r } = await sb
    .from("return_requests")
    .select("*, orders(id, order_number, total, currency, customer_name, shipping_address, created_at), return_items(id, quantity, reason, personalized, details, order_items(product_name, variant_name, sku, image, unit_price, quantity)), return_photos(id, path, kind, created_at), return_events(id, type, message, visible_to_customer, actor_email, created_at)")
    .eq("id", id)
    .eq("brand_id", env.brandId())
    .maybeSingle();
  if (!r) notFound();
  const order = r.orders as unknown as { id: string; order_number: number; total: number; currency: string; customer_name: string | null; created_at: string };
  const items = r.return_items as unknown as { id: string; quantity: number; reason: ReasonCode; personalized: boolean; details: string | null; order_items: { product_name: string; variant_name: string | null; sku: string | null; image: string | null; unit_price: number; quantity: number } }[];
  const photos = (r.return_photos as { id: string; path: string; kind: PhotoKind }[]) ?? [];
  const events = ((r.return_events as { id: string; type: string; message: string | null; visible_to_customer: boolean; actor_email: string | null; created_at: string }[]) ?? []).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const [view, share] = await Promise.all([signedPhotoUrls(photos.map((p) => p.path), 3600), signedPhotoUrls(photos.map((p) => p.path), 7 * 86_400)]);
  const { data: fos } = await sb.from("fulfillment_orders").select("provider_id, provider_order_id, status, delivered_at, shipped_at").eq("order_id", order.id);
  const claim = (r.provider_claim ?? {}) as { status?: string; ref?: string; recovered_amount?: number; resolution?: string; submitted_at?: string };
  const dash = r.provider_id ? PROVIDER_DASH[r.provider_id] : null;
  const contact = r.contact as { name?: string; phone?: string };
  const address = r.address as Record<string, string> | null;
  const decl = (r.declarations ?? {}) as Record<string, string>;
  const pdDays = r.provider_deadline ? Math.ceil((new Date(r.provider_deadline).getTime() - Date.now()) / 86_400_000) : null;
  const itemsValue = items.reduce((a, i) => a + Number(i.order_items.unit_price) * i.quantity, 0);

  const pack = [
    `Order issue report — ${r.rma}`,
    `Provider order ID: ${r.provider_order_id ?? (fos ?? []).map((f) => `${f.provider_id}:${f.provider_order_id}`).join(", ")}`,
    `Store order: #${order.order_number} (placed ${fmtDate(order.created_at, "en-GB")}${r.delivered_at ? `, delivered ${fmtDate(r.delivered_at, "en-GB")}` : ""})`,
    "",
    "Affected items:",
    ...items.map((i) => `- ${i.order_items.product_name}${i.order_items.variant_name ? ` (${i.order_items.variant_name})` : ""}${i.order_items.sku ? ` [SKU ${i.order_items.sku}]` : ""} × ${i.quantity} — ${REASON_EN[i.reason] ?? i.reason}${i.details ? `: ${i.details}` : ""}`),
    "",
    `Customer description: ${r.description ?? ""}`,
    "",
    `Photos (${photos.length}):`,
    ...photos.map((p, k) => `${k + 1}. ${PHOTO_KINDS[p.kind]?.en ?? p.kind}: ${share.get(p.path) ?? ""}`),
    "",
    `Requested: ${r.resolution === "REFUND" ? "refund" : "free reprint"} to the original shipping address.`,
  ].join("\n");

  return (
    <>
      <PageTitle
        title={r.rma}
        sub={`${r.type === "ISSUE" ? "Incidencia con el producto" : "Desistimiento"} · pedido #${order.order_number} · ${formatDateTime(r.created_at)}`}
        actions={
          <>
            <Link href={`/admin/orders/${order.id}`} className="btn btn-ghost px-4 py-2.5 text-[0.62rem]">
              Abrir pedido (reembolso)
            </Link>
            <Link href="/admin/devoluciones" className="btn btn-ghost px-4 py-2.5 text-[0.62rem]">
              ← Todas
            </Link>
          </>
        }
      />
      {sp.msg && <p className="mb-6 border-l-2 border-oro bg-white px-4 py-3 text-sm">{sp.msg}</p>}

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <Badge status={r.status === "RESOLVED" ? "DELIVERED" : r.status === "REJECTED" ? "REJECTED" : "REQUIRES_REVIEW"}>{STATUS_LABELS[r.status]?.es}</Badge>
        <span>Solución pedida: <strong>{r.resolution ? RES_ES[r.resolution as Resolution] : "—"}</strong>{r.exchange_note ? ` · ${r.exchange_note}` : ""}</span>
        {r.delivered_at && <span className="text-stone-2">Entregado: {fmtDate(r.delivered_at)}</span>}
        {r.type === "WITHDRAWAL" && r.withdrawal_deadline && <span className="text-stone-2">Fin desistimiento: {fmtDate(r.withdrawal_deadline)}</span>}
        {r.type === "WITHDRAWAL" && r.return_deadline && <span className="text-stone-2">Cliente debe enviar antes de: {fmtDate(r.return_deadline)}</span>}
        {r.type === "ISSUE" && pdDays != null && <span className={pdDays <= 5 ? "font-bold text-rojo" : "text-stone-2"}>Plazo reclamación proveedor: {pdDays > 0 ? `${pdDays} días` : "vencido"}</span>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card title="Artículos">
            <ul className="divide-y divide-sand">
              {items.map((i) => (
                <li key={i.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.order_items.image ? <img src={i.order_items.image} alt="" className="h-16 w-16 shrink-0 object-cover" /> : <span className="h-16 w-16 shrink-0 bg-stone-100" />}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold">
                      {i.order_items.product_name} {i.personalized && <Badge status="PAUSED">Personalizado</Badge>}
                    </p>
                    <p className="text-stone-2">
                      {i.order_items.variant_name ?? ""} · {i.quantity} de {i.order_items.quantity} · {formatMoney(Number(i.order_items.unit_price), order.currency)}/ud
                    </p>
                    <p className="mt-1">
                      <strong>{REASONS[i.reason]?.es}</strong>
                      {i.details ? ` — ${i.details}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-sand pt-3 text-sm">
              Valor de los artículos: <strong>{formatMoney(itemsValue, order.currency)}</strong> · Total del pedido: {formatMoney(Number(order.total), order.currency)}
            </p>
          </Card>

          <Card title="Descripción del cliente">
            <p className="whitespace-pre-line text-sm">{r.description}</p>
            <dl className="mt-4 grid gap-2 border-t border-sand pt-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-stone-2">Nombre</dt><dd>{contact?.name}</dd></div>
              <div><dt className="text-xs text-stone-2">Email</dt><dd>{r.customer_email}</dd></div>
              <div><dt className="text-xs text-stone-2">Teléfono</dt><dd>{contact?.phone ?? "—"}</dd></div>
              {address && <div><dt className="text-xs text-stone-2">Dirección (reposición/cambio)</dt><dd>{[address.line1, address.line2, address.postalCode, address.city, address.province].filter(Boolean).join(", ")}</dd></div>}
            </dl>
          </Card>

          <Card title={`Fotos (${photos.length})`}>
            {photos.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photos.map((p) => (
                  <a key={p.id} href={view.get(p.path)} target="_blank" rel="noreferrer" className="group block border border-sand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={view.get(p.path)} alt={PHOTO_KINDS[p.kind]?.es} className="aspect-square w-full object-cover transition-opacity group-hover:opacity-90" />
                    <span className="block px-2 py-1.5 text-xs">{PHOTO_KINDS[p.kind]?.es ?? p.kind}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-2">Sin fotos.</p>
            )}
          </Card>

          <Card title="Declaraciones aceptadas (prueba)">
            <ul className="space-y-1.5 text-sm">
              {Object.entries(decl).map(([k, at]) => (
                <li key={k} className="flex justify-between gap-4">
                  <span>✓ {DECL_ES[k] ?? k}</span>
                  <span className="text-xs text-stone-2">{formatDateTime(at)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-stone-2">
              IP {String(r.ip ?? "—")} · {String(r.user_agent ?? "").slice(0, 90)}
            </p>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Gestionar">
            <form action={updateReturnAction} className="space-y-4">
              <input type="hidden" name="id" value={r.id} />
              <Field label="Estado">
                <select name="status" defaultValue={r.status} className={inputCls}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.es}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Mensaje al cliente (email + página de estado)" hint="Opcional. Ej.: qué foto falta, aprobación, número de reposición…">
                <textarea name="customer_message" rows={3} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Importe reembolsado (€)">
                  <input name="refund_amount" inputMode="decimal" defaultValue={r.refund_amount ?? ""} className={inputCls} />
                </Field>
                <Field label="Descuento depreciación (€)" hint="Art. 108.2">
                  <input name="deduction_amount" inputMode="decimal" defaultValue={r.deduction_amount ?? ""} className={inputCls} />
                </Field>
              </div>
              <Field label="Seguimiento del envío del cliente">
                <input name="return_tracking" defaultValue={r.return_tracking ?? ""} className={inputCls} />
              </Field>
              <Field label="Notas internas">
                <textarea name="admin_notes" rows={2} defaultValue={r.admin_notes ?? ""} className={inputCls} />
              </Field>
              <Field label="Añadir nota al historial (interna)">
                <input name="internal_event" className={inputCls} />
              </Field>
              <SubmitButton variant="primary">Guardar</SubmitButton>
              <p className="text-xs text-stone-2">El reembolso con tarjeta se hace en el pedido («Abrir pedido»). Vales +10 %: crea la tarjeta regalo en Tarjetas regalo y envía el código en el mensaje.</p>
            </form>
          </Card>

          {r.type === "ISSUE" && (
            <Card title="Reclamación al proveedor">
              <p className="text-sm">
                Proveedor: <strong>{dash?.name ?? r.provider_id ?? "—"}</strong> · pedido proveedor <span className="font-mono">{r.provider_order_id ?? "—"}</span>
              </p>
              {dash && <p className="mt-1 text-xs text-stone-2">{dash.help}</p>}
              <p className="mt-2 text-xs text-stone-2">Los proveedores no tienen API de reclamaciones: copia este informe (con enlaces a las fotos válidos 7 días) y pégalo en su panel.</p>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap border border-sand bg-[#faf7f1] p-3 text-[11px] leading-relaxed">{pack}</pre>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton text={pack} label="Copiar informe" />
                {dash && (
                  <a href={dash.url} target="_blank" rel="noreferrer" className="btn btn-ghost px-4 py-2.5 text-[0.62rem]">
                    Abrir {dash.name} ↗
                  </a>
                )}
              </div>
              <form action={providerClaimAction} className="mt-5 space-y-3 border-t border-sand pt-4">
                <input type="hidden" name="id" value={r.id} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Estado">
                    <select name="claim_status" defaultValue={claim.status ?? "NOT_SUBMITTED"} className={inputCls}>
                      <option value="NOT_SUBMITTED">Sin enviar</option>
                      <option value="SUBMITTED">Enviada</option>
                      <option value="APPROVED">Aceptada</option>
                      <option value="REJECTED">Rechazada</option>
                    </select>
                  </Field>
                  <Field label="Ref. del proveedor">
                    <input name="claim_ref" defaultValue={claim.ref ?? ""} className={inputCls} />
                  </Field>
                  <Field label="Resolución">
                    <select name="claim_resolution" defaultValue={claim.resolution ?? ""} className={inputCls}>
                      <option value="">—</option>
                      <option value="REPRINT">Reimpresión gratis</option>
                      <option value="REFUND">Reembolso</option>
                    </select>
                  </Field>
                  <Field label="Recuperado (€)">
                    <input name="recovered_amount" inputMode="decimal" defaultValue={claim.recovered_amount ?? ""} className={inputCls} />
                  </Field>
                </div>
                <SubmitButton>Guardar reclamación</SubmitButton>
                {claim.submitted_at && <p className="text-xs text-stone-2">Enviada: {formatDateTime(claim.submitted_at)}</p>}
              </form>
            </Card>
          )}

          <Card title="Historial">
            <ol className="space-y-3 text-sm">
              {events.map((e) => (
                <li key={e.id} className="border-l-2 border-sand pl-3">
                  <p className="text-xs text-stone-2">
                    {formatDateTime(e.created_at)} · {e.actor_email ?? "cliente/sistema"} · {e.visible_to_customer ? "visible al cliente" : "interno"}
                  </p>
                  <p>{e.message ?? e.type}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
