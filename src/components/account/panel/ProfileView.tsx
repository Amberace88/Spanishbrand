import Link from "next/link";
import { Download, KeyRound, ShieldAlert, UserRound } from "lucide-react";
import type { ProfileState } from "@/lib/account-panel";
import { PasswordForm } from "@/components/account/PasswordForm";
import { ProfileForm } from "./ProfileForm";
import { PanelHead, type T } from "./views";

export function ProfileView({
  t,
  email,
  name,
  phone,
  marketing,
  hasPassword,
  highlightSecurity,
  deletionPending,
  saveAction,
  deleteAction,
}: {
  t: T;
  email: string;
  name: string;
  phone: string;
  marketing: boolean;
  hasPassword: boolean;
  highlightSecurity: boolean;
  deletionPending: boolean;
  saveAction: (prev: ProfileState, fd: FormData) => Promise<ProfileState>;
  deleteAction: () => Promise<void>;
}) {
  const head = (Icon: typeof UserRound, label: string, id: string) => (
    <h2 id={id} className="flex items-center gap-3 text-lg font-bold">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-gold">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      {label}
    </h2>
  );
  return (
    <div>
      <PanelHead title={t("acct.nav.profile")} sub={t("acct.profile.sub")} />
      <div className="ac-enter-2 grid gap-5 xl:grid-cols-2">
        <section className="rounded-[24px] bg-surface p-5 ring-1 ring-line sm:p-7" aria-labelledby="pf-details">
          {head(UserRound, t("acct.profile.details"), "pf-details")}
          <div className="mt-5">
            <ProfileForm action={saveAction} email={email} name={name} phone={phone} marketing={marketing} />
          </div>
        </section>
        <section id="seguridad" className={`scroll-mt-32 rounded-[24px] bg-surface p-5 ring-1 sm:p-7 ${highlightSecurity ? "ring-2 ring-accent" : "ring-line"}`} aria-labelledby="pf-security">
          {head(KeyRound, t("acct.profile.security"), "pf-security")}
          <div className="mt-5">
            <PasswordForm hasPassword={hasPassword} />
          </div>
        </section>
      </div>

      <section className="ac-enter-3 mt-5 rounded-[24px] p-5 ring-1 ring-accent/30 sm:p-7" aria-labelledby="pf-privacy">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 id="pf-privacy" className="flex items-center gap-2 text-lg font-bold">
              <ShieldAlert className="h-5 w-5 text-accent" aria-hidden />
              {t("acct.privacy.title")}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {t("acct.privacy.body")}{" "}
              <Link href="/privacy" className="font-semibold text-fg underline decoration-line underline-offset-4 hover:decoration-current">
                {t("acct.privacy.policy")}
              </Link>
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row md:shrink-0">
            <a href="/api/account/export" className="rg-focus btn btn-ghost justify-center px-5 py-3 text-[0.75rem]">
              <Download className="h-4 w-4" aria-hidden />
              {t("account.export")}
            </a>
            {deletionPending ? null : (
              <form action={deleteAction}>
                <button className="rg-focus btn btn-ghost w-full justify-center px-5 py-3 text-[0.75rem] !text-accent">{t("account.delete")}</button>
              </form>
            )}
          </div>
        </div>
        {deletionPending && <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-sm">{t("acct.privacy.pending")}</p>}
      </section>
    </div>
  );
}
