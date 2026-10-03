import { getLocale, getT } from "@/lib/i18n/server";
import { getCurrentCustomer } from "@/lib/account";
import { dbOrNull } from "@/lib/supabase/admin";
import { joinClubAction, redeemPointsAction } from "@/app/actions/growth";
import { lifetimePoints } from "@/lib/club";
import type { TKey } from "@/lib/i18n/dictionaries";
import { ClubDashboard, type LedgerRow } from "@/components/club/ClubDashboard";

export const dynamic = "force-dynamic";

export default async function AccountHome({ searchParams }: { searchParams: Promise<{ club?: string; redeem?: string }> }) {
  const [{ club, redeem }, locale, t, { user, customer }] = await Promise.all([searchParams, getLocale(), getT(), getCurrentCustomer()]);
  const sb = dbOrNull();
  const isMember = Boolean(customer?.member_number);
  const balance = Number(customer?.points ?? 0);

  const [ledgerRes, lastOrderRes] = await Promise.all([
    isMember && sb
      ? sb.from("points_ledger").select("id, points, reason, created_at, orders(order_number)").eq("customer_id", customer!.id).order("created_at", { ascending: false }).limit(1000)
      : Promise.resolve({ data: null }),
    customer && sb
      ? sb.from("orders").select("id, order_number, status, created_at", { count: "exact" }).eq("customer_id", customer.id).neq("status", "PENDING_PAYMENT").order("created_at", { ascending: false }).limit(1)
      : Promise.resolve({ data: null, count: 0 }),
  ]);

  type Raw = { id: string; points: number; reason: string; created_at: string; orders: { order_number: number | string } | { order_number: number | string }[] | null };
  const rows = ((ledgerRes.data ?? []) as unknown as Raw[]);
  const ledger: LedgerRow[] = rows.slice(0, 8).map((r) => ({
    id: r.id,
    date: r.created_at,
    reason: r.reason,
    points: Number(r.points),
    orderNumber: Array.isArray(r.orders) ? r.orders[0]?.order_number : r.orders?.order_number,
  }));
  const last = (lastOrderRes.data ?? [])[0] as { id: string; order_number: number; status: string; created_at: string } | undefined;
  const name = ((customer?.name as string | null) ?? "").trim();

  return (
    <ClubDashboard
      locale={locale}
      email={user?.email ?? ""}
      member={
        isMember
          ? {
              number: String(customer!.member_number).padStart(6, "0"),
              name: name || user?.email || "",
              firstName: name ? name.split(/\s+/)[0] : null,
              since: (customer!.member_since as string | null) ?? null,
              points: balance,
              lifetime: lifetimePoints(rows, balance),
            }
          : null
      }
      flags={{ welcome: Boolean(club), code: redeem && redeem !== "insufficient" ? redeem : null, insufficient: redeem === "insufficient" }}
      ledger={ledger}
      orders={{
        count: ("count" in lastOrderRes ? lastOrderRes.count : 0) ?? 0,
        last: last ? { number: last.order_number, status: t(`status.${last.status}` as TKey), date: last.created_at, href: `/account/orders/${last.id}` } : null,
      }}
      joinAction={joinClubAction}
      redeemAction={redeemPointsAction}
    />
  );
}
