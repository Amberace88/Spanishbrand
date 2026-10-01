"use client";
import { LanguageMenu } from "@/components/layout/LanguageMenu";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Wordmark } from "@/components/brand/Wordmark";
import { useT } from "@/components/providers/I18nProvider";
import { IconArrow, IconBag, IconClose, IconMenu, IconSearch, IconUser } from "@/components/ui/Icons";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const CATS = ["APPAREL", "HEADWEAR", "BAGS", "DRINKWARE", "WALL_ART", "HOME_LIVING"] as const;
const ease = [0.16, 1, 0.3, 1] as const;

/** Continuous ticker — black in day mode, white in night mode. */
function Ticker({ messages }: { messages: string[] }) {
  const items = [...messages, ...messages];
  return (
    <div className="relative overflow-hidden bg-fg text-bg">
      <div className="marquee-track flex w-max items-center whitespace-nowrap py-2 text-[12px] font-semibold uppercase tracking-[0.12em]">
        {[0, 1].map((k) => (
          <div key={k} className="flex items-center" aria-hidden={k === 1}>
            {items.map((m, i) => (
              <span key={i} className="flex items-center">
                <span className="px-6">{m}</span>
                <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Header({ brandName, cartCount, messages }: { brandName: string; cartCount: number; messages: string[] }) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);
  useEffect(() => {
    const onSearch = () => setSearchOpen(true);
    window.addEventListener("ryg:search", onSearch);
    return () => window.removeEventListener("ryg:search", onSearch);
  }, []);
  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSearchOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const nav = [
    { href: "/shop", label: t("nav.shop") },
    { href: "/deportes", label: t("nav.sports") },
    { href: "/personaliza", label: t("nav.personalize") },
    { href: "/disena", label: t("hero3.design"), badge: true },
    { href: "/collections", label: t("nav.collections") },
    { href: "/regiones", label: t("nav.regions") },
    { href: "/club", label: t("nav.club") },
  ] as { href: string; label: string; badge?: boolean }[];
  const cats = CATS.map((c) => ({ href: `/shop?c=${c}`, label: t(`nav.cat.${c}` as never) }));
  const secondary = [
    { href: "/regalos", label: t("nav.gifts") },
    { href: "/causas", label: t("nav.causes") },
    { href: "/about", label: t("nav.about") },
    { href: "/journal", label: t("nav.journal") },
    { href: "/community", label: t("nav.community") },
    { href: "/account", label: t("nav.account") },
  ];

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
  };

  return (
    <>
      <div className="sticky top-0 z-50">
        {/* installed app (iOS black-translucent status bar): dark strip keeps the white clock readable in both themes */}
        <div className="h-[env(safe-area-inset-top)] bg-[#0b0b0b]" aria-hidden />
        <Ticker messages={messages} />
        <header className={`border-b backdrop-blur-xl transition-colors duration-300 ${scrolled ? "border-line bg-bg/80" : "border-transparent bg-bg"}`}>
          <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:h-[68px] sm:px-8">
            <div className="flex items-center gap-1">
              <button onClick={() => setOpen(true)} className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-fg/[0.06] xl:hidden" aria-label={t("nav.menu")}>
                <IconMenu className="h-6 w-6" />
              </button>
              <LanguageMenu align="left" className="xl:hidden" />
              <Link href="/" className="hidden text-fg xl:block" aria-label={brandName}>
                <Wordmark name={brandName} />
              </Link>
            </div>

            <Link href="/" className="text-fg xl:hidden" aria-label={brandName}>
              <Wordmark name={brandName} className="text-[13px] sm:text-base" />
            </Link>
            <nav className="hidden xl:block" aria-label="Categorías">
              <ul className="flex items-center gap-0.5 text-[13px] font-semibold uppercase tracking-[0.06em]">
                {nav.map((l) => {
                  const base = l.href.split("?")[0];
                  const active = l.href.includes("?") ? false : l.href === "/shop" ? pathname === "/shop" : pathname.startsWith(base);
                  return (
                    <li key={l.href}>
                      <Link href={l.href} className={`group relative block px-3 py-2 transition-colors ${active ? "text-accent" : "text-fg/80 hover:text-fg"}`}>
                        {l.label}
                        {l.badge && <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 align-middle text-[9px] font-bold text-white">NEW</span>}
                        <span className={`absolute inset-x-3 -bottom-0.5 h-[2px] origin-left bg-accent transition-transform duration-300 ${active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="flex items-center justify-end gap-0.5">
              <LanguageMenu className="hidden xl:block" />
              <button onClick={() => setSearchOpen(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-fg/[0.06]" aria-label={t("nav.search")}>
                <IconSearch className="h-[21px] w-[21px]" />
              </button>
              <ThemeToggle />
              <Link href="/account" className="hidden h-10 w-10 place-items-center rounded-full hover:bg-fg/[0.06] sm:grid" aria-label={t("nav.account")}>
                <IconUser className="h-[21px] w-[21px]" />
              </Link>
              <Link href="/cart" className="relative ml-1 flex h-10 items-center gap-2 rounded-full bg-fg px-4 text-[13px] font-semibold text-bg transition-transform hover:-translate-y-px" aria-label={t("nav.cart")}>
                <IconBag className="h-[18px] w-[18px]" />
                <span className="tabular-nums">{cartCount}</span>
              </Link>
            </div>
          </div>
        </header>
      </div>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div className="fixed inset-0 z-[70] bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="mx-auto max-w-4xl px-4 pt-24 sm:px-8 sm:pt-32">
              <div className="flex items-center justify-between">
                <p className="kicker text-muted">{t("nav.search")}</p>
                <button onClick={() => setSearchOpen(false)} className="grid h-11 w-11 place-items-center rounded-full border border-line hover:border-fg" aria-label={t("nav.close")}>
                  <IconClose className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={search} role="search" className="mt-6">
                <motion.input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("nav.searchPlaceholder")}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, ease }}
                  className="headline w-full border-b-2 border-fg bg-transparent pb-4 text-4xl outline-none placeholder:text-fg/25 sm:text-6xl"
                />
              </form>
              <div className="mt-8 flex flex-wrap gap-2">
                {cats.map((l) => (
                  <Link key={l.href} href={l.href} className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-fg">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col bg-bg pt-[env(safe-area-inset-top)]"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.6, ease }}
          >
            <div className="flex h-16 items-center justify-between px-4">
              <Wordmark name={brandName} className="text-[15px]" />
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-fg/[0.06]" aria-label={t("nav.close")}>
                  <IconClose className="h-6 w-6" />
                </button>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto px-4 pt-4">
              {nav.map((l, i) => (
                <motion.div key={l.href} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.04, duration: 0.6, ease }}>
                  <Link href={l.href} className="group flex items-center justify-between border-b border-line py-3">
                    <span className="headline text-[2.4rem] uppercase group-hover:text-accent">{l.label}</span>
                    <IconArrow className="h-6 w-6 -rotate-45 text-muted transition-transform group-hover:rotate-0 group-hover:text-accent" />
                  </Link>
                </motion.div>
              ))}
              <div className="flex flex-wrap gap-x-6 gap-y-2 py-6">
                {secondary.map((l) => (
                  <Link key={l.href} href={l.href} className="text-[15px] font-medium text-muted hover:text-fg">
                    {l.label}
                  </Link>
                ))}
              </div>
            </nav>
            <div className="flag-line h-1.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
