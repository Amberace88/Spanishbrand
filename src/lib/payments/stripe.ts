import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = env.stripeSecretKey();
  if (!key) throw new Error("STRIPE_NOT_CONFIGURED");
  if (!client) client = new Stripe(key, { appInfo: { name: "brand-os" }, maxNetworkRetries: 2 });
  return client;
}

export const toCents = (n: number) => Math.round(n * 100);
export const fromCents = (n: number | null | undefined) => (n == null ? 0 : n / 100);
