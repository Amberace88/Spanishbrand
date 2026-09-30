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
      <section className="grain relative flex min-h-[90svh] items-center bg-ink text-bone">
        <Container className="grid gap-12 py-32 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow text-oro-2">{t("account.title")}</p>
            <h1 className="display mt-5 text-7xl sm:text-8xl">{t("account.signin")}</h1>
            <p className="serif mt-5 text-2xl italic text-bone/75">{t("account.signin.body")}</p>
          </div>
          <div className="max-w-md">
            <MagicLinkForm dark />
          </div>
        </Container>
      </section>
    );
  }
  return (
    <section className="min-h-[80svh] bg-warm pb-24 pt-28 sm:pt-36">
      <Container>
        <div className="flex flex-col gap-6 border-b border-ink/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-rojo">{user.email}</p>
            <h1 className="display mt-3 text-6xl sm:text-7xl">{t("account.title")}</h1>
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
