import type { ReactNode } from "react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Section";
import Image from "next/image";
import { AuthForm } from "@/components/account/AuthForm";
import { AuthVisual, type AuthVisualCopy } from "@/components/account/AuthVisual";
import { listSiteImages } from "@/lib/site-images";
import { POINTS_PER_EURO, REDEEM_POINTS, REDEEM_VALUE, SIGNUP_POINTS } from "@/lib/club";
import { signOutAction } from "@/app/actions/account";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const [t, user] = await Promise.all([getT(), getSessionUser()]);
  const site = user ? {} : await listSiteImages();
  if (!user) {
    const visual: AuthVisualCopy = {
      kicker: t("auth.v.kicker"),
      title: [t("auth.v.title1"), t("auth.v.title2")],
      body: t("auth.v.body"),
      perks: [
        { badge: `+${SIGNUP_POINTS}`, text: t("auth.perk.welcome") },
        { badge: String(POINTS_PER_EURO), text: t("auth.perk.earn") },
        { badge: String(REDEEM_POINTS), text: t("auth.perk.redeem", { v: REDEEM_VALUE }) },
      ],
      card: { club: t("auth.v.club"), since: t("auth.v.since"), points: "pts", name: t("auth.v.name"), tier: t("auth.v.tier"), aria: t("auth.v.cardAria") },
    };
    return (
      <section className="relative bg-bg">
        <div className="grid lg:min-h-[min(calc(100svh-4rem),980px)] lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
          <AuthVisual photo={site["look-leon-mujer"] ?? "/brand/auth-campaign.webp"} copy={visual} year={String(new Date().getFullYear())} />
          <div className="relative flex items-center justify-center overflow-hidden px-4 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <div className="azulejo-line pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-40 [mask-image:linear-gradient(to_left,black,transparent)] lg:block" aria-hidden />
            <div className="relative w-full max-w-[440px]">
              <p className="kicker flex items-center gap-2 text-gold">
                <span className="flag-line inline-block h-[3px] w-6 rounded-full" aria-hidden />
                {t("account.title")}
              </p>
              <h1 className="headline mt-3 text-[2.5rem] leading-[1.02] sm:text-[3.2rem]">{t("account.signin")}</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-muted sm:text-base">{t("account.signin.body")}</p>
              <div className="mt-8">
                <AuthForm />
              </div>
              <div className="mt-10 flex items-center gap-3 border-t border-line pt-6 text-[13px] text-muted">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#070606] ring-1 ring-[#c9a227]/50" aria-hidden>
                  <Image src="/brand/logo-lion.webp" alt="" width={22} height={26} className="h-[22px] w-auto" />
                </span>
                <p className="leading-snug">
                  {t("auth.v.clubNote")}{" "}
                  <Link href="/club" className="font-semibold text-fg underline decoration-line underline-offset-4 hover:decoration-current">
                    {t("auth.v.clubLink")}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="min-h-[80svh] bg-bg pb-24 pt-10 sm:pt-14">
      <Container>
        <div className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-accent">{user.email}</p>
            <h1 className="headline mt-2 text-4xl sm:text-5xl">{t("account.title")}</h1>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/account/orders" className="eyebrow link-u">
              {t("account.orders")}
            </Link>
            <Link href="/account/profile" className="eyebrow link-u">
              {t("account.profile")}
            </Link>
            <form action={signOutAction}>
              <button className="eyebrow link-u text-muted">{t("account.signout")}</button>
            </form>
          </nav>
        </div>
        <div className="pt-10">{children}</div>
      </Container>
    </section>
  );
}
