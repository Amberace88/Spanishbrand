import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { getT } from "@/lib/i18n/server";
import type { BrandSettings } from "@/lib/brand";
import { Newsletter } from "@/components/home/Newsletter";
import { IconLock } from "@/components/ui/Icons";

const PAY = ["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay"];

export async function Footer({ brand }: { brand: BrandSettings }) {
  const t = await getT();
  const year = new Date().getFullYear();
  const cols = [
    { title: t("footer.shop"), links: [["/shop", t("nav.new")], ["/shop?c=APPAREL", t("nav.cat.APPAREL")], ["/shop?c=HEADWEAR", t("nav.cat.HEADWEAR")], ["/shop?c=DRINKWARE", t("nav.cat.DRINKWARE")], ["/collections", t("nav.collections")], ["/drops", t("nav.drops")]] },
    { title: t("footer.help"), links: [["/shipping", t("footer.shipping")], ["/returns", t("footer.returns")], ["/contact", t("footer.contact")], ["/account", t("nav.account")]] },
    { title: t("footer.brand"), links: [["/about", t("nav.about")], ["/journal", t("nav.journal")], ["/community", t("nav.community")]] },
    { title: t("footer.legal"), links: [["/privacy", t("footer.privacy")], ["/terms", t("footer.terms")], ["/cookies", t("footer.cookies")]] },
  ];
  const socials = Object.entries(brand.socialLinks).filter(([, v]) => Boolean(v));

  return (
    <footer className="relative bg-cream text-ink">
      <div className="flag-line h-1.5" />
      <div className="border-b border-ink/[0.08] bg-oro-50">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-10 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="headline text-2xl sm:text-3xl">{t("newsletter.title")}</p>
            <p className="mt-2 max-w-md text-stone-2">{t("newsletter.body")}</p>
          </div>
          <Newsletter source="footer" />
        </div>
      </div>
      <div className="mx-auto max-w-[1440px] px-4 pt-14 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_2fr]">
          <div>
            <Wordmark name={brand.name} className="text-base" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-stone-2">{t("footer.about")}</p>
            {socials.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {socials.map(([k, v]) => (
                  <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-medium capitalize hover:border-ink/30">
                    {k}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {cols.map((c) => (
              <div key={c.title}>
                <p className="text-sm font-bold">{c.title}</p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {c.links.map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="text-stone-2 transition-colors hover:text-rojo">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-ink/10 py-7 text-xs text-stone-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 flex items-center gap-1.5 font-semibold text-ink">
              <IconLock className="h-4 w-4" /> {t("footer.pay")}
            </span>
            {PAY.map((p) => (
              <span key={p} className="rounded-md border border-ink/10 bg-white px-2.5 py-1 font-semibold text-ink/80">
                {p}
              </span>
            ))}
          </div>
          <p>{t("footer.made")}</p>
          <p>
            © {year} {brand.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
