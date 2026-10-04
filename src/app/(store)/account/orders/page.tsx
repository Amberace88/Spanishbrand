import type { Metadata } from "next";
import { getCurrentCustomer } from "@/lib/account";
import { getCustomerOrders } from "@/lib/account-data";
import { getLocale, getT } from "@/lib/i18n/server";
import { formatDate, formatMoney } from "@/lib/format";
import { dateLocale } from "@/components/club/ClubSections";
import { OrdersListView } from "@/components/account/panel/views";

export const metadata: Metadata = { title: "Mis pedidos", robots: { index: false } };

export default async function OrdersPage() {
  const [t, locale, { customer }] = await Promise.all([getT(), getLocale(), getCurrentCustomer()]);
  const dl = dateLocale(locale);
  const orders = await getCustomerOrders((customer?.id as string | undefined) ?? null);
  return (
    <OrdersListView
      t={t}
      orders={orders.map((o) => {
        const items = o.order_items ?? [];
        return {
          id: o.id,
          number: o.order_number,
          status: o.status,
          date: formatDate(o.created_at, dl),
          total: formatMoney(Number(o.total), o.currency, dl),
          itemCount: items.reduce((s, i) => s + Number(i.quantity || 1), 0),
          images: items.map((i) => i.image),
        };
      })}
    />
  );
}
