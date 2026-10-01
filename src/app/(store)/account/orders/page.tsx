import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentCustomer } from "@/lib/account";
import { db } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n/server";
import { formatDate, formatMoney } from "@/lib/format";
import type { TKey } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = { title: "Mis pedidos", robots: { index: false } };

export default async function OrdersPage() {
  const [t, { customer }] = await Promise.all([getT(), getCurrentCustomer()]);
  const { data: orders } = customer
    ? await db().from("orders").select("id, order_number, status, total, currency, created_at").eq("customer_id", customer.id).neq("status", "PENDING_PAYMENT").order("created_at", { ascending: false })
    : { data: [] };

  if (!orders?.length) return <p className="text-xl text-stone-2">{t("account.noOrders")}</p>;
  return (
    <ul className="divide-y divide-ink/10 border-y border-ink/10">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/account/orders/${o.id}`} className="grid grid-cols-2 items-center gap-4 py-5 hover:bg-bone sm:grid-cols-4">
            <span className="headline text-2xl">#{o.order_number}</span>
            <span className="text-sm text-stone-2">{formatDate(o.created_at)}</span>
            <span className="eyebrow text-[0.62rem]">{t(`status.${o.status}` as TKey)}</span>
            <span className="text-right tabular-nums">{formatMoney(Number(o.total), o.currency)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
