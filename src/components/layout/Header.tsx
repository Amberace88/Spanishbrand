"use client";
import { LanguageMenu } from "@/components/layout/LanguageMenu";
import { CITIES } from "@/lib/catalog/cities";
import { AUDIENCES } from "@/lib/catalog/audience";
import { CATEGORY_LINKS, COLLECTION_THEMES, TOPIC_THEMES, type L3 } from "@/lib/catalog/themes";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Wordmark } from "@/components/brand/Wordmark";
import { useLocale, useT } from "@/components/providers/I18nProvider";
import { IconArrow, IconBag, IconClose, IconMenu, IconSearch } from "@/components/ui/Icons";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SoundToggle } from "@/components/layout/SoundToggle";
import { AccountMenu } from "@/components/layout/AccountMenu";

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Mega menu / drawer columns (lib/catalog/themes.ts): Categorías · Para quién · Colecciones · Temas.
 * Only curated, active lines are linked (retired collections such as Mi pueblo or Estilo militar are gone).
 */
const EXPLORE = [
  { key: "colecciones", title: { es: "Colecciones", en: "Collections", de: "Kollektionen" }, wide: true, links: COLLECTION_THEMES.map((x) => ({ href: x.href, label: x.label })) },
  { key: "temas", title: { es: "Temas", en: "Themes", de: "Themen" }, wide: false, links: TOPIC_THEMES },
];

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

