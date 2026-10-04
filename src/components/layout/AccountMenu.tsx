"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Crown, LayoutDashboard, LogOut, Package, ShieldCheck, UserRound } from "lucide-react";
import { useT } from "@/components/providers/I18nProvider";
import { IconUser } from "@/components/ui/Icons";
import { signOutAction } from "@/app/actions/account";

type Me = { signedIn: false } | { signedIn: true; email: string; name: string | null; staff: boolean };

/**
 * Header account button with a small menu. Session details are fetched lazily (first hover / focus / open),
 * so pages stay cacheable and anonymous visitors cost nothing.
 */
export function AccountMenu() {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const loading = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    if (me || loading.current) return;
    loading.current = true;
    fetch("/api/account/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { signedIn: false }))
      .then((d: Me) => setMe(d))
      .catch(() => setMe({ signedIn: false }))
      .finally(() => (loading.current = false));
  }, [me]);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const links = [
    { href: "/account", label: t("acct.nav.overview"), Icon: LayoutDashboard },
    { href: "/account/orders", label: t("acct.nav.orders"), Icon: Package },
    { href: "/account/club", label: t("acct.nav.club"), Icon: Crown },
    { href: "/account/profile", label: t("acct.nav.profile"), Icon: UserRound },
  ];
  const item = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-fg/85 transition-colors hover:bg-fg/[0.05] hover:text-fg focus-visible:bg-fg/[0.05] focus-visible:outline-none";

  return (
    <div ref={root} className="relative hidden sm:block" onPointerEnter={load}>
      <button
        type="button"
        onClick={() => {
          load();
          setOpen((o) => !o);
        }}
        onFocus={load}
        className="grid h-10 w-10 place-items-center rounded-full hover:bg-fg/[0.06]"
        aria-label={t("nav.account")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <IconUser className="h-[21px] w-[21px]" />
      </button>
      <div
        role="menu"
        className={`absolute right-0 top-[calc(100%+10px)] z-[60] w-[272px] origin-top-right rounded-[20px] bg-bg p-2 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.45)] ring-1 ring-line transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0"}`}
      >
        {me?.signedIn ? (
          <>
            <div className="border-b border-line px-3 pb-3 pt-2">
              <p className="truncate font-[family-name:var(--font-logo)] text-[1.05rem] font-bold">{me.name ?? t("acct.menu.account")}</p>
              <p className="truncate text-xs text-muted">{me.email}</p>
            </div>
            <div className="py-1.5">
              {links.map(({ href, label, Icon }) => (
                <Link key={href} href={href} role="menuitem" className={item}>
                  <Icon className="h-[18px] w-[18px] text-gold" aria-hidden />
                  {label}
                </Link>
              ))}
            </div>
            {me.staff && (
              <Link href="/admin" role="menuitem" className="mb-1.5 flex items-center gap-3 rounded-xl bg-gold/12 px-3 py-2.5 text-[14px] font-bold ring-1 ring-gold/45 transition-colors hover:bg-gold/20">
                <ShieldCheck className="h-[18px] w-[18px] text-gold" aria-hidden />
                {t("acct.nav.admin")}
              </Link>
            )}
            <form action={signOutAction} className="border-t border-line pt-1.5">
              <button role="menuitem" className={`${item} w-full text-muted`}>
                <LogOut className="h-[18px] w-[18px]" aria-hidden />
                {t("acct.nav.signout")}
              </button>
            </form>
          </>
        ) : (
          <div className="p-2">
            <Link href="/account" role="menuitem" className="btn btn-ink w-full justify-center py-3 text-[0.78rem]">
              {me ? t("acct.menu.signin") : t("acct.menu.account")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
