import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

/** Cloudflare Workers (workerd) identifies itself this way; Node reports "Node.js/<version>". */
export const isWorkersRuntime = () => typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

export function stripe(): Stripe {
  const key = env.stripeSecretKey();
  if (!key) throw new Error("STRIPE_NOT_CONFIGURED");
  // Workers: fetch-based HTTP client (no Node http agent); Node keeps the SDK default.
  if (!client) client = new Stripe(key, { appInfo: { name: "brand-os" }, maxNetworkRetries: 2, ...(isWorkersRuntime() ? { httpClient: Stripe.createFetchHttpClient() } : {}) });
  return client;
}

/** WebCrypto signature verification on Workers (async); undefined = the SDK's Node crypto provider. */
export const webhookCryptoProvider = () => (isWorkersRuntime() ? Stripe.createSubtleCryptoProvider() : undefined);

export const toCents = (n: number) => Math.round(n * 100);
export const fromCents = (n: number | null | undefined) => (n == null ? 0 : n / 100);
