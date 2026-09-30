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
    <section className="grain relative flex min-h-[90svh] items-center overflow-hidden bg-ink text-bone">
      <div className="pointer-events-none absolute left-1/2 top-[70%] aspect-square w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60" style={{ background: "radial-gradient(circle, #f0c77a 0%, #b3122e 50%, transparent 70%)" }} />
      <Container className="relative py-32 text-center">
        <p className="eyebrow text-oro-2">{order ? `${t("success.order")} #${order.order_number}` : ""}</p>
        <h1 className="display mx-auto mt-5 max-w-4xl text-7xl sm:text-9xl">{t("success.title")}</h1>
        <p className="serif mx-auto mt-6 max-w-xl text-2xl italic text-bone/80">{confirmed || !order ? t("success.body") : t("success.pending")}</p>
        {!confirmed && order && <meta httpEquiv="refresh" content="4" />}
        <div className="mt-10 flex justify-center gap-3">
          <Link href="/account/orders" className="btn btn-primary">
            {t("account.orders")}
          </Link>
          <Link href="/" className="btn btn-ghost-light">
            {t("cart.continue")}
          </Link>
        </div>
      </Container>
    </section>
  );
}
