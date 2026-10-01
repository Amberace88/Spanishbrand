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
  /** Seller identity for legal texts (razón social, NIF, dirección). */
  legalEntity: { name?: string; taxId?: string; address?: string; email?: string; phone?: string };
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
  name: "ROJO Y GUALDA",
  tagline: "Orgullo español. Hecho para llevarlo.",
  description:
    "Marca española de orgullo, identidad y estilo de vida: fútbol, pueblo, fiesta, Mediterráneo y herencia. Diseños propios fabricados bajo pedido en Europa.",
  logo: null,
  primaryColor: "#0D0D0D",
  secondaryColor: "#FFFFFF",
  accentColor: "#E3051B",
  foundedYear: 2026,
  socialLinks: {},
  defaultLanguage: "es",
  supportedLanguages: ["es", "en", "de"],
  defaultCurrency: "EUR",
  supportedCountries: ["ES"],
  supportEmail: null,
  legalEntity: {},
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
    legalEntity: (data.legal_entity ?? {}) as BrandSettings["legalEntity"],
    settings: data.settings ?? {},
  };
});
