import Link from "next/link";
import { getT, getLocale } from "@/lib/i18n/server";
import type { BrandSettings } from "@/lib/brand";
import { Newsletter } from "@/components/home/Newsletter";
import { IconLock } from "@/components/ui/Icons";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { BrandLogo } from "@/components/brand/Wordmark";

// Bizum is shown only once it is enabled in Stripe (Dashboard → Payment methods) and flagged here.
const PAY = ["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay", ...(process.env.NEXT_PUBLIC_PAYMENT_BIZUM === "1" ? ["Bizum"] : [])];

export async function Footer({ brand }: { brand: BrandSettings }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const year = new Date().getFullYear();
  const cols = [
    { title: t("footer.shop"), links: [["/shop", t("nav.new")], ["/deportes", t("nav.sports")], ["/personaliza", t("nav.personalize")], ["/regalos", t("nav.gifts")], ["/collections", t("nav.collections")], ["/regiones", t("nav.regions")]] },
    { title: t("footer.help"), links: [["/shipping", t("footer.shipping")], ["/returns", t("footer.returns")], ["/contact", t("footer.contact")], ["/account", t("nav.account")]] },
    { title: t("footer.brand"), links: [["/about", t("nav.about")], ["/club", t("nav.club")], ["/empresas", t("nav.business")], ["/creadores", t("nav.creators")], ["/journal", t("nav.journal")], ["/community", t("nav.community")]] },
    { title: t("footer.legal"), links: [["/privacy", t("footer.privacy")], ["/terms", t("footer.terms")], ["/cookies", t("footer.cookies")]] },
  ];
  const socials = Object.entries(brand.socialLinks).filter(([, v]) => Boolean(v));

  return (
    <footer className="relative overflow-hidden bg-[#0d0d0d] text-white">
      <div className="flag-line h-1.5" />
      <div className="mx-auto max-w-[1440px] px-4 pt-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_2fr]">
          <div>
            <span className="mb-8 block h-24 sm:h-28"><BrandLogo variant="full" alt={brand.name} /></span>
            <p className="headline text-3xl sm:text-4xl">{t("newsletter.title")}</p>
            <p className="mt-3 max-w-sm text-white/65">{t("newsletter.body")}</p>
            <div className="force-light mt-6 max-w-md rounded-3xl bg-white p-4 text-[#0d0d0d]">
              <Newsletter source="footer" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {cols.map((c) => (
              <div key={c.title}>
                <p className="kicker text-white/45">{c.title}</p>
                <ul className="mt-4 space-y-2.5 text-[15px]">
                  {c.links.map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="text-white/80 transition-colors hover:text-[#ffc400]">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-white/10 py-7 text-xs text-white/55 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 flex items-center gap-1.5 font-semibold text-white">
              <IconLock className="h-4 w-4" /> {t("footer.pay")}
            </span>
            {PAY.map((p) => (
              <span key={p} className="rounded-md border border-white/15 px-2.5 py-1 font-semibold text-white/80">
                {p}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <LanguageSwitcher current={locale} />
            {socials.map(([k, v]) => (
              <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="capitalize hover:text-white">
                {k}
              </a>
            ))}
            <span>
              © {year} {brand.name} · {t("footer.made")}
            </span>
          </div>
        </div>
      </div>
      <p aria-hidden className="mega pointer-events-none select-none whitespace-nowrap px-2 pb-2 text-center text-[13.5vw] leading-[0.8] text-white/[0.07]">
        {brand.name}
      </p>
    </footer>
  );
}
