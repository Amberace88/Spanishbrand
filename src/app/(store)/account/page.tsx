import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getT } from "@/lib/i18n/server";
import { getCurrentCustomer } from "@/lib/account";
import { getClubLedger, getCustomerOrders, getOrderEvents, getRecommendations } from "@/lib/account-data";
import { greetingName, orderStepDates, ORDER_STEPS } from "@/lib/account-panel";
import { REDEEM_VALUE, SIGNUP_POINTS, redeemProgress, tierProgress } from "@/lib/club";
import { formatDate, formatMoney } from "@/lib/format";
import { joinClubAction } from "@/app/actions/growth";
import { dateLocale, tierName } from "@/components/club/ClubSections";
import { DashboardView, type DashClub, type DashLastOrder } from "@/components/account/panel/views";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountHome({ searchParams }: { searchParams: Promise<{ club?: string; redeem?: string }> }) {
  const sp = await searchParams;
  // club join / redeem results used to land here: they now belong to /account/club
  if (sp.club || sp.redeem) redirect(`/account/club?${new URLSearchParams(sp as Record<string, string>).toString()}`);

  const [t, locale, { user, customer }] = await Promise.all([getT(), getLocale(), getCurrentCustomer()]);
  const dl = dateLocale(locale);
  const customerId = (customer?.id as string | undefined) ?? null;
  const isMember = Boolean(customer?.member_number);
  const balance = Number(customer?.points ?? 0);

  const [orders, ledger] = await Promise.all([getCustomerOrders(customerId), isMember ? getClubLedger(customerId, balance) : Promise.resolve(null)]);
  const last = orders[0];
  const [events, recs] = await Promise.all([last ? getOrderEvents(last.id) : Promise.resolve([]), getRecommendations(orders.flatMap((o) => (o.order_items ?? []).map((i) => i.product_id)))]);

  let lastOrder: DashLastOrder | null = null;
  if (last) {
    const raw = orderStepDates(events, last);
    const items = last.order_items ?? [];
    lastOrder = {
      id: last.id,
      number: last.order_number,
      status: last.status,
      date: formatDate(last.created_at, dl),
      total: formatMoney(Number(last.total), last.currency, dl),
      itemCount: items.reduce((s, i) => s + Number(i.quantity || 1), 0),
      images: items.map((i) => i.image),
      stepDates: Object.fromEntries(ORDER_STEPS.filter((s) => raw[s]).map((s) => [s, formatDate(raw[s], dl)])),
    };
  }

  let club: DashClub | null = null;
  if (isMember && ledger) {
    const rp = redeemProgress(balance);
    const tp = tierProgress(ledger.lifetime);
    club = {
      points: balance.toLocaleString(dl),
      canRedeem: rp.canRedeem,
      value: rp.value,
      toNext: rp.toNext,
      rewardProgress: rp.progress,
      redeemValue: REDEEM_VALUE,
      tierLabel: tierName(locale, tp.tier.id),
      nextLabel: tp.next ? tierName(locale, tp.next.id) : null,
      tierToNext: tp.toNext,
      tierProgress: tp.progress,
    };
  }

  return (
    <DashboardView
      t={t}
      greeting={greetingName(customer?.name as string | null, user?.email)}
      lastOrder={lastOrder}
      club={club}
      signupPoints={SIGNUP_POINTS}
      joinAction={joinClubAction}
      recs={recs}
    />
  );
}
