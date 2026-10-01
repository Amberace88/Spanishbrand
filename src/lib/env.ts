import "server-only";

/**
 * Server-side environment access. Secrets are read lazily and never shipped
 * to the client bundle ("server-only" import guard).
 */
function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export const env = {
  siteUrl: () => read("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000",
  brandId: () => read("BRAND_ID") ?? "5b1e0000-0000-4000-8000-000000000001",
  supabaseUrl: () => read("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceKey: () => read("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecretKey: () => read("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => read("STRIPE_WEBHOOK_SECRET"),
  printfulApiKey: () => read("PRINTFUL_API_KEY"),
  printfulStoreId: () => read("PRINTFUL_STORE_ID"),
  printfulWebhookSecret: () => read("PRINTFUL_WEBHOOK_SECRET"),
  gelatoApiKey: () => read("GELATO_API_KEY"),
  gelatoWebhookSecret: () => read("GELATO_WEBHOOK_SECRET"),
  printifyApiToken: () => read("PRINTIFY_API_TOKEN"),
  printifyShopId: () => read("PRINTIFY_SHOP_ID"),
  printifyWebhookSecret: () => read("PRINTIFY_WEBHOOK_SECRET"),
  prodigiApiKey: () => read("PRODIGI_API_KEY"),
  prodigiSandbox: () => read("PRODIGI_SANDBOX") === "1",
  prodigiWebhookSecret: () => read("PRODIGI_WEBHOOK_SECRET"),
  resendApiKey: () => read("RESEND_API_KEY"),
  emailFrom: () => read("EMAIL_FROM") ?? "Store <onboarding@resend.dev>",
  aiApiKey: () => read("AI_PROVIDER_API_KEY"),
  aiModel: () => read("AI_MODEL") ?? "claude-sonnet-5-5",
  cronSecret: () => read("CRON_SECRET"),
  adminEmails: () =>
    (read("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
};

export const isConfigured = {
  db: () => Boolean(env.supabaseUrl() && env.supabaseServiceKey()),
  auth: () => Boolean(env.supabaseUrl() && env.supabaseAnonKey()),
  stripe: () => Boolean(env.stripeSecretKey()),
  email: () => Boolean(env.resendApiKey()),
  ai: () => Boolean(env.aiApiKey()),
  printful: () => Boolean(env.printfulApiKey()),
  gelato: () => Boolean(env.gelatoApiKey()),
  printify: () => Boolean(env.printifyApiToken()),
  prodigi: () => Boolean(env.prodigiApiKey()),
};
