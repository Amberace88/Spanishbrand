import type { Metadata } from "next";
import { getLocale, getT } from "@/lib/i18n/server";
import { getCurrentCustomer } from "@/lib/account";
import { getClubLedger, getCustomerOrders } from "@/lib/account-data";
import { joinClubAction, redeemPointsAction } from "@/app/actions/growth";
import type { TKey } from "@/lib/i18n/dictionaries";
import { ClubDashboard, type LedgerRow } from "@/components/club/ClubDashboard";

export const metadata: Metadata = { title: "Mi club", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Club area (points, tier, redeem): the existing club dashboard inside the account shell. */
export default async function AccountClub({ searchParams }: { searchParams: Promise<{ club?: string; redeem?: string }> }) {
  const [{ club, redeem }, locale, t, { user, customer }] = await Promise.all([searchParams, getLocale(), getT(), getCurrentCustomer()]);
  const isMember = Boolean(customer?.member_number);
  const balance = Number(customer?.points ?? 0);
  const customerId = (customer?.id as string | undefined) ?? null;

  const [{ rows, lifetime }, orders] = await Promise.all([isMember ? getClubLedger(customerId, balance) : Promise.resolve({ rows: [], lifetime: 0 }), getCustomerOrders(customerId)]);
  const ledger: LedgerRow[] = rows.slice(0, 8).map((r) => ({
    id: r.id,
    date: r.created_at,
    reason: r.reason,
    points: Number(r.points),
    orderNumber: Array.isArray(r.orders) ? r.orders[0]?.order_number : r.orders?.order_number,
  }));
  const last = orders[0];
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
              lifetime,
            }
          : null
      }
      flags={{ welcome: Boolean(club), code: redeem && redeem !== "insufficient" ? redeem : null, insufficient: redeem === "insufficient" }}
      ledger={ledger}
      orders={{
        count: orders.length,
        last: last ? { number: last.order_number, status: t(`status.${last.status}` as TKey), date: last.created_at, href: `/account/orders/${last.id}` } : null,
      }}
      joinAction={joinClubAction}
      redeemAction={redeemPointsAction}
    />
  );
}
