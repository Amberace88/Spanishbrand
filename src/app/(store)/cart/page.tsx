import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getCart } from "@/lib/cart/cart";
import { getT } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/format";
import { refreshCartAction, updateLineAction } from "@/app/actions/cart";
import { Container } from "@/components/ui/Section";

export const metadata: Metadata = { title: "Carrito", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CartPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const [{ cancelled }, t, cart] = await Promise.all([searchParams, getT(), getCart()]);
  const needsFix = cart.lines.some((l) => l.issue);

  return (
    <section className="min-h-[80svh] bg-warm pb-24 pt-28 sm:pt-36">
      <Container>
        <h1 className="display text-7xl sm:text-8xl">{t("cart.title")}</h1>
        {cancelled && <p className="mt-4 text-sm text-stone-2">El pago se ha cancelado. Tu carrito sigue aquí.</p>}

        {cart.lines.length === 0 ? (
          <div className="mt-12">
            <p className="serif text-3xl italic text-ink/70">{t("cart.empty")}</p>
            <Link href="/shop" className="btn btn-ink mt-8">
              {t("cart.continue")}
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {cart.lines.map((l) => (
                <li key={l.id} className="flex gap-4 py-6 sm:gap-6">
                  <Link href={`/products/${l.productSlug}`} className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden bg-bone sm:w-32">
                    {l.image && <Image src={l.image} alt={l.productName} fill sizes="128px" className="object-cover" />}
                  </Link>
                  <div className="flex flex-1 flex-col justify-between gap-3">
                    <div className="flex justify-between gap-4">
                      <div>
                        <Link href={`/products/${l.productSlug}`} className="font-medium hover:underline">
                          {l.productName}
                        </Link>
                        <p className="mt-1 text-sm text-stone-2">{l.variantName}</p>
                        {l.issue && <p className="mt-2 text-xs text-rojo">{t(`cart.issue.${l.issue}` as "cart.issue.UNAVAILABLE")}</p>}
                      </div>
                      <p className="shrink-0 tabular-nums">{formatMoney(l.lineTotal, cart.currency)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <form action={updateLineAction} className="flex items-center border border-ink/15">
                        <input type="hidden" name="lineId" value={l.id} />
                        <button name="quantity" value={l.quantity - 1} className="px-3 py-2 hover:bg-bone" aria-label="-">
                          −
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums">{l.quantity}</span>
                        <button name="quantity" value={l.quantity + 1} className="px-3 py-2 hover:bg-bone" aria-label="+" disabled={l.quantity >= 20}>
                          +
                        </button>
                      </form>
                      <form action={updateLineAction}>
                        <input type="hidden" name="lineId" value={l.id} />
                        <button name="quantity" value={0} className="eyebrow link-u text-[0.6rem] text-stone-2">
                          {t("cart.remove")}
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit border border-ink/10 bg-bone p-6 sm:p-8 lg:sticky lg:top-28">
              <div className="flex justify-between text-lg">
                <span>{t("cart.subtotal")}</span>
                <span className="tabular-nums">{formatMoney(cart.subtotal, cart.currency)}</span>
              </div>
              <p className="mt-2 text-xs text-stone-2">{t("cart.shippingNote")}</p>
              {needsFix ? (
                <form action={refreshCartAction}>
                  <button className="btn btn-ink mt-8 w-full">{t("cart.fix")}</button>
                </form>
              ) : (
                <Link href="/checkout" className="btn btn-primary mt-8 w-full py-5">
                  {t("cart.checkout")} →
                </Link>
              )}
              <Link href="/shop" className="eyebrow link-u mt-5 block text-center text-[0.62rem] text-stone-2">
                {t("cart.continue")}
              </Link>
            </aside>
          </div>
        )}
      </Container>
    </section>
  );
}
