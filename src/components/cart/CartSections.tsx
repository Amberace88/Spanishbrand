import "./cart.css";
import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { TKey } from "@/lib/i18n/dictionaries";
import type { PublicCollection, PublicProduct } from "@/lib/products/queries";
import { formatMoney } from "@/lib/format";
import { lookFor } from "@/lib/catalog/tones";
import { tileCards, tileCount, tilePhoto } from "@/lib/catalog/tiles";
import { EditorialTile } from "@/components/merch/EditorialTile";
import { ProductCard } from "@/components/product/ProductCard";
import { Container } from "@/components/ui/Section";
import { IconArrow, IconHeart, IconLeaf, IconLock, IconReturn, IconTruck } from "@/components/ui/Icons";
import { EmptyBagArt } from "./EmptyBagArt";
import { Rail } from "./Rail";
import { LineControls } from "./LineControls";
import { CheckoutBar } from "./CheckoutBar";

/** Translator as returned by getT(). */
export type T = (key: TKey, vars?: Record<string, string | number>) => string;

/** Minimal line shape used by the view (matches lib/cart CartLine). */
export interface CartLineView {
  id: string;
  productName: string;
  productSlug: string;
  variantName: string;
  image: string | null;
  quantity: number;
  currentPrice: number;
  lineTotal: number;
  issue: string | null;
  personalizationSummary: string | null;
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="kicker flex items-center gap-2 text-gold-ink">
      <span className="flag-line inline-block h-[3px] w-6 rounded-full" aria-hidden />
      {children}
    </p>
  );
}

/* ───────────────────────── empty state ───────────────────────── */

export function CartEmptyHero({ t, cancelled }: { t: T; cancelled?: boolean }) {
  return (
    <section className="relative overflow-hidden bg-bg">
      <div className="azulejo-line pointer-events-none absolute inset-y-0 left-0 hidden w-[38%] opacity-30 [mask-image:linear-gradient(to_right,black,transparent)] lg:block" aria-hidden />
      <Container className="relative grid items-center gap-10 pb-14 pt-8 sm:pb-20 sm:pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24 lg:pt-16">
        <div className="order-2 lg:order-1">
          {cancelled && <CancelledNote t={t} />}
          <Kicker>{t("cart.title")} · 0</Kicker>
          <h1 className="headline mt-4 text-[2.6rem] leading-[0.98] sm:text-6xl lg:text-[4.6rem]">
            {t("cart.empty.title1")} <span className="serif font-normal italic text-accent">{t("cart.empty.title2")}</span>
          </h1>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-muted">{t("cart.empty.body")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/shop?sort=new" className="btn btn-primary px-7 py-4 text-[15px]">
              {t("cart.empty.new")} <IconArrow className="h-4 w-4" />
            </Link>
            <Link href="/disena" className="btn btn-ghost group px-7 py-4 text-[15px]">
              <span className="text-gold transition-transform duration-500 group-hover:rotate-90" aria-hidden>
                ✦
              </span>
              {t("hero3.design")}
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted">
            <Link href="/shop" className="link-u">
              {t("cart.continue")}
            </Link>
          </p>
        </div>
        <div className="order-1 mx-auto w-full max-w-[300px] sm:max-w-[400px] lg:order-2 lg:max-w-[520px]">
          <EmptyBagArt />
        </div>
      </Container>
    </section>
  );
}

export function CancelledNote({ t }: { t: T }) {
  return (
    <p role="status" className="mb-6 inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm text-muted ring-1 ring-line">
      <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
      {t("cart.cancelled")}
    </p>
  );
}

/* ───────────────────────── rails & tiles ───────────────────────── */

export function ProductRail({ t, title, kicker, products, href, compact = false, bare = false }: { t: T; title: string; kicker: string; products: PublicProduct[]; href?: string; compact?: boolean; bare?: boolean }) {
  if (!products.length) return null;
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  const body = (
    <Rail
      label={title}
      prev={t("cart.rail.prev")}
      next={t("cart.rail.next")}
      compact={compact}
      head={
        <>
          <Kicker>{kicker}</Kicker>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <h2 className="headline text-[2rem] leading-none sm:text-5xl">{title}</h2>
            {href && (
              <Link href={href} className="eyebrow link-u text-[0.62rem] text-muted">
                {t("cart.seeAll")}
              </Link>
            )}
          </div>
        </>
      }
    >
      {products.map((p, i) => (
        <ProductCard key={p.id} p={p} labels={labels} priority={i < 2} />
      ))}
    </Rail>
  );
  if (bare) return body;
  return (
    <section className="bg-bg py-14 sm:py-20">
      <Container>{body}</Container>
    </section>
  );
}

