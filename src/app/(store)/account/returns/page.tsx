import type { Metadata } from "next";
import { getCurrentCustomer } from "@/lib/account";
import { getCustomerOrders } from "@/lib/account-data";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getLocale, getT } from "@/lib/i18n/server";
import { formatDate } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/returns/rules";
import { dateLocale } from "@/components/club/ClubSections";
import { ReturnsView, type ReturnRow } from "@/components/account/panel/views";

export const metadata: Metadata = { title: "Devoluciones", robots: { index: false } };

/** The customer's return / issue requests (linked through their own orders) + entry to the existing returns flow. */
export default async function AccountReturns() {
  const [t, locale, { user, customer }] = await Promise.all([getT(), getLocale(), getCurrentCustomer()]);
  const dl = dateLocale(locale);
  const orders = await getCustomerOrders((customer?.id as string | undefined) ?? null);
  const sb = dbOrNull();
  const { data } =
    sb && orders.length
      ? await sb
          .from("return_requests")
          .select("rma, type, status, created_at, customer_email, orders(order_number)")
          .eq("brand_id", env.brandId())
          .in("order_id", orders.map((o) => o.id))
          .order("created_at", { ascending: false })
      : { data: [] };
  const email = (user?.email ?? "").toLowerCase();
  type Raw = { rma: string; type: string; status: string; created_at: string; customer_email: string; orders: { order_number: number } | { order_number: number }[] | null };
  const rows: ReturnRow[] = ((data ?? []) as unknown as Raw[]).map((r) => {
    const lab = STATUS_LABELS[r.status] ?? { es: r.status, en: r.status, tone: "info" as const };
    const ord = Array.isArray(r.orders) ? r.orders[0] : r.orders;
    return {
      rma: r.rma,
      orderNumber: ord?.order_number ?? null,
      type: r.type,
      status: r.status,
      statusLabel: locale === "es" || locale === "ca" || locale === "eu" || locale === "gl" ? lab.es : lab.en,
      tone: lab.tone,
      date: formatDate(r.created_at, dl),
      href: `/returns/status?rma=${encodeURIComponent(r.rma)}&email=${encodeURIComponent(String(r.customer_email || email))}`,
    };
  });
  return <ReturnsView t={t} rows={rows} />;
}
