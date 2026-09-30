import "server-only";
import { cache } from "react";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export interface BrandSettings {
  brandId: string;
  name: string;
  tagline: string;
  description: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  foundedYear: number | null;
  socialLinks: Record<string, string>;
  defaultLanguage: string;
  supportedLanguages: string[];
  defaultCurrency: string;
  supportedCountries: string[];
  supportEmail: string | null;
  settings: {
    payment_fee_percent?: number;
    payment_fee_fixed?: number;
    refund_reserve_percent?: number;
    prices_include_tax?: boolean;
    abandoned_cart_hours?: number;
  };
}

/** Defaults used only when the DB isn't reachable (brand name remains configurable in brand_settings). */
const FALLBACK: BrandSettings = {
  brandId: "5b1e0000-0000-4000-8000-000000000001",
  name: "HISPANIA",
  tagline: "Identidad española. Estilo mediterráneo.",
  description:
    "Marca española de identidad, herencia y estilo de vida. Colecciones que cuentan historias: ciudades, motor, Mediterráneo y cultura.",
  logo: null,
  primaryColor: "#0B0B0C",
  secondaryColor: "#F4EFE6",
  accentColor: "#B3122E",
  foundedYear: 2026,
  socialLinks: {},
  defaultLanguage: "es",
  supportedLanguages: ["es", "en"],
  defaultCurrency: "EUR",
  supportedCountries: ["ES"],
  supportEmail: null,
  settings: { payment_fee_percent: 0.015, payment_fee_fixed: 0.25, refund_reserve_percent: 0.02, prices_include_tax: true, abandoned_cart_hours: 4 },
};

export const getBrand = cache(async (): Promise<BrandSettings> => {
  const sb = dbOrNull();
  if (!sb) return FALLBACK;
  const { data, error } = await sb.from("brand_settings").select("*").eq("brand_id", env.brandId()).maybeSingle();
  if (error || !data) return FALLBACK;
  return {
    brandId: data.brand_id,
    name: data.brand_name,
    tagline: data.brand_tagline ?? "",
    description: data.brand_description ?? "",
    logo: data.brand_logo,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
    accentColor: data.accent_color,
    foundedYear: data.founded_year,
    socialLinks: data.social_links ?? {},
    defaultLanguage: data.default_language,
    supportedLanguages: data.supported_languages ?? ["es"],
    defaultCurrency: data.default_currency,
    supportedCountries: data.supported_countries ?? ["ES"],
    supportEmail: data.support_email,
    settings: data.settings ?? {},
  };
});