export function CollectionTiles({ t, collections, products, site, en }: { t: T; collections: PublicCollection[]; products: PublicProduct[]; site: Record<string, string>; en: boolean }) {
  if (!collections.length) return null;
  return (
    <section className="bg-bg pb-14 pt-2 sm:pb-20 sm:pt-4">
      <Container>
        <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <div>
            <Kicker>{t("cart.collections.kicker")}</Kicker>
            <h2 className="headline mt-3 text-[2rem] leading-none sm:text-5xl">{t("nav.collections")}</h2>
          </div>
          <Link href="/collections" className="btn btn-ghost hidden sm:inline-flex">
            {t("cart.seeAll")} <IconArrow className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {collections.map((c) => {
            const items = products.filter((p) => p.collection?.slug === c.slug);
            const look = lookFor(c.slug);
            return (
              <div key={c.slug} className="aspect-[4/5]">
                <EditorialTile
                  href={`/collections/${c.slug}`}
                  title={c.name}
                  kicker={items.length ? tileCount(items, en) : undefined}
                  tagline={c.tagline}
                  tone={look.tone}
                  texture={look.texture}
                  word={look.word}
                  photo={tilePhoto(look, site)}
                  cards={tileCards(items, 3)}
                  size="card"
                />
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

/** Trust facts — only what the site already states (trust.* copy, free-shipping rule from the shipping config). */
export function CartTrust({ t, freeShipping }: { t: T; freeShipping?: string | null }) {
  const items = [
    { Icon: IconLeaf, title: t("trust.made.t"), body: t("trust.made.b"), href: "/about" },
    { Icon: IconTruck, title: t("trust.shipping.t"), body: freeShipping ? t("promo.freeShipping", { n: freeShipping }) : t("trust.shipping.b"), href: "/shipping" },
    { Icon: IconReturn, title: t("trust.returns.t"), body: t("trust.returns.b"), href: "/returns" },
    { Icon: IconLock, title: t("trust.secure.t"), body: t("trust.secure.b"), href: "/terms" },
  ];
  return (
    <section className="bg-bg pb-16 pt-4 sm:pb-24">
      <Container>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ Icon, title, body, href }) => (
            <li key={title}>
              <Link href={href} className="group flex h-full items-start gap-4 rounded-3xl bg-surface p-5 ring-1 ring-line transition-all hover:-translate-y-0.5 hover:ring-[color-mix(in_srgb,var(--gold)_55%,transparent)] sm:p-6">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#070606] text-[#e0b84a] ring-1 ring-[#c9a227]/40 transition-transform group-hover:scale-105">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold uppercase tracking-wide">{title}</span>
                  <span className="mt-1 block text-[13.5px] leading-snug text-muted">{body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ───────────────────────── filled cart ───────────────────────── */

/** Progress to the configured free-shipping threshold (Spain); hidden when no rule defines one. */
export function FreeShippingMeter({ t, subtotal, freeOver, currency }: { t: T; subtotal: number; freeOver: number; currency: string }) {
  const left = Math.max(0, freeOver - subtotal);
  const p = Math.min(100, Math.round((subtotal / freeOver) * 100));
  const done = left <= 0;
  return (
    <div className="rounded-3xl bg-surface p-5 ring-1 ring-line sm:p-6">
      <div className="flex items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${done ? "bg-[#1f7a49] text-white" : "bg-[#070606] text-[#e0b84a]"}`} aria-hidden>
          {done ? (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 10.5l3.5 3.5 7.5-8" />
            </svg>
          ) : (
            <IconTruck className="h-4 w-4" />
          )}
        </span>
        <p className="text-[14.5px] leading-snug" aria-live="polite">
          {done ? (
            <strong className="font-semibold">{t("cart.free.done")}</strong>
          ) : (
            t("cart.free.left", { n: "\u00a7" })
              .split("\u00a7")
              .map((part, i) => (
                <span key={i}>
                  {i > 0 && <strong className="font-semibold text-accent">{formatMoney(left, currency)}</strong>}
                  {part}
                </span>
              ))
          )}
        </p>
      </div>
      <div
        className="ct-meter mt-4"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p}
        aria-label={t("promo.freeShipping", { n: formatMoney(freeOver, currency).replace(/,00/, "") })}
      >
        <i style={{ "--p": `${p}%` } as CSSProperties} />
      </div>
    </div>
  );
}

export function CartLines({ t, lines, currency, max }: { t: T; lines: CartLineView[]; currency: string; max: number }) {
  const labels = { qty: t("cart.qty"), dec: t("cart.dec"), inc: t("cart.inc"), remove: t("cart.remove") };
  return (
    <ul className="space-y-3">
      {lines.map((l, i) => (
        <li key={l.id} className="ct-line rounded-3xl bg-surface p-3 ring-1 ring-line sm:p-4" style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>
          <div className="flex gap-4 sm:gap-5">
            <Link href={`/products/${l.productSlug}`} className="group relative aspect-[4/5] w-[92px] shrink-0 overflow-hidden rounded-2xl bg-surface-2 sm:w-[120px]">
              {l.image ? (
                <Image src={l.image} alt={l.productName} fill sizes="120px" className="object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]" />
              ) : (
                <span className="absolute inset-0 grid place-items-center text-gold" aria-hidden>
                  ✦
                </span>
              )}
              {l.quantity > 1 && <span className="absolute right-1.5 top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-fg px-1.5 text-[11px] font-bold tabular-nums text-bg">×{l.quantity}</span>}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-0.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/products/${l.productSlug}`} className="line-clamp-2 text-[15px] font-semibold leading-snug hover:underline sm:text-base">
                    {l.productName}
                  </Link>
                  <p className="mt-1 text-[13px] text-muted">{l.variantName}</p>
                  {l.personalizationSummary && (
                    <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold">
                      <span aria-hidden>✦</span>
                      <span className="truncate">{l.personalizationSummary}</span>
                    </p>
                  )}
                  {l.issue && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                      <span aria-hidden>!</span>
                      {t(`cart.issue.${l.issue}` as "cart.issue.UNAVAILABLE")}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[15px] font-bold tabular-nums sm:text-base">{formatMoney(l.lineTotal, currency)}</p>
                  {l.quantity > 1 && <p className="mt-0.5 text-xs text-muted tabular-nums">{t("cart.each", { n: formatMoney(l.currentPrice, currency) })}</p>}
                </div>
              </div>
              <LineControls lineId={l.id} quantity={l.quantity} max={max} labels={labels} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CartHeader({ t, itemCount, cancelled }: { t: T; itemCount: number; cancelled?: boolean }) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
      <div>
        {cancelled && <CancelledNote t={t} />}
        <Kicker>{t(itemCount === 1 ? "cart.count.one" : "cart.count", { n: itemCount })}</Kicker>
        <h1 className="headline mt-3 text-[2.6rem] leading-none sm:text-6xl">{t("cart.title")}</h1>
      </div>
      <Link href="/shop" className="eyebrow link-u self-start text-[0.62rem] text-muted sm:self-auto">
        ← {t("cart.continue")}
      </Link>
    </div>
  );
}

/** Order summary — checkout link and "fix cart" form unchanged; sticky on desktop. */
export function CartSummary({ t, subtotal, currency, itemCount, needsFix, freeDone, fixAction, donationPerItem = 0 }: { t: T; subtotal: number; currency: string; itemCount: number; needsFix: boolean; freeDone: boolean; fixAction: () => Promise<void>; donationPerItem?: number }) {
  return (
    <aside id="cart-summary-box" className="h-fit scroll-mt-28 lg:sticky lg:top-28" aria-labelledby="cart-summary">
      <div className="relative overflow-hidden rounded-[2rem] bg-surface p-6 ring-1 ring-line sm:p-8">
        <div className="flag-line absolute inset-x-0 top-0 h-[4px]" aria-hidden />
        <h2 id="cart-summary" className="headline text-2xl">
          {t("cart.summary")}
        </h2>
        <dl className="mt-6 space-y-3 text-[15px]">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t(itemCount === 1 ? "cart.count.one" : "cart.count", { n: itemCount })}</dt>
            <dd className="tabular-nums">{formatMoney(subtotal, currency)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t("cart.shipping")}</dt>
            <dd className={`text-right ${freeDone ? "font-semibold text-[#1f7a49] dark:text-[#5fd394]" : "text-muted"}`}>{freeDone ? t("cart.shipping.freeEs") : t("cart.shipping.atCheckout")}</dd>
          </div>
        </dl>
        <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-line pt-5">
          <span className="text-lg font-semibold">{t("cart.subtotal")}</span>
          <span className="headline text-3xl tabular-nums">{formatMoney(subtotal, currency)}</span>
        </div>
        <p className="mt-2 text-xs text-muted">{t("cart.shippingNote")}</p>
        {needsFix ? (
          <form action={fixAction}>
            <button className="btn btn-ink mt-7 w-full py-4">{t("cart.fix")}</button>
          </form>
        ) : (
          <Link href="/checkout" className="btn btn-primary group mt-7 w-full py-5 text-[15px]">
            {t("cart.checkout")} <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
        <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-muted">
          <IconLock className="h-3.5 w-3.5 shrink-0" />
          {t("trust.secure.b")}
        </p>
        {donationPerItem > 0 && (
          <Link href="/causas" className="group mt-6 flex items-start gap-3 rounded-2xl bg-accent/[0.06] p-3.5 text-[13px] ring-1 ring-accent/15 transition-colors hover:bg-accent/[0.1]">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
              <IconHeart className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-fg">{t("causes.cart.t", { amount: formatMoney(Math.round(donationPerItem * itemCount * 100) / 100, currency).replace(/,00/, "") })}</span>
              <span className="block leading-relaxed text-muted">{t("causes.cart.b")}</span>
            </span>
            <IconArrow className="mt-1 h-3.5 w-3.5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
        <ul className="mt-6 space-y-2.5 border-t border-line pt-5 text-[13px] text-muted">
          <li className="flex items-start gap-2.5">
            <IconLeaf className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            {t("trust.made.b")}
          </li>
          <li className="flex items-start gap-2.5">
            <IconReturn className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            {t("trust.returns.b")}
          </li>
        </ul>
      </div>
      <CheckoutBar targetId="cart-summary-box" subtotal={formatMoney(subtotal, currency)} totalLabel={t("cart.subtotal")} label={t("cart.checkout")} href={needsFix ? null : "/checkout"} fixLabel={t("cart.fix")} />
    </aside>
  );
}