export function Header({ brandName, cartCount, messages, emptyHrefs = [] }: { brandName: string; cartCount: number; messages: string[]; /** Menu targets with nothing to buy right now (hidden). */ emptyHrefs?: string[] }) {
  const t = useT();
  const locale = useLocale() as string;
  const lx = (l: L3) => (locale === "en" ? l.en : locale === "de" ? l.de : l.es);
  const [mega, setMega] = useState(false);
  const megaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const megaOpen = () => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
    setMega(true);
  };
  const megaClose = () => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
    megaTimer.current = setTimeout(() => setMega(false), 140);
  };
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
    setMega(false);
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
    { href: "/arte", label: t("nav.art" as never) },
    { href: "/lookbook", label: locale === "en" ? "Lookbook" : locale === "de" ? "Lookbook" : "Lookbook" },
    { href: "/deportes", label: t("nav.sports") },
    { href: "/personaliza", label: t("nav.personalize") },
    { href: "/disena", label: t("hero3.design"), badge: true },
    { href: "/club", label: t("nav.club") },
  ] as { href: string; label: string; badge?: boolean }[];
  const hidden = new Set(emptyHrefs);
  const cats = CATEGORY_LINKS.filter((c) => !hidden.has(c.href)).map((c) => ({ href: c.href, label: lx(c.label) }));
  /** Mega menu / drawer groups: "Para quién" first, then the editorial EXPLORE columns. */
  const groups = [
    { key: "para", title: t("audience.title"), wide: false, links: AUDIENCES.map((a) => ({ href: `/para/${a}`, label: t(`audience.${a}`) })) },
    ...EXPLORE.map((g) => ({ key: g.key, title: lx(g.title), wide: g.wide, links: g.links.filter((x) => !hidden.has(x.href)).map((x) => ({ href: x.href, label: lx(x.label) })) })),
  ];
  const secondary = [
    { href: "/regalos", label: t("nav.gifts") },
    { href: "/causas", label: t("nav.causes") },
    { href: "/about", label: t("nav.about") },
    { href: "/journal", label: t("nav.journal") },
    { href: "/community", label: t("nav.community") },
    { href: "/account", label: t("nav.account") },
  ];

  const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const cityHits = q.trim().length >= 2 ? CITIES.filter((c) => fold(`${c.label} ${c.name}`).includes(fold(q))).slice(0, 6) : [];
  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const exact = CITIES.find((c) => fold(c.label) === fold(q) || fold(c.name) === fold(q));
    setSearchOpen(false);
    router.push(exact ? `/ciudades/${exact.slug}` : q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
  };

  return (
    <>
      <div className="sticky top-0 z-50">
        {/* installed app (iOS black-translucent status bar): dark strip keeps the white clock readable in both themes */}
        <div className="h-[env(safe-area-inset-top)] bg-[#0b0b0b]" aria-hidden />
        <Ticker messages={messages} />
        <header className={`relative border-b backdrop-blur-xl transition-colors duration-300 ${scrolled ? "border-line bg-bg/80" : "border-transparent bg-bg"}`}>
          <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:h-[68px] sm:px-8 xl:grid-cols-[auto_1fr_auto] xl:gap-0">
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
            <nav className="hidden xl:block xl:px-10 2xl:px-16" aria-label="Categorías">
              {/* the menu spans the whole bar between logo and icons, items evenly spaced */}
              <ul className="flex w-full items-center justify-between text-[13.5px] font-semibold uppercase tracking-[0.08em]">
                {nav.map((l) => {
                  const base = l.href.split("?")[0];
                  const active = l.href.includes("?") ? false : l.href === "/shop" ? pathname === "/shop" : pathname.startsWith(base);
                  return (
                    <li key={l.href} {...(l.href === "/shop" ? { onMouseEnter: megaOpen, onMouseLeave: megaClose, onFocus: megaOpen } : {})}>
                      <Link href={l.href} aria-expanded={l.href === "/shop" ? mega : undefined} className={`group relative block whitespace-nowrap px-2 py-2 transition-colors 2xl:px-3 ${active ? "text-accent" : "text-fg/80 hover:text-fg"}`}>
                        {l.label}
                        {l.href === "/shop" && <span className={`ml-1 inline-block text-[9px] transition-transform ${mega ? "rotate-180" : ""}`} aria-hidden>▾</span>}
                        {l.badge && <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 align-middle text-[9px] font-bold text-white">NEW</span>}
                        <span className={`absolute inset-x-2 -bottom-0.5 2xl:inset-x-3 h-[2px] origin-left bg-accent transition-transform duration-300 ${active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
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
              <SoundToggle />
              {/* phones: theme switch and account live in the menu drawer, so the cart never gets pushed off-screen */}
              <div className="hidden sm:contents">
                <ThemeToggle />
                <AccountMenu />
              </div>
              <Link href="/cart" className="relative ml-1 flex h-10 items-center gap-2 rounded-full bg-fg px-4 text-[13px] font-semibold text-bg transition-transform hover:-translate-y-px" aria-label={t("nav.cart")}>
                <IconBag className="h-[18px] w-[18px]" />
                <span className="tabular-nums">{cartCount}</span>
              </Link>
            </div>
          </div>
          {/* Tienda mega menu: products, collections and places in three calm columns */}
          <AnimatePresence>
            {mega && (
              <m.div
                onMouseEnter={megaOpen}
                onMouseLeave={megaClose}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease }}
                className="absolute inset-x-0 top-full hidden border-b border-line bg-bg/95 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)] backdrop-blur-xl xl:block"
              >
                <div className="mx-auto grid max-w-[1440px] grid-cols-[1fr_0.85fr_1.4fr_1fr_1.1fr] gap-9 px-8 py-9">
                  <div>
                    <p className="kicker text-muted">{lx({ es: "Categorías", en: "Categories", de: "Kategorien" })}</p>
                    <ul className="mt-4 space-y-2.5">
                      {cats.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href} className="text-[15px] font-semibold text-fg/85 transition-colors hover:text-accent">{c.label}</Link>
                        </li>
                      ))}
                      <li className="pt-2">
                        <Link href="/shop?all=1" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-accent">
                          {lx({ es: "Ver todo", en: "View all", de: "Alles ansehen" })} <IconArrow className="h-3.5 w-3.5" />
                        </Link>
                      </li>
                    </ul>
                  </div>
                  {groups.map((g) => (
                    <div key={g.key}>
                      <p className="kicker text-muted">{g.title}</p>
                      <ul className={`mt-4 grid gap-x-6 gap-y-2.5 ${g.wide ? "grid-cols-2" : ""}`}>
                        {g.links.map((x) => (
                          <li key={x.href}>
                            <Link href={x.href} className="text-[15px] font-semibold text-fg/85 transition-colors hover:text-accent">{x.label}</Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <Link href="/arte" className="group relative block overflow-hidden rounded-2xl bg-[#f3ead7] p-5 text-[#1c1a17]">
                    <p className="kicker text-[#a3162b]">{lx({ es: "Nuevo", en: "New", de: "Neu" })}</p>
                    <p className="headline mt-1 text-2xl uppercase leading-none">{lx({ es: "Arte que se lleva", en: "Wearable art", de: "Tragbare Kunst" })}</p>
                    <Image src={`${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1/object/public/print-files/site-art/art-toro.png`} alt="" width={128} height={128} className="ml-auto mt-2 h-32 w-32 object-contain transition-transform duration-500 group-hover:scale-110" />
                  </Link>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </header>
      </div>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <m.div className="fixed inset-0 z-[70] bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="mx-auto max-w-4xl px-4 pt-24 sm:px-8 sm:pt-32">
              <div className="flex items-center justify-between">
                <p className="kicker text-muted">{t("nav.search")}</p>
                <button onClick={() => setSearchOpen(false)} className="grid h-11 w-11 place-items-center rounded-full border border-line hover:border-fg" aria-label={t("nav.close")}>
                  <IconClose className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={search} role="search" className="mt-6">
                <m.input
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
              {cityHits.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {cityHits.map((c) => (
                    <Link key={c.slug} href={`/ciudades/${c.slug}`} onClick={() => setSearchOpen(false)} className="flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-sm font-semibold text-bg">
                      <span aria-hidden>📍</span> {c.label}
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-8 flex flex-wrap gap-2">
                <Link href="/ciudades" onClick={() => setSearchOpen(false)} className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-fg">
                  📍 {t("nav.cities")}
                </Link>
                {cats.map((l) => (
                  <Link key={l.href} href={l.href} className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-fg">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <m.div
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
                <m.div key={l.href} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.04, duration: 0.6, ease }}>
                  <Link href={l.href} className="group flex items-center justify-between border-b border-line py-3">
                    <span className="headline text-[2.4rem] uppercase group-hover:text-accent">{l.label}</span>
                    <IconArrow className="h-6 w-6 -rotate-45 text-muted transition-transform group-hover:rotate-0 group-hover:text-accent" />
                  </Link>
                </m.div>
              ))}
              <div className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
                <div>
                  <p className="kicker text-muted">{lx({ es: "Categorías", en: "Categories", de: "Kategorien" })}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cats.map((c) => (
                      <Link key={c.href} href={c.href} className="rounded-full border border-line px-3.5 py-1.5 text-sm font-semibold hover:border-fg">{c.label}</Link>
                    ))}
                  </div>
                </div>
                {groups.map((g) => (
                  <div key={g.key}>
                    <p className="kicker text-muted">{g.title}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {g.links.map((x) => (
                        <Link key={x.href} href={x.href} className="rounded-full border border-line px-3.5 py-1.5 text-sm font-semibold hover:border-fg">{x.label}</Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 py-6">
                {secondary.map((l) => (
                  <Link key={l.href} href={l.href} className="text-[15px] font-medium text-muted hover:text-fg">
                    {l.label}
                  </Link>
                ))}
              </div>
            </nav>
            <div className="flag-line h-1.5" />
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
