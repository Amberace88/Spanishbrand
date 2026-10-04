"use client";
import "../auth.css";
import "./account.css";
import { useActionState, useEffect, useState } from "react";
import { useT } from "@/components/providers/I18nProvider";
import type { ProfileState } from "@/lib/account-panel";

/** Personal details: floating labels, newsletter switch, inline save state (no page reload). */
export function ProfileForm({
  action,
  email,
  name,
  phone,
  marketing,
}: {
  action: (prev: ProfileState, fd: FormData) => Promise<ProfileState>;
  email: string;
  name: string;
  phone: string;
  marketing: boolean;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(action, { status: "idle", at: 0 });
  const [dirty, setDirty] = useState(false);
  const [shown, setShown] = useState<ProfileState["status"]>("idle");

  useEffect(() => {
    if (state.at === 0) return;
    setShown(state.status);
    if (state.status === "ok") setDirty(false);
    const id = setTimeout(() => setShown("idle"), state.status === "ok" ? 3200 : 6000);
    return () => clearTimeout(id);
  }, [state]);

  const btnState = pending ? "busy" : shown === "ok" && !dirty ? "ok" : undefined;

  return (
    <form action={formAction} onChange={() => setDirty(true)} className="au space-y-4" aria-busy={pending}>
      <div className="rounded-2xl bg-surface-2 px-4 py-3">
        <p className="text-xs font-semibold text-muted">{t("acct.profile.email")}</p>
        <p className="mt-0.5 truncate font-semibold">{email}</p>
        <p className="mt-1 text-xs text-muted">{t("acct.profile.emailNote")}</p>
      </div>
      <div className="au-field">
        <input id="pr-name" name="name" defaultValue={name} placeholder=" " className="au-input" autoComplete="name" maxLength={120} />
        <label htmlFor="pr-name" className="au-label">
          {t("acct.profile.name")}
        </label>
      </div>
      <div className="au-field">
        <input id="pr-phone" name="phone" type="tel" defaultValue={phone} placeholder=" " className="au-input" autoComplete="tel" maxLength={40} />
        <label htmlFor="pr-phone" className="au-label">
          {t("acct.profile.phone")}
        </label>
      </div>

      <label htmlFor="pr-news" className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl px-1 py-2">
        <span className="min-w-0">
          <span className="block font-semibold">{t("acct.profile.newsletter")}</span>
          <span className="mt-0.5 block text-sm leading-relaxed text-muted">{t("acct.profile.newsletterBody")}</span>
        </span>
        <span className="relative mt-1 flex">
          <input id="pr-news" name="marketing" type="checkbox" role="switch" defaultChecked={marketing} className="ac-switch-input peer sr-only" />
          <span className="ac-switch" aria-hidden />
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button className="au-submit sm:w-auto sm:px-8" data-state={btnState} disabled={pending}>
          {pending ? <span className="au-spin" aria-hidden /> : null}
          {btnState === "ok" ? (
            <svg viewBox="0 0 24 24" className="au-check h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          ) : null}
          <span>{pending ? t("acct.profile.saving") : btnState === "ok" ? t("acct.profile.saved") : t("acct.profile.save")}</span>
        </button>
        <p aria-live="polite" className="text-sm">
          {shown === "error" && <span className="font-medium text-accent">{t("acct.profile.error")}</span>}
          {shown === "ok" && <span className="sr-only">{t("acct.profile.saved")}</span>}
        </p>
      </div>
    </form>
  );
}
