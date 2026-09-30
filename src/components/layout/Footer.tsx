import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { getT } from "@/lib/i18n/server";
import type { BrandSettings } from "@/lib/brand";
import { Newsletter } from "@/components/home/Newsletter";

export async function Footer({ brand }: { brand: BrandSettings }) {
  const t = await getT();
  const year = new Date().getFullYear();
  const cols = [
    { title: t("footer.shop"), links: [["/shop", t("nav.shop")], ["/collections", t("nav.collections")], ["/drops", t("nav.drops")]] },
    { title: t("footer.brand"), links: [["/about", t("nav.about")], ["/journal", t("nav.journal")], ["/community", t("nav.community")]] },
    { title: t("footer.help"), links: [["/shipping", t("footer.shipping")], ["/returns", t("footer.returns")], ["/contact", t("footer.contact")], ["/account", t("nav.account")]] },
    { title: t("footer.legal"), links: [["/privacy", t("footer.privacy")], ["/terms", t("footer.terms")], ["/cookies", t("footer.cookies")]] },
  ];
  const socials = Object.entries(brand.socialLinks).filter(([, v]) => Boolean(v));

  return (
    <footer className="relative overflow-hidden bg-ink text-bone">
      <div className="mx-auto max-w-[1600px] px-4 pt-20 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <p className="eyebrow text-oro-2">{t("newsletter.title")}</p>
            <p className="serif mt-4 max-w-md text-3xl leading-tight text-bone/90 sm:text-4xl">{t("newsletter.body")}</p>
            <div className="mt-8 max-w-md">
              <Newsletter dark source="footer" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {cols.map((c) => (
              <div key={c.title}>
                <p className="eyebrow text-bone/45">{c.title}</p>
                <ul className="mt-5 space-y-3 text-sm">
                  {c.links.map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="link-u text-bone/85 hover:text-bone">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-4 border-t border-bone/10 py-8 text-xs text-bone/50 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark name={brand.name} className="text-sm text-bone" />
          <p>{t("footer.made")}</p>
          <div className="flex gap-5">
            {socials.map(([k, v]) => (
              <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="link-u capitalize hover:text-bone">
                {k}
              </a>
            ))}
            <span>© {year} {brand.name}</span>
          </div>
        </div>
      </div>
      <div aria-hidden className="display pointer-events-none select-none whitespace-nowrap px-2 text-center text-[26vw] leading-[0.78] text-bone/[0.04]">
        {brand.name}
      </div>
    </footer>
  );
}
