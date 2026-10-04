import type { Metadata } from "next";
import { IconArrow } from "@/components/ui/Icons";
import Image from "next/image";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";
import { getReturnForCustomer, returnsSettings, formatAddress, RES_ES, RES_EN } from "@/lib/returns/service";
import { REASONS, STATUS_LABELS, fmtDate, type ReasonCode, type Resolution } from "@/lib/returns/rules";
import { PageHero, Container } from "@/components/ui/Section";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Estado de la devolución", robots: { index: false } };
export const dynamic = "force-dynamic";

const ORDER = ["SUBMITTED", "AWAITING_RETURN", "RECEIVED", "RESOLVED"];

export default async function ReturnStatusPage({ searchParams }: { searchParams: Promise<{ rma?: string; email?: string }> }) {
  const [sp, locale] = await Promise.all([searchParams, getLocale()]);
  const en = locale === "en";
  const L = en ? "en" : "es";
  const dl = en ? "en-GB" : "es-ES";
  const rma = (sp.rma ?? "").slice(0, 40);
  const email = (sp.email ?? "").slice(0, 200);
  const r = rma && email ? await getReturnForCustomer(rma, email).catch(() => null) : null;
  const rs = r?.type === "WITHDRAWAL" && ["AWAITING_RETURN", "APPROVED"].includes(r.status) ? await returnsSettings() : null;
  const addr = rs ? formatAddress(rs.address) : null;
  const order = r?.orders as unknown as { order_number: number; currency: string } | null;
  const st = r ? STATUS_LABELS[r.status] : null;
  const steps = r?.type === "WITHDRAWAL" ? ORDER : ["SUBMITTED", "APPROVED", "RESOLVED"];
  const idx = r ? Math.max(0, steps.indexOf(r.status === "NEED_INFO" ? "SUBMITTED" : r.status)) : 0;
  const tone = st?.tone === "ok" ? "bg-emerald-600 text-white" : st?.tone === "bad" ? "bg-fg text-bg" : st?.tone === "warn" ? "bg-gold text-[#0b0b0b]" : "bg-accent text-white";

  return (
    <>
      <PageHero eyebrow={en ? "Returns" : "Devoluciones"} title={en ? "Request status" : "Estado de tu solicitud"} />
      <section className="bg-bg pb-24 pt-10">
        <Container>
          <div className="mx-auto max-w-3xl">
            {!r ? (
              <form className="rounded-[22px] border border-line bg-surface-2 p-6 sm:p-8" method="get">
                {rma && email && <p className="mb-4 border-l-2 border-accent pl-3 text-sm text-accent">{en ? "No request found with those details." : "No encontramos ninguna solicitud con esos datos."}</p>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="eyebrow mb-2 block text-muted">{en ? "Reference" : "Referencia"}</span>
                    <input name="rma" required defaultValue={rma} placeholder="DEV-10001-AB12" className="field uppercase" />
                  </label>
                  <label className="block">
                    <span className="eyebrow mb-2 block text-muted">Email</span>
                    <input name="email" type="email" required defaultValue={email} className="field" />
                  </label>
                </div>
                <button className="btn btn-primary mt-6 px-8 py-4">{en ? "Check" : "Consultar"}<IconArrow className="ml-1.5 inline h-4 w-4 align-[-3px]" /></button>
                <p className="mt-6 text-sm text-muted">
                  {en ? "No request yet?" : "¿Aún no tienes solicitud?"}{" "}
                  <Link href="/returns/new" className="underline">
                    {en ? "Start a return" : "Solicitar devolución"}
                  </Link>
                </p>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-[#0b0b0b] p-6 text-[#f5f1e8]">
                  <div>
                    <p className="eyebrow text-[#e0b84a]">{en ? "Reference" : "Referencia"}</p>
                    <p className="font-mono text-2xl font-bold tracking-wider">{r.rma}</p>
                    <p className="mt-1 text-sm text-[#f5f1e8]/70">
                      {en ? "Order" : "Pedido"} #{order?.order_number} · {fmtDate(r.created_at, dl)}
                    </p>
                  </div>
                  <span className={`rounded-full px-4 py-2 text-sm font-bold ${tone}`}>{st?.[L]}</span>
                </div>

                {!["REJECTED", "CANCELLED"].includes(r.status) && (
                  <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0,1fr))` }}>
                    {steps.map((s, i) => (
                      <li key={s} className="text-center">
                        <span className={`block h-1.5 rounded-full ${i <= idx ? "bg-accent" : "bg-line"}`} />
                        <span className={`mt-2 block text-[11px] font-semibold uppercase tracking-wider ${i <= idx ? "text-fg" : "text-muted"}`}>{STATUS_LABELS[s][L].split(" — ")[0]}</span>
                      </li>
                    ))}
                  </ol>
                )}

                {r.customer_message && <p className="rounded-2xl border-l-4 border-gold bg-surface-2 px-5 py-4 text-sm whitespace-pre-line">{r.customer_message}</p>}

                {r.type === "WITHDRAWAL" && ["AWAITING_RETURN", "APPROVED"].includes(r.status) && (
                  <div className="rounded-[22px] border-2 border-gold p-6">
                    <p className="eyebrow text-gold">{en ? "Send the items" : "Envía los artículos"}</p>
                    <p className="mt-2 text-sm">
                      {en ? "Deadline" : "Fecha límite"}: <strong>{fmtDate(r.return_deadline, dl)}</strong> · {en ? "Return shipping is paid by you; use a tracked service and write the reference inside the parcel." : "El envío de vuelta corre de tu cuenta; usa un envío con seguimiento y escribe la referencia dentro del paquete."}
                    </p>
                    <p className="mt-4 whitespace-pre-line rounded-2xl bg-surface-2 p-4 text-sm font-medium">{addr ?? (en ? "We'll email you the return address shortly." : "Te enviaremos la dirección de devolución por email en breve.")}</p>
                  </div>
                )}

                <ul className="divide-y divide-line rounded-[22px] border border-line">
                  {(r.return_items as unknown as { quantity: number; reason: ReasonCode; order_items: { product_name: string; variant_name: string | null; image: string | null } }[]).map((it, i) => (
                    <li key={i} className="flex items-center gap-4 p-4">
                      <span className="relative aspect-square w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">{it.order_items?.image && <Image src={it.order_items.image} alt="" fill sizes="56px" className="object-cover" />}</span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block font-semibold">{it.order_items?.product_name}</span>
                        <span className="block text-muted">
                          {it.order_items?.variant_name ?? ""} × {it.quantity} · {REASONS[it.reason]?.[L]}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted">
                  {en ? "Chosen solution" : "Solución elegida"}: <strong className="text-fg">{r.resolution ? (en ? RES_EN : RES_ES)[r.resolution as Resolution] : "—"}</strong>
                  {r.refund_amount != null && order ? ` · ${formatMoney(Number(r.refund_amount), order.currency)}` : ""}
                </p>

                <div>
                  <p className="eyebrow mb-3 text-muted">{en ? "History" : "Historial"}</p>
                  <ol className="space-y-3 border-l-2 border-line pl-5">
                    {(r.return_events as unknown as { type: string; message: string | null; created_at: string; visible_to_customer: boolean }[])
                      .filter((e) => e.visible_to_customer)
                      .sort((a, b) => a.created_at.localeCompare(b.created_at))
                      .map((e, i) => (
                        <li key={i} className="relative text-sm">
                          <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-bg bg-accent" />
                          <span className="block text-xs text-muted">{new Date(e.created_at).toLocaleString(dl, { timeZone: "Europe/Madrid" })}</span>
                          {e.message}
                        </li>
                      ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
