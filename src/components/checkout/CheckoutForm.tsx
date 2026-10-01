"use client";
import { useActionState } from "react";
import { checkoutAction } from "@/app/actions/cart";
import { useT } from "@/components/providers/I18nProvider";
import type { TKey } from "@/lib/i18n/dictionaries";

const CAUSES = ["VETERANOS", "MAYORES", "INFANCIA", "ANIMALES"] as const;
const COUNTRY_NAMES: Record<string, string> = { ES: "España", PT: "Portugal", FR: "Francia", DE: "Alemania", IT: "Italia", NL: "Países Bajos", BE: "Bélgica", AT: "Austria", IE: "Irlanda" };

export function CheckoutForm({ countries, defaultEmail }: { countries: string[]; defaultEmail?: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(checkoutAction, null);
  const errKey = state?.error ? (`checkout.error.${state.error}` as TKey) : null;

  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="eyebrow mb-2 block text-muted">{t("checkout.email")}</span>
        <input name="email" type="email" required autoComplete="email" defaultValue={defaultEmail} className="field" />
      </label>
      <label className="block">
        <span className="eyebrow mb-2 block text-muted">{t("checkout.country")}</span>
        <select name="country" required className="field" defaultValue={countries[0]}>
          {countries.map((c) => (
            <option key={c} value={c}>
              {COUNTRY_NAMES[c] ?? c}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="eyebrow mb-2 block text-muted">{t("checkout.discount")}</span>
        <input name="discount" maxLength={40} className="field uppercase" autoComplete="off" />
      </label>
      <fieldset>
        <legend className="eyebrow mb-2 block text-muted">{t("causes.choose")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {CAUSES.map((c, i) => (
            <label key={c} className="flex cursor-pointer items-center gap-2 rounded-2xl border border-line px-3 py-2.5 text-sm font-medium has-[:checked]:border-accent has-[:checked]:bg-accent/5">
              <input type="radio" name="cause" value={c} defaultChecked={i === 0} className="accent-[var(--accent)]" />
              {t(`causes.${c}` as TKey)}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">{t("causes.checkoutNote")}</p>
      </fieldset>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="marketing" className="mt-1 accent-[var(--accent)]" />
        <span>{t("checkout.marketing")}</span>
      </label>
      {errKey && <p className="border-l-2 border-accent pl-3 text-sm text-accent">{t(errKey) === errKey ? t("checkout.error.generic") : t(errKey)}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary w-full py-5">
        {pending ? "…" : t("checkout.pay")} {!pending && <span aria-hidden>→</span>}
      </button>
      <p className="flex items-center gap-2 text-xs text-muted">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="4" y="10" width="16" height="11" rx="1" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        {t("checkout.secure")}
      </p>
    </form>
  );
}
