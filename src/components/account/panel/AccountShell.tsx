import "./account.css";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { TierId } from "@/lib/club";
import { Container } from "@/components/ui/Section";
import { AccountNavList, AccountNavTabs, type AccountNavItem } from "./AccountNav";

export type ShellMember = { number: string; points: number; tier: TierId; tierLabel: string } | null;

export type AccountShellProps = {
  name: string;
  email: string;
  initials: string;
  member: ShellMember;
  items: AccountNavItem[];
  admin: { label: string; sub: string } | null;
  signOut: { label: string; action: () => Promise<void> };
  labels: { nav: string; memberNo: string; pts: string; guest: string; join: string };
  children: ReactNode;
};

/** Pocket member card for the sidebar — same visual language as the 3D club card, without the motion. */
function MemberMini({ member, name, labels }: { member: ShellMember; name: string; labels: AccountShellProps["labels"] }) {
  return (
    <div className="ac-mini" data-tier={member?.tier ?? "SOCIO"}>
      <span className="ac-mini-shine" aria-hidden />
      <span className="flag-line absolute inset-x-0 top-0 h-[3px] opacity-90" aria-hidden />
      <span className="absolute -bottom-[22%] -right-[6%] h-[90%] opacity-[0.08]" aria-hidden>
        <Image src="/brand/logo-lion.webp" alt="" width={997} height={1174} className="h-full w-auto" />
      </span>
      <div className="relative flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="block h-7">
            <Image src="/brand/logo-text.webp" alt="" width={1368} height={707} className="h-full w-auto" />
          </span>
          <Image src="/brand/logo-lion.webp" alt="" width={997} height={1174} className="h-9 w-auto drop-shadow-[0_3px_8px_rgba(0,0,0,0.6)]" />
        </div>
        <div className="min-w-0">
          {member ? (
            <>
              <span className="inline-block rounded-full border border-[#e0b84a]/50 bg-black/30 px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] text-[#f1d27a]">
                {member.tier === "HONOR" ? "★ " : ""}
                {member.tierLabel}
              </span>
              <p className="mt-1.5 font-mono text-[1.05rem] font-bold tracking-[0.14em] text-[#f5f1e8]">{labels.memberNo}</p>
              <p className="truncate text-[11px] font-semibold tracking-[0.06em] text-[#f5f1e8]/70">
                <span className="text-[#f1d27a]">{labels.pts}</span> · {name}
              </p>
            </>
          ) : (
            <>
              <p className="text-[12px] font-semibold text-[#f5f1e8]/70">{labels.guest}</p>
              <Link href="/account/club" className="mt-1 inline-flex text-[13px] font-bold text-[#f1d27a] underline decoration-[#f1d27a]/40 underline-offset-4 hover:decoration-[#f1d27a]">
                {labels.join}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Signed-in account area: sticky ink sidebar on desktop (member card, nav, admin entry, sign out);
 * identity strip + scrolling tabs on phones and tablets.
 */
export function AccountShell({ name, email, initials, member, items, admin, signOut, labels, children }: AccountShellProps) {
  const nav = { items, admin, signOut, label: labels.nav };
  return (
    <section className="min-h-[80svh] bg-bg pb-24 pt-5 sm:pt-8 lg:pt-10">
      <Container>
        <div className="lg:grid lg:grid-cols-[296px_minmax(0,1fr)] lg:items-start lg:gap-10 xl:gap-14">
          {/* ---------- desktop sidebar ---------- */}
          <aside className="ac-pass sticky top-[124px] hidden rounded-[28px] p-5 ring-1 ring-[#e0b84a]/15 lg:block">
            <MemberMini member={member} name={name} labels={labels} />
            <div className="mt-5 px-1">
              <p className="truncate font-[family-name:var(--font-logo)] text-xl font-bold leading-tight">{name}</p>
              <p className="truncate text-[13px] text-[#f5f1e8]/55">{email}</p>
            </div>
            <div className="mt-5">
              <AccountNavList {...nav} />
            </div>
          </aside>

          {/* ---------- phones / tablets ---------- */}
          <div className="lg:hidden">
            <div className="ac-pass flex items-center gap-3 rounded-[20px] p-3 pr-4 ring-1 ring-[#e0b84a]/15">
              <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[#e0b84a]/12 font-[family-name:var(--font-logo)] text-lg font-bold text-[#f1d27a] ring-1 ring-[#e0b84a]/45" aria-hidden>
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-[family-name:var(--font-logo)] text-[1.05rem] font-bold leading-tight">{name}</p>
                <p className="truncate text-xs text-[#f5f1e8]/60">{member ? `${labels.memberNo} · ${labels.pts}` : email}</p>
              </div>
              <Image src="/brand/logo-lion.webp" alt="" width={997} height={1174} className="h-9 w-auto shrink-0 opacity-90" />
            </div>
            <div className="mt-3">
              <AccountNavTabs {...nav} />
            </div>
          </div>

          <div className="min-w-0 pt-7 lg:pt-0">{children}</div>
        </div>
      </Container>
    </section>
  );
}
