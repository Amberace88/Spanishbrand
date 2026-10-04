import "./account.css";
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowUpRight, ChevronRight, Crown, KeyRound, MapPin, MessageCircle, Package, Palette, Repeat, RotateCcw, Truck } from "lucide-react";
import type { TKey } from "@/lib/i18n/dictionaries";
import type { PublicProduct } from "@/lib/products/queries";
import type { OrderStep } from "@/lib/account-panel";
import { ORDER_STEPS } from "@/lib/account-panel";
import { ProductRail } from "@/components/cart/CartSections";
import { OrderStepper, OrderThumbs, StatusBadge } from "./OrderBits";

export type T = (key: TKey, vars?: Record<string, string | number>) => string;

export function stepLabels(t: T): Record<OrderStep, string> {
  return Object.fromEntries(ORDER_STEPS.map((s) => [s, t(`status.${s}` as TKey)])) as Record<OrderStep, string>;
}
const items = (t: T, n: number) => (n === 1 ? t("acct.items.one") : t("acct.items.many", { n }));

/* ───────────────────────── page head ───────────────────────── */

export function PanelHead({ title, sub, aside }: { title: ReactNode; sub?: string; aside?: ReactNode }) {
  return (
    <header className="ac-enter mb-7 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="headline text-[2.3rem] leading-[1.02] sm:text-5xl">{title}</h1>
        {sub && <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">{sub}</p>}
      </div>
      {aside}
    </header>
  );
}

const card = "rounded-[24px] bg-surface p-5 ring-1 ring-line sm:p-7";

/* ───────────────────────── Resumen ───────────────────────── */

export type DashLastOrder = { id: string; number: number | string; status: string; date: string; total: string; itemCount: number; images: (string | null)[]; stepDates: Partial<Record<OrderStep, string>> };
export type DashClub = { points: string; canRedeem: boolean; value: number; toNext: number; rewardProgress: number; redeemValue: number; tierLabel: string; nextLabel: string | null; tierToNext: number; tierProgress: number };

export function DashboardView({
  t,
  greeting,
  lastOrder,
  club,
  signupPoints,
  joinAction,
  recs,
}: {
  t: T;
  greeting: string;
  lastOrder: DashLastOrder | null;
  club: DashClub | null;
  signupPoints: number;
  joinAction: () => Promise<void>;
  recs: PublicProduct[];
}) {
  const quick = [
    { href: "/account/orders", icon: Package, label: t("acct.quick.orders") },
    { href: "/disena", icon: Palette, label: t("acct.quick.design") },
    { href: "/account/returns", icon: RotateCcw, label: t("acct.quick.return") },
    { href: "/account/profile#seguridad", icon: KeyRound, label: t("acct.quick.password") },
  ];
  return (
    <div>
      <header className="ac-enter mb-7 sm:mb-9">
        <h1 className="font-[family-name:var(--font-logo)] text-[clamp(2.2rem,7vw,3.7rem)] font-bold leading-[1.02] tracking-[0.01em]">{t("acct.hello", { name: greeting })}</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">{t("acct.hello.sub")}</p>
      </header>

      <div className="ac-enter-2 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        {/* last order */}
        <section className={card} aria-labelledby="dash-last">
          <div className="flex items-center justify-between gap-3">
            <h2 id="dash-last" className="text-[15px] font-semibold text-muted">
              {t("acct.last.title")}
            </h2>
            {lastOrder && <StatusBadge status={lastOrder.status} label={t(`status.${lastOrder.status}` as TKey)} />}
          </div>
          {lastOrder ? (
            <>
              <div className="mt-4 flex items-center gap-4">
                <OrderThumbs images={lastOrder.images} total={lastOrder.itemCount} size="lg" />
                <div className="min-w-0">
                  <p className="headline text-[1.9rem] leading-none">#{lastOrder.number}</p>
                  <p className="mt-1.5 text-sm text-muted">
                    {lastOrder.date} · {items(t, lastOrder.itemCount)} · <span className="font-semibold text-fg tabular-nums">{lastOrder.total}</span>
                  </p>
                </div>
              </div>
              <div className="mt-6 border-t border-line pt-5">
                <OrderStepper status={lastOrder.status} labels={stepLabels(t)} dates={lastOrder.stepDates} compact title={t("acct.order.progress")} />
              </div>
              <Link href={`/account/orders/${lastOrder.id}`} className="rg-focus btn btn-ink mt-6 px-6 py-3 text-[0.78rem]">
                {t("acct.last.view")}
              </Link>
            </>
          ) : (
            <div className="mt-4">
              <p className="max-w-md text-[15px] leading-relaxed">{t("acct.last.none")}</p>
              <Link href="/shop" className="rg-focus btn btn-ink mt-5 px-6 py-3 text-[0.78rem]">
                {t("acct.last.noneCta")}
              </Link>
            </div>
          )}
        </section>

        {/* points & tier */}
        {club ? (
          <section className={`${card} relative overflow-hidden`} aria-labelledby="dash-club">
            <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(201,162,39,0.16),transparent_70%)]" aria-hidden />
            <div className="relative flex items-center justify-between gap-3">
              <h2 id="dash-club" className="text-[15px] font-semibold text-muted">
                {t("acct.club.title")}
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-fg px-2.5 py-1 text-xs font-bold text-bg">
                <Crown className="h-3.5 w-3.5 text-gold" aria-hidden />
                {club.tierLabel}
              </span>
            </div>
            <p className="relative mt-4 flex items-baseline gap-2">
              <span className="headline text-[3.2rem] leading-none tabular-nums">{club.points}</span>
              <span className="text-sm font-semibold text-muted">pts</span>
            </p>
            <div className="relative mt-5">
              <p className="text-sm font-medium">{club.canRedeem ? t("acct.club.ready", { v: club.value }) : t("acct.club.toReward", { n: club.toNext, v: club.redeemValue })}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(club.rewardProgress * 100)} aria-label={t("acct.club.title")}>
                <div className="ac-bar h-full rounded-full bg-[linear-gradient(90deg,#a3162b,#c9a227_70%,#f7e08a)]" style={{ width: `${Math.max(3, club.rewardProgress * 100)}%` }} />
              </div>
            </div>
            <div className="relative mt-4">
              <p className="text-sm text-muted">{club.nextLabel ? t("acct.club.tierNext", { n: club.tierToNext.toLocaleString("es-ES"), t: club.nextLabel }) : t("acct.club.tierTop")}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="ac-bar h-full rounded-full bg-fg/70" style={{ width: `${Math.max(3, club.tierProgress * 100)}%` }} />
              </div>
            </div>
            <Link href="/account/club" className="rg-focus relative mt-6 inline-flex items-center gap-1.5 text-sm font-bold underline decoration-line underline-offset-4 hover:decoration-current">
              {t("acct.club.open")} <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </section>
        ) : (
          <section className="relative overflow-hidden rounded-[24px] bg-[#070606] p-5 text-[#f5f1e8] ring-1 ring-[#e0b84a]/25 sm:p-7" aria-labelledby="dash-join">
            <span className="absolute -bottom-10 -right-6 h-44 opacity-[0.1]" aria-hidden>
              <Image src="/brand/logo-lion.webp" alt="" width={997} height={1174} className="h-full w-auto" />
            </span>
            <span className="flag-line absolute inset-x-0 top-0 h-[3px]" aria-hidden />
            <h2 id="dash-join" className="relative font-[family-name:var(--font-logo)] text-2xl font-bold text-[#f1d27a]">
              {t("acct.club.joinTitle")}
            </h2>
            <p className="relative mt-2 max-w-xs text-sm leading-relaxed text-white/75">{t("acct.club.joinBody", { n: signupPoints })}</p>
            <form action={joinAction} className="relative mt-6">
              <button className="rg-focus btn bg-[#a3162b] px-6 py-3 text-[0.78rem] text-white hover:-translate-y-px">{t("acct.club.joinCta")}</button>
            </form>
          </section>
        )}
      </div>

      {/* shortcuts */}
      <nav aria-label={t("acct.quick.title")} className="ac-enter-3 mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {quick.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className="rg-focus group flex min-h-[64px] items-center gap-3 rounded-[18px] bg-surface px-4 py-3 text-[14px] font-semibold leading-tight ring-1 ring-line transition-colors hover:ring-[#c9a227]/60">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-gold transition-colors group-hover:bg-fg group-hover:text-bg">
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
            {label}
          </Link>
        ))}
      </nav>

      {recs.length > 0 && (
        <div className="mt-12 sm:mt-16">
          <ProductRail t={t} kicker={t("acct.recs.kicker")} title={t("acct.recs.title")} products={recs} href="/shop" compact bare />
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Pedidos ───────────────────────── */

export type OrderRow = { id: string; number: number | string; status: string; date: string; total: string; itemCount: number; images: (string | null)[] };

export function OrdersListView({ t, orders }: { t: T; orders: OrderRow[] }) {
  return (
    <div>
      <PanelHead
        title={t("acct.nav.orders")}
        sub={t("acct.orders.sub")}
        aside={orders.length ? <span className="text-sm font-semibold text-muted">{orders.length === 1 ? t("acct.orders.count.one") : t("acct.orders.count.many", { n: orders.length })}</span> : undefined}
      />
      {orders.length === 0 ? (
        <div className={`${card} ac-enter-2 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-gold">
              <Package className="h-5 w-5" aria-hidden />
            </span>
            <p className="max-w-md text-[15px] leading-relaxed">{t("acct.orders.empty")}</p>
          </div>
          <Link href="/shop" className="rg-focus btn btn-ink px-6 py-3 text-[0.78rem]">
            {t("acct.orders.emptyCta")}
          </Link>
        </div>
      ) : (
        <ul className="ac-enter-2 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.id}`} className="rg-focus group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-[20px] bg-surface p-4 ring-1 ring-line transition-colors hover:ring-[#c9a227]/60 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] sm:gap-x-6 sm:p-5">
                <div className="row-span-2 sm:row-span-1">
                  <OrderThumbs images={o.images} total={o.itemCount} />
                </div>
                <div className="col-start-2 row-start-1 min-w-0 sm:col-start-auto sm:row-start-auto">
                  <p className="headline text-[1.4rem] leading-none">#{o.number}</p>
                  <p className="mt-1 text-[13px] leading-snug text-muted">
                    {o.date} · {items(t, o.itemCount)}
                  </p>
                </div>
                <StatusBadge status={o.status} label={t(`status.${o.status}` as TKey)} className="col-start-2 row-start-2 justify-self-start sm:col-start-auto sm:row-start-auto" />
                <span className="col-start-3 row-start-1 text-right font-semibold tabular-nums sm:col-start-auto sm:row-start-auto">{o.total}</span>
                <ChevronRight className="hidden h-5 w-5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-fg sm:block" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────────────────── Pedido (detalle) ───────────────────────── */

export type OrderDetail = {
  id: string;
  number: number | string;
  status: string;
  date: string;
  stepDates: Partial<Record<OrderStep, string>>;
  items: { name: string; variant: string | null; quantity: number; total: string; image: string | null }[];
  totals: { subtotal: string; discount: string | null; shipping: string; total: string; tax: string };
  address: { name?: string; line1?: string; line2?: string; city?: string; postal_code?: string; country?: string } | null;
  shipments: { carrier: string | null; number: string | null; url: string | null; eta: string | null }[];
  returnHref: string | null;
  reorderable: boolean;
};

export function OrderDetailView({ t, o, reorderAction, reorderNone }: { t: T; o: OrderDetail; reorderAction: (fd: FormData) => Promise<void>; reorderNone: boolean }) {
  const off = !(["PAID", "PROCESSING", "SENT_TO_PROVIDER", "PROVIDER_ACCEPTED", "IN_PRODUCTION", "SHIPPED", "DELIVERED"] as string[]).includes(o.status);
  return (
    <div>
      <Link href="/account/orders" className="rg-focus inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
        <ChevronRight className="h-4 w-4 rotate-180" aria-hidden />
        {t("acct.order.back")}
      </Link>
      <div className="mt-3">
        <PanelHead
          title={t("acct.order.number", { n: o.number })}
          sub={t("acct.order.placed", { d: o.date })}
          aside={<StatusBadge status={o.status} label={t(`status.${o.status}` as TKey)} className="self-start sm:self-end" />}
        />
      </div>

      {reorderNone && (
        <p role="status" className="mb-5 rounded-2xl bg-accent/10 px-4 py-3 text-sm font-medium text-accent ring-1 ring-accent/25">
          {t("acct.order.reorderNone")}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="ac-enter-2 min-w-0 space-y-5">
          <section className={card} aria-labelledby="od-progress">
            <h2 id="od-progress" className="mb-5 text-[15px] font-semibold text-muted">
              {t("acct.order.progress")}
            </h2>
            {off ? (
              <p className="text-[15px] leading-relaxed">{t("acct.order.off", { s: t(`status.${o.status}` as TKey) })}</p>
            ) : (
              <OrderStepper status={o.status} labels={stepLabels(t)} dates={o.stepDates} title={t("acct.order.progress")} />
            )}
            {o.shipments.length > 0 && (
              <div className="mt-6 space-y-3 border-t border-line pt-5">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Truck className="h-4 w-4 text-gold" aria-hidden />
                  {t("acct.order.tracking")}
                </p>
                {o.shipments.map((s, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-2 p-4 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {s.carrier ?? "—"} <span className="font-normal tabular-nums text-muted">{s.number ?? ""}</span>
                      </p>
                      {s.eta && <p className="mt-0.5 text-muted">{t("acct.order.eta", { d: s.eta })}</p>}
                    </div>
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="rg-focus btn btn-ink px-5 py-2.5 text-[0.72rem]">
                        {t("acct.order.track")} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={card} aria-labelledby="od-items">
            <h2 id="od-items" className="text-[15px] font-semibold text-muted">
              {t("acct.order.items")}
            </h2>
            <ul className="mt-2 divide-y divide-line">
              {o.items.map((i, k) => (
                <li key={k} className="flex items-center gap-4 py-4">
                  <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">{i.image && <Image src={i.image} alt="" fill sizes="64px" className="object-cover" />}</div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold leading-snug">{i.name}</p>
                    <p className="mt-0.5 text-muted">
                      {i.variant ? `${i.variant} · ` : ""}
                      {t("acct.order.qty", { n: i.quantity })}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{i.total}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="ac-enter-3 h-fit space-y-5 lg:sticky lg:top-[124px]">
          <section className={card} aria-labelledby="od-sum">
            <h2 id="od-sum" className="text-[15px] font-semibold text-muted">
              {t("acct.order.summary")}
            </h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">{t("cart.subtotal")}</dt>
                <dd className="tabular-nums">{o.totals.subtotal}</dd>
              </div>
              {o.totals.discount && (
                <div className="flex justify-between">
                  <dt className="text-muted">{t("acct.order.discount")}</dt>
                  <dd className="tabular-nums text-accent">−{o.totals.discount}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">{t("acct.order.shipping")}</dt>
                <dd className="tabular-nums">{o.totals.shipping}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
                <dt>{t("acct.order.total")}</dt>
                <dd className="tabular-nums">{o.totals.total}</dd>
              </div>
            </dl>
            <p className="mt-1.5 text-xs text-muted">{t("acct.order.vat", { v: o.totals.tax })}</p>
          </section>

          {o.address && (
            <section className={card} aria-labelledby="od-addr">
              <h2 id="od-addr" className="flex items-center gap-2 text-[15px] font-semibold text-muted">
                <MapPin className="h-4 w-4 text-gold" aria-hidden />
                {t("acct.order.address")}
              </h2>
              <address className="mt-3 text-sm not-italic leading-relaxed">
                {o.address.name && <span className="block font-semibold">{o.address.name}</span>}
                {o.address.line1 && <span className="block">{o.address.line1}</span>}
                {o.address.line2 && <span className="block">{o.address.line2}</span>}
                <span className="block">
                  {[o.address.postal_code, o.address.city].filter(Boolean).join(" ")}
                  {o.address.country ? `, ${o.address.country}` : ""}
                </span>
              </address>
            </section>
          )}

          <section className={`${card} space-y-3`}>
            {o.reorderable && (
              <form action={reorderAction}>
                <input type="hidden" name="orderId" value={o.id} />
                <button className="rg-focus btn btn-ink w-full justify-center px-5 py-3 text-[0.78rem]">
                  <Repeat className="h-4 w-4" aria-hidden />
                  {t("acct.order.reorder")}
                </button>
                <p className="mt-2 text-xs text-muted">{t("acct.order.reorderNote")}</p>
              </form>
            )}
            {o.returnHref && (
              <Link href={o.returnHref} className="rg-focus btn btn-ghost w-full justify-center px-5 py-3 text-[0.78rem]">
                <RotateCcw className="h-4 w-4" aria-hidden />
                {t("acct.order.return")}
              </Link>
            )}
            <p className="flex flex-wrap items-center gap-x-2 pt-1 text-sm text-muted">
              <MessageCircle className="h-4 w-4" aria-hidden />
              {t("acct.order.help")}
              <Link href="/contact" className="font-semibold text-fg underline decoration-line underline-offset-4 hover:decoration-current">
                {t("acct.order.helpCta")}
              </Link>
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ───────────────────────── Devoluciones ───────────────────────── */

export type ReturnRow = { rma: string; orderNumber: number | string | null; type: "ISSUE" | "WITHDRAWAL" | string; status: string; statusLabel: string; tone: "info" | "warn" | "ok" | "bad"; date: string; href: string };
const RTONE = { info: "progress", warn: "attention", ok: "done", bad: "closed" } as const;

export function ReturnsView({ t, rows }: { t: T; rows: ReturnRow[] }) {
  return (
    <div>
      <PanelHead
        title={t("acct.nav.returns")}
        sub={t("acct.returns.sub")}
        aside={
          <div className="flex flex-wrap gap-2">
            <Link href="/returns/new" className="rg-focus btn btn-ink px-5 py-3 text-[0.75rem]">
              {t("acct.returns.new")}
            </Link>
            <Link href="/returns" className="rg-focus btn btn-ghost px-5 py-3 text-[0.75rem]">
              {t("acct.returns.policy")}
            </Link>
          </div>
        }
      />
      {rows.length === 0 ? (
        <div className={`${card} ac-enter-2 flex items-center gap-4`}>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-gold">
            <RotateCcw className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-[15px] leading-relaxed">{t("acct.returns.empty")}</p>
        </div>
      ) : (
        <ul className="ac-enter-2 space-y-3">
          {rows.map((r) => (
            <li key={r.rma}>
              <Link href={r.href} className="rg-focus group flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[20px] bg-surface p-4 ring-1 ring-line transition-colors hover:ring-[#c9a227]/60 sm:p-5">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[15px] font-bold tracking-[0.06em]">{r.rma}</p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {t(`acct.returns.type.${r.type}` as TKey)}
                    {r.orderNumber ? ` · #${r.orderNumber}` : ""} · {r.date}
                  </p>
                </div>
                <StatusBadge tone={RTONE[r.tone]} label={r.statusLabel} />
                <span className="inline-flex items-center gap-1 text-sm font-semibold">
                  {t("acct.returns.status")}
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
