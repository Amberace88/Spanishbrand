"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/providers/I18nProvider";

const I = {
  home: (
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z" />
  ),
  shop: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  design: (
    <>
      <path d="m14.5 4.5 5 5L9 20H4v-5L14.5 4.5Z" />
      <path d="m12.5 6.5 5 5" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
};

/** App-style bottom navigation on phones (hidden on desktop and in checkout). */
export function MobileTabBar({ cartCount }: { cartCount: number }) {
  const t = useT();
  const path = usePathname() ?? "/";
  if (/^\/(checkout|order-success)/.test(path)) return null;
  const items: { href: string; label: string; icon: keyof typeof I; active: boolean; badge?: number }[] = [
    { href: "/", label: t("nav.home"), icon: "home", active: path === "/" },
    { href: "/shop", label: t("nav.shop"), icon: "shop", active: /^\/(shop|products|collections|deportes|regiones|regalos)/.test(path) },
    { href: "/disena", label: t("nav.design"), icon: "design", active: /^\/(disena|personaliza)/.test(path) },
    { href: "/cart", label: t("nav.cart"), icon: "bag", active: path.startsWith("/cart"), badge: cartCount },
    { href: "/account", label: t("nav.account"), icon: "user", active: /^\/(account|club)/.test(path) },
  ];
  return (
    <>
      <div className="h-[calc(64px+env(safe-area-inset-bottom))] lg:hidden" aria-hidden />
      <nav
        aria-label="App"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl supports-[backdrop-filter]:bg-bg/75 lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
          {items.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={it.active ? "page" : undefined}
                className={`relative flex h-full flex-col items-center justify-center gap-1 text-[10.5px] font-semibold tracking-wide transition-colors ${it.active ? "text-accent" : "text-muted active:text-fg"}`}
              >
                {it.active && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-accent" />}
                <span className="relative">
                  <svg viewBox="0 0 24 24" className={`h-[22px] w-[22px] transition-transform ${it.active ? "scale-110" : ""}`} fill="none" stroke="currentColor" strokeWidth={it.active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {I[it.icon]}
                  </svg>
                  {it.badge ? (
                    <span className="absolute -right-2.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white tabular-nums">{it.badge > 9 ? "9+" : it.badge}</span>
                  ) : null}
                </span>
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
