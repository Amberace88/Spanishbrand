import type { ReactNode } from "react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Section";
import { MagicLinkForm } from "@/components/account/MagicLinkForm";
import { signOutAction } from "@/app/actions/account";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const [t, user] = await Promise.all([getT(), getSessionUser()]);
  if (!user) {
    return (
      <section className="relative flex min-h-[70svh] items-center bg-cream">
        <div className="azulejo pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 opacity-50 [mask-image:linear-gradient(to_left,black,transparent)] lg:block" aria-hidden />
        <Container className="relative grid gap-10 py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow text-rojo">{t("account.title")}</p>
            <h1 className="headline mt-3 text-5xl sm:text-6xl">{t("account.signin")}</h1>
            <p className="mt-4 text-lg text-stone-2">{t("account.signin.body")}</p>
          </div>
          <div className="max-w-md rounded-3xl bg-white p-6 shadow-[0_20px_50px_-30px_rgba(28,23,18,0.4)] sm:p-8">
            <MagicLinkForm />
          </div>
        </Container>
      </section>
    );
  }
  return (
    <section className="min-h-[80svh] bg-warm pb-24 pt-10 sm:pt-14">
      <Container>
        <div className="flex flex-col gap-6 border-b border-ink/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-rojo">{user.email}</p>
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
              <button className="eyebrow link-u text-stone-2">{t("account.signout")}</button>
            </form>
          </nav>
        </div>
        <div className="pt-10">{children}</div>
      </Container>
    </section>
  );
}
