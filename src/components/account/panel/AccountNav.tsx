"use client";
import "./account.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ArrowUpRight, Crown, LayoutDashboard, LogOut, Package, RotateCcw, ShieldCheck, UserRound } from "lucide-react";

export type AccountNavIcon = "overview" | "orders" | "club" | "returns" | "profile";
export type AccountNavItem = { href: string; label: string; icon: AccountNavIcon };

const ICONS = { overview: LayoutDashboard, orders: Package, club: Crown, returns: RotateCcw, profile: UserRound } as const;

/** The overview is the shell root: exact match only; other sections also own their sub-pages. */
function isActive(pathname: string, href: string, icon: AccountNavIcon) {
  return icon === "overview" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

type Props = {
  items: AccountNavItem[];
  admin: { label: string; sub: string } | null;
  signOut: { label: string; action: () => Promise<void> };
  label: string;
};

/** Desktop: vertical list inside the ink sidebar. */
export function AccountNavList({ items, admin, signOut, label }: Props) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="flex flex-col gap-1">
      {items.map(({ href, label: l, icon }) => {
        const Icon = ICONS[icon];
        return (
          <Link key={href} href={href} className="ac-link" aria-current={isActive(pathname, href, icon) ? "page" : undefined}>
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {l}
          </Link>
        );
      })}
      {admin && (
        <Link href="/admin" className="ac-admin mt-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e0b84a] text-[#1c1712]">
            <ShieldCheck className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.92rem] font-bold leading-tight">{admin.label}</span>
            <span className="block text-xs text-[#f5f1e8]/60">{admin.sub}</span>
          </span>
          <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      )}
      <form action={signOut.action} className="mt-4 border-t border-white/10 pt-4">
        <button className="ac-link w-full text-left text-[#f5f1e8]/55">
          <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden />
          {signOut.label}
        </button>
      </form>
    </nav>
  );
}

/** Phones / tablets: horizontally scrolling pill tabs; the active tab is kept in view. */
export function AccountNavTabs({ items, admin, signOut, label }: Props) {
  const pathname = usePathname();
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const r = rail.current;
    const a = r?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!r || !a) return;
    // horizontal only — never scroll the page vertically
    const target = a.offsetLeft - (r.clientWidth - a.offsetWidth) / 2;
    r.scrollTo({ left: Math.max(0, target), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [pathname]);

  return (
    <nav aria-label={label}>
      <div ref={rail} className="ac-tabs">
        {items.map(({ href, label: l, icon }) => {
          const Icon = ICONS[icon];
          return (
            <Link key={href} href={href} className="ac-tab" aria-current={isActive(pathname, href, icon) ? "page" : undefined}>
              <Icon aria-hidden />
              {l}
            </Link>
          );
        })}
        {admin && (
          <Link href="/admin" className="ac-tab" data-kind="admin">
            <ShieldCheck aria-hidden />
            {admin.label}
          </Link>
        )}
        <form action={signOut.action} className="flex flex-none">
          <button className="ac-tab" data-kind="quiet">
            <LogOut aria-hidden />
            {signOut.label}
          </button>
        </form>
      </div>
    </nav>
  );
}
