import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCart } from "@/lib/cart/cart";
import { getBrand } from "@/lib/brand";
import { getT } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Container } from "@/components/ui/Section";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [t, cart, brand, user] = await Promise.all([getT(), getCart(), getBrand(), getSessionUser()]);
  if (cart.lines.length === 0) redirect("/cart");
  if (cart.lines.some((l) => l.issue)) redirect("/cart");

  return (
    <section className="min-h-[80svh] bg-bg pb-24 pt-10 sm:pt-14">
      <Container>
        <Link href="/cart" className="eyebrow link-u text-[0.62rem] text-muted">
          ← {t("cart.title")}
        </Link>
        <h1 className="headline mt-2 text-4xl sm:text-5xl">{t("checkout.title")}</h1>
        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <CheckoutForm countries={brand.supportedCountries} defaultEmail={user?.email ?? undefined} />
          <aside className="h-fit border border-line bg-surface-2 p-6 sm:p-8">
            <ul className="space-y-4">
              {cart.lines.map((l) => (
                <li key={l.id} className="flex items-center gap-4">
                  <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden bg-bg">
                    {l.image && <Image src={l.image} alt="" fill sizes="64px" className="object-cover" />}
                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-fg text-[10px] text-fg">{l.quantity}</span>
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{l.productName}</p>
                    <p className="text-muted">{l.variantName}</p>
                    {l.personalizationSummary && <p className="text-xs font-semibold text-gold">✦ {l.personalizationSummary}</p>}
                  </div>
                  <p className="text-sm tabular-nums">{formatMoney(l.lineTotal, cart.currency)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-between border-t border-line pt-6">
              <span>{t("cart.subtotal")}</span>
              <span className="tabular-nums">{formatMoney(cart.subtotal, cart.currency)}</span>
            </div>
            <p className="mt-2 text-xs text-muted">{t("cart.shippingNote")}</p>
          </aside>
        </div>
      </Container>
    </section>
  );
}
