import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentCustomer } from "@/lib/account";
import { getOrderEvents } from "@/lib/account-data";
import { canRequestReturn, isReorderable, orderStepDates, ORDER_STEPS } from "@/lib/account-panel";
import { db } from "@/lib/supabase/admin";
import { getLocale, getT } from "@/lib/i18n/server";
import { formatDate, formatMoney } from "@/lib/format";
import { reorderAction } from "@/app/actions/account";
import { dateLocale } from "@/components/club/ClubSections";
import { OrderDetailView, type OrderDetail } from "@/components/account/panel/views";

export const metadata: Metadata = { title: "Pedido", robots: { index: false } };

type Item = { product_name: string; variant_name: string | null; quantity: number; total: number; image: string | null; personalization: unknown };
type Ship = { carrier: string | null; tracking_number: string | null; tracking_url: string | null; estimated_delivery_max: string | null };

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ reorder?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [t, locale, { customer }] = await Promise.all([getT(), getLocale(), getCurrentCustomer()]);
  if (!customer || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  // Ownership enforced server-side: order must belong to the signed-in customer.
  const { data: o } = await db()
    .from("orders")
    .select("id, order_number, status, total, subtotal, shipping, discount, tax, currency, created_at, paid_at, shipping_address, tracking_number, tracking_url, carrier, order_items(product_name, variant_name, quantity, total, image, personalization), shipments(carrier, tracking_number, tracking_url, status, shipped_at, estimated_delivery_min, estimated_delivery_max)")
    .eq("id", id)
    .eq("customer_id", customer.id)
    .maybeSingle();
  if (!o) notFound();
  const dl = dateLocale(locale);
  const money = (v: unknown) => formatMoney(Number(v ?? 0), o.currency, dl);
  const raw = orderStepDates(await getOrderEvents(o.id), o);
  const items = (o.order_items ?? []) as Item[];
  let shipments = ((o.shipments ?? []) as Ship[]).map((s) => ({ carrier: s.carrier, number: s.tracking_number, url: s.tracking_url, eta: s.estimated_delivery_max ? formatDate(s.estimated_delivery_max, dl) : null }));
  // single-provider orders may carry tracking on the order itself
  if (!shipments.length && (o.tracking_number || o.tracking_url)) shipments = [{ carrier: o.carrier, number: o.tracking_number, url: o.tracking_url, eta: null }];

  const detail: OrderDetail = {
    id: o.id,
    number: o.order_number,
    status: o.status,
    date: formatDate(o.created_at, dl),
    stepDates: Object.fromEntries(ORDER_STEPS.filter((s) => raw[s]).map((s) => [s, formatDate(raw[s], dl)])),
    items: items.map((i) => ({ name: i.product_name, variant: i.variant_name, quantity: i.quantity, total: money(i.total), image: i.image })),
    totals: { subtotal: money(o.subtotal), discount: Number(o.discount) > 0 ? money(o.discount) : null, shipping: money(o.shipping), total: money(o.total), tax: money(o.tax) },
    address: o.shipping_address as OrderDetail["address"],
    shipments,
    returnHref: canRequestReturn(o.status) ? `/returns/new?order=${o.order_number}&email=${encodeURIComponent((customer.email as string) ?? "")}` : null,
    reorderable: items.some(isReorderable),
  };
  return <OrderDetailView t={t} o={detail} reorderAction={reorderAction} reorderNone={sp.reorder === "none"} />;
}
