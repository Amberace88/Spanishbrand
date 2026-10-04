import Link from "next/link";
import Image from "next/image";
import { getT, getLocale } from "@/lib/i18n/server";
import type { BrandSettings } from "@/lib/brand";
import { Newsletter } from "@/components/home/Newsletter";
import { IconLock } from "@/components/ui/Icons";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { BrandLogo } from "@/components/brand/Wordmark";

// Bizum is shown only once it is enabled in Stripe (Dashboard → Payment methods) and flagged here.
const PAY = ["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay", ...(process.env.NEXT_PUBLIC_PAYMENT_BIZUM === "1" ? ["Bizum"] : [])];

/** Card-like payment marks (type only: no third-party logos are bundled). */
function PayMark({ name }: { name: string }) {
  const style: Record<string, string> = {
    Visa: "italic tracking-tight text-[#1a1f71]",
    Mastercard: "text-[#1c1712]",
    Amex: "!bg-[#2e77bc] text-white",
    "Apple Pay": "text-[#0b0b0b]",
    "Google Pay": "text-[#3c4043]",
    Bizum: "text-[#05c3dd]",
  };
  return (
    <span className={`inline-grid h-7 min-w-[3.25rem] place-items-center rounded-[6px] bg-white px-2 text-[11px] font-extrabold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] ${style[name] ?? "text-[#0b0b0b]"}`}>
      {name}
    </span>
  );
}

export async function Footer({ brand }: { brand: BrandSettings }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const year = new Date().getFullYear();
  const cols = [
    { title: t("footer.shop"), links: [["/shop", t("nav.new")], ["/deportes", t("nav.sports")], ["/personaliza", t("nav.personalize")], ["/regalos", t("nav.gifts")], ["/collections", t("nav.collections")], ["/regiones", t("nav.regions")]] },
    { title: t("footer.help"), links: [["/shipping", t("footer.shipping")], ["/returns", t("footer.returns")], ["/returns/new", t("returns.cta")], ["/contact", t("footer.contact")], ["/account", t("nav.account")]] },
    { title: t("footer.brand"), links: [["/about", t("nav.about")], ["/club", t("nav.club")], ["/empresas", t("nav.business")], ["/creadores", t("nav.creators")], ["/journal", t("nav.journal")], ["/community", t("nav.community")]] },
    { title: t("footer.legal"), links: [["/privacy", t("footer.privacy")], ["/terms", t("footer.terms")], ["/cookies", t("footer.cookies")]] },
  ];
  const socials = Object.entries(brand.socialLinks).filter(([, v]) => Boolean(v));

  return (
    <footer className="relative overflow-hidden bg-[#0b0b0b] text-white">
      <div className="flag-line h-1.5" />

      {/* newsletter: one wide band, headline left, form right */}
      <div id="newsletter" className="scroll-mt-24 border-b border-white/10">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-12 sm:px-8 sm:py-14 lg:grid-cols-[1fr_minmax(0,30rem)] lg:items-center lg:gap-16">
          <div>
            <p className="headline text-[2.2rem] leading-[0.95] sm:text-5xl">{t("newsletter.title")}</p>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/65">{t("newsletter.body")}</p>
          </div>
          <div className="force-light rounded-3xl bg-white p-4 text-[#0d0d0d] sm:p-5">
            <Newsletter source="footer" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 pt-12 sm:px-8 sm:pt-14">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
          <div className="max-w-sm">
            <span className="block h-20 w-fit sm:h-24">
              <BrandLogo variant="full" alt={brand.name} />
            </span>
            <p className="mt-6 text-[15px] leading-relaxed text-white/60">{t("footer.about")}</p>
            {socials.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {socials.map(([k, v]) => (
                  <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/15 px-3.5 py-1.5 text-[13px] font-semibold capitalize text-white/80 transition-colors hover:border-[#e0b84a] hover:text-[#e0b84a]">
                    {k}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {cols.map((c) => (
              <div key={c.title}>
                <p className="flex items-center gap-2 text-[13px] font-semibold text-[#e0b84a]">
                  <span className="h-px w-4 bg-[#e0b84a]/60" aria-hidden />
                  {c.title}
                </p>
                <ul className="mt-4 space-y-1">
                  {c.links.map(([href, label]) => (
                    <li key={href}>
                      {/* 40px rows: comfortable tap targets on phones */}
                      <Link href={href} className="inline-flex min-h-10 items-center text-[15px] text-white/75 transition-colors hover:text-white sm:min-h-8">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 flex items-center gap-1.5 text-xs font-semibold text-white/70">
              <IconLock className="h-4 w-4" /> {t("footer.pay")}
            </span>
            {PAY.map((p) => (
              <PayMark key={p} name={p} />
            ))}
          </div>
          <LanguageSwitcher current={locale} />
        </div>
        <div className="flex flex-col gap-1 py-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {year} {brand.name}
          </span>
          <span>{t("footer.made")}</span>
        </div>
      </div>

      {/* sign-off: the crowned lion over the house name, cut by the page edge */}
      <div aria-hidden className="pointer-events-none relative select-none">
        <div className="absolute left-1/2 top-[8%] z-10 h-[clamp(3.5rem,9vw,8.5rem)] w-[clamp(3.5rem,9vw,8.5rem)] -translate-x-1/2 overflow-hidden rounded-full bg-[#0b0b0b] ring-2 ring-[#e0b84a]/70">
          <Image src="/brand/logo-lion.webp" alt="" fill sizes="136px" className="object-contain p-[16%]" />
        </div>
        <p className="mega whitespace-nowrap px-2 pt-[clamp(3rem,7vw,7rem)] text-center text-[13.5vw] leading-[0.78] text-transparent [-webkit-text-stroke:1px_rgba(224,184,74,0.35)] sm:[-webkit-text-stroke:1.5px_rgba(224,184,74,0.35)]">
          {brand.name}
        </p>
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0b0b0b] to-transparent" />
      </div>
    </footer>
  );
}
