"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Wordmark } from "@/components/brand/Wordmark";
import { useT } from "@/components/providers/I18nProvider";
import { IconBag, IconClose, IconMenu, IconSearch, IconUser } from "@/components/ui/Icons";

const CATS = ["APPAREL", "HEADWEAR", "BAGS", "DRINKWARE", "WALL_ART", "HOME_LIVING"] as const;

function AnnouncementBar({ messages }: { messages: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (messages.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % messages.length), 4500);
    return () => clearInterval(id);
  }, [messages.length]);
  return (
    <div className="relative bg-rojo text-white">
      <div className="mx-auto flex h-9 max-w-[1440px] items-center justify-center overflow-hidden px-4 text-center text-[12.5px] font-medium sm:text-[13px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={i} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.35 }} className="truncate">
            {messages[i]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="flag-line h-[3px]" />
    </div>
  );
}

export function Header({ brandName, cartCount, messages }: { brandName: string; cartCount: number; messages: string[] }) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const nav = [
    { href: "/shop", label: t("nav.new") },
    ...CATS.map((c) => ({ href: `/shop?c=${c}`, label: t(`nav.cat.${c}` as never) })),
    { href: "/collections", label: t("nav.collections") },
    { href: "/drops", label: t("nav.drops") },
  ];
  const secondary = [
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
        <AnnouncementBar messages={messages} />
        <header className={`border-b bg-white/95 backdrop-blur-xl transition-shadow duration-300 ${scrolled ? "border-ink/10 shadow-[0_6px_24px_-12px_rgba(28,23,18,0.18)]" : "border-ink/[0.07]"}`}>
          <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:h-[72px] sm:px-8">
            <button onClick={() => setOpen(true)} className="-ml-1 grid h-10 w-10 place-items-center rounded-full hover:bg-cream lg:hidden" aria-label={t("nav.menu")}>
              <IconMenu className="h-6 w-6" />
            </button>
            <Link href="/" className="text-[15px] text-ink sm:text-base" aria-label={brandName}>
              <Wordmark name={brandName} />
            </Link>

            <form onSubmit={search} className="mx-auto hidden w-full max-w-xl md:block" role="search">
              <label className="relative block">
                <span className="sr-only">{t("nav.search")}</span>
                <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("nav.searchPlaceholder")}
                  className="h-11 w-full rounded-full border border-ink/10 bg-cream pl-11 pr-4 text-sm outline-none transition placeholder:text-stone focus:border-ink/30 focus:bg-white focus:shadow-[0_0_0_4px_rgba(28,23,18,0.05)]"
                />
              </label>
            </form>

            <div className="ml-auto flex items-center gap-1 sm:gap-2 md:ml-0">
              <Link href="/shop" className="grid h-10 w-10 place-items-center rounded-full hover:bg-cream md:hidden" aria-label={t("nav.search")}>
                <IconSearch className="h-[22px] w-[22px]" />
              </Link>
              <Link href="/account" className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-medium hover:bg-cream sm:flex" aria-label={t("nav.account")}>
                <IconUser className="h-[22px] w-[22px]" />
                <span className="hidden xl:inline">{t("nav.account")}</span>
              </Link>
              <Link href="/cart" className="relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium hover:bg-cream" aria-label={t("nav.cart")}>
                <span className="relative">
                  <IconBag className="h-[22px] w-[22px]" />
                  <span className={`absolute -right-2 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold ${cartCount > 0 ? "bg-rojo text-white" : "bg-ink/10 text-ink"}`}>{cartCount}</span>
                </span>
                <span className="hidden xl:inline">{t("nav.cart")}</span>
              </Link>
            </div>
          </div>

          <nav className="hidden border-t border-ink/[0.06] lg:block" aria-label="Categorías">
            <ul className="mx-auto flex h-12 max-w-[1440px] items-center gap-1 px-6 text-[14px] font-medium">
              {nav.map((l) => {
                const active = l.href === "/shop" ? pathname === "/shop" : pathname.startsWith(l.href.split("?")[0]) && l.href !== "/shop" && !l.href.includes("?");
                return (
                  <li key={l.href}>
                    <Link href={l.href} className={`rounded-full px-3.5 py-2 transition-colors hover:bg-cream hover:text-ink ${active ? "text-rojo" : "text-ink/80"}`}>
                      {l.label}
                    </Link>
                  </li>
                );
              })}
              <li className="ml-auto flex items-center gap-1">
                {secondary.slice(0, 3).map((l) => (
                  <Link key={l.href} href={l.href} className="rounded-full px-3 py-2 text-[13px] text-stone-2 hover:bg-cream hover:text-ink">
                    {l.label}
                  </Link>
                ))}
              </li>
            </ul>
          </nav>
        </header>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              className="fixed inset-y-0 left-0 z-[61] flex w-[88vw] max-w-sm flex-col bg-white shadow-2xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flag-line h-1" />
              <div className="flex h-16 items-center justify-between px-5">
                <Wordmark name={brandName} className="text-[15px]" />
                <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-cream" aria-label={t("nav.close")}>
                  <IconClose className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={search} className="px-5 pb-3" role="search">
                <label className="relative block">
                  <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("nav.searchPlaceholder")} className="h-12 w-full rounded-full border border-ink/10 bg-cream pl-11 pr-4 text-[15px] outline-none" />
                </label>
              </form>
              <nav className="flex-1 overflow-y-auto px-3 pb-6">
                {nav.map((l, i) => (
                  <motion.div key={l.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + i * 0.03 }}>
                    <Link href={l.href} className="flex items-center justify-between rounded-xl px-3 py-3.5 text-[17px] font-semibold hover:bg-cream">
                      {l.label} <span className="text-stone">›</span>
                    </Link>
                  </motion.div>
                ))}
                <div className="mx-3 my-4 h-px bg-ink/10" />
                {secondary.map((l) => (
                  <Link key={l.href} href={l.href} className="block rounded-xl px-3 py-2.5 text-[15px] text-stone-2 hover:bg-cream hover:text-ink">
                    {l.label}
                  </Link>
                ))}
              </nav>
              <p className="border-t border-ink/10 px-5 py-4 text-xs text-stone">{t("footer.made")}</p>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
