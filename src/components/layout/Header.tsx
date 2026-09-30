"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Wordmark } from "@/components/brand/Wordmark";
import { useT } from "@/components/providers/I18nProvider";

export function Header({ brandName, cartCount }: { brandName: string; cartCount: number }) {
  const t = useT();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const overHero = pathname === "/" && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const links = [
    { href: "/shop", label: t("nav.shop") },
    { href: "/collections", label: t("nav.collections") },
    { href: "/drops", label: t("nav.drops") },
    { href: "/journal", label: t("nav.journal") },
    { href: "/community", label: t("nav.community") },
    { href: "/about", label: t("nav.about") },
  ];

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,color,backdrop-filter,border-color] duration-500 ${
          overHero ? "text-bone" : "border-b border-ink/10 bg-warm/85 text-ink backdrop-blur-xl"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:h-[72px] sm:px-8">
          <button onClick={() => setOpen(true)} className="eyebrow flex items-center gap-3 lg:hidden" aria-label={t("nav.menu")}>
            <span className="flex w-5 flex-col gap-[5px]">
              <span className="h-px w-full bg-current" />
              <span className="h-px w-3/4 bg-current" />
            </span>
          </button>

          <nav className="hidden items-center gap-8 lg:flex">
            {links.slice(0, 4).map((l) => (
              <Link key={l.href} href={l.href} className={`eyebrow link-u ${pathname.startsWith(l.href) ? "opacity-100" : "opacity-75 hover:opacity-100"}`}>
                {l.label}
              </Link>
            ))}
          </nav>

          <Link href="/" className="absolute left-1/2 -translate-x-1/2 text-[15px] sm:text-base" aria-label={brandName}>
            <Wordmark name={brandName} />
          </Link>

          <div className="flex items-center gap-5 sm:gap-8">
            <Link href="/community" className="eyebrow link-u hidden opacity-75 hover:opacity-100 lg:inline">
              {t("nav.community")}
            </Link>
            <Link href="/account" className="eyebrow link-u hidden opacity-75 hover:opacity-100 sm:inline">
              {t("nav.account")}
            </Link>
            <Link href="/cart" className="eyebrow flex items-center gap-2" aria-label={t("nav.cart")}>
              <span className="hidden sm:inline">{t("nav.cart")}</span>
              <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[10px] tracking-normal ${cartCount > 0 ? "bg-rojo text-white" : overHero ? "border border-bone/40" : "border border-ink/25"}`}>
                {cartCount}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col bg-ink text-bone"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex h-16 items-center justify-between px-4">
              <Wordmark name={brandName} className="text-[15px]" />
              <button onClick={() => setOpen(false)} className="eyebrow">
                {t("nav.close")}
              </button>
            </div>
            <nav className="flex flex-1 flex-col justify-center gap-1 px-4">
              {[...links, { href: "/account", label: t("nav.account") }].map((l, i) => (
                <motion.div key={l.href} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
                  <Link href={l.href} className="display block text-[15vw] leading-[0.95] hover:text-rojo">
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <p className="eyebrow px-4 pb-8 text-bone/50">{t("footer.made")}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
