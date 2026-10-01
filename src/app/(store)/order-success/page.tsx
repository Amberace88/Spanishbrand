import type { Metadata } from "next";
import Link from "next/link";
import { dbOrNull } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n/server";
import { Container } from "@/components/ui/Section";

export const metadata: Metadata = { title: "Pedido recibido", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Never trusts the redirect alone: payment status is read from our DB, which is only
 * updated by the verified Stripe webhook.
 */
export default async function OrderSuccess({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const [{ session_id }, t] = await Promise.all([searchParams, getT()]);
  const sb = dbOrNull();
  const order =
    sb && session_id && /^cs_[A-Za-z0-9_]+$/.test(session_id)
      ? (await sb.from("orders").select("id, order_number, payment_status").eq("stripe_checkout_session_id", session_id).maybeSingle()).data
      : null;
  const confirmed = order?.payment_status === "PAID";

  return (
    <section className="relative flex min-h-[70svh] items-center overflow-hidden bg-cream">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-oro-2/40 blur-3xl" />
      <Container className="relative py-20 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-oliva text-3xl text-white">✓</div>
        <p className="eyebrow mt-6 text-rojo">{order ? `${t("success.order")} #${order.order_number}` : ""}</p>
        <h1 className="headline mx-auto mt-3 max-w-3xl text-5xl sm:text-6xl">{t("success.title")}</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-stone-2">{confirmed || !order ? t("success.body") : t("success.pending")}</p>
        {!confirmed && order && <meta httpEquiv="refresh" content="4" />}
        <div className="mt-10 flex justify-center gap-3">
          <Link href="/account/orders" className="btn btn-primary">
            {t("account.orders")}
          </Link>
          <Link href="/" className="btn btn-ghost">
            {t("cart.continue")}
          </Link>
        </div>
      </Container>
    </section>
  );
}
