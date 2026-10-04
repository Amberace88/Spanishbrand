"use client";
import { useMemo, useState } from "react";
import "./auth.css";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useT } from "@/components/providers/I18nProvider";

/** Score 0–4 from length and character variety (client-side hint only). */
export function passwordScore(p: string) {
  let s = 0;
  if (p.length >= 10) s++;
  if (p.length >= 14) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(4, s);
}

/** Set (first time, magic-link accounts) or change the password of the signed-in user. */
export function PasswordForm({ hasPassword = false, admin = false }: { hasPassword?: boolean; admin?: boolean }) {
  const t = useT();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const score = useMemo(() => passwordScore(pw), [pw]);
  const labels = [t("auth.weak"), t("auth.weak"), t("auth.fair"), t("auth.good"), t("auth.strong")];
  const colors = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-lime-500", "bg-emerald-600"];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pw.length < 10) return (setState("error"), setMsg(t("auth.tooShort")));
    if (pw !== pw2) return (setState("error"), setMsg(t("auth.mismatch")));
    const sb = supabaseBrowser();
    if (!sb) return setState("error");
    setState("busy");
    const { error } = await sb.auth.updateUser({ password: pw, data: { has_password: true } });
    if (error) {
      setState("error");
      setMsg(/reauth|nonce/i.test(error.message) ? t("auth.reauth") : /same|different/i.test(error.message) ? t("auth.samePassword") : error.message);
      return;
    }
    setState("ok");
    setMsg(t("auth.saved"));
    setPw("");
    setPw2("");
  }

  if (!admin) {
    const err = state === "error" ? (msg ?? t("common.error")) : null;
    const mismatch = pw2.length > 0 && pw2.length >= pw.length && pw !== pw2;
    return (
      <form onSubmit={submit} className="au space-y-4" aria-busy={state === "busy"}>
        <p className="text-sm leading-relaxed text-muted">{hasPassword ? t("auth.changeIntro") : t("auth.setIntro")}</p>
        <div>
          <div className="au-field">
            <input id="pf-new" type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder=" " className="au-input pr-14" autoComplete="new-password" minLength={10} required aria-describedby="pf-strength" />
            <label htmlFor="pf-new" className="au-label">
              {t("auth.newPassword")}
            </label>
            <button type="button" onClick={() => setShow((s) => !s)} className="au-eye" aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")} aria-pressed={show}>
              <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                <circle cx="12" cy="12" r="3" />
                {show && <path d="M4 4l16 16" />}
              </svg>
            </button>
          </div>
          <div id="pf-strength" className={`mt-3 flex items-center gap-3 transition-opacity ${pw ? "opacity-100" : "opacity-0"}`} aria-live="polite">
            <div className="flex h-1.5 flex-1 gap-1" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`h-full flex-1 rounded-full transition-colors duration-300 ${i < score ? colors[score] : "bg-[color-mix(in_srgb,var(--fg)_12%,transparent)]"}`} />
              ))}
            </div>
            <span className="w-16 text-right text-xs font-semibold text-muted">{pw ? labels[score] : ""}</span>
          </div>
        </div>
        <div>
          <div className="au-field" data-invalid={mismatch ? "true" : undefined}>
            <input id="pf-repeat" type={show ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder=" " className="au-input" autoComplete="new-password" required aria-invalid={mismatch || undefined} aria-describedby={mismatch ? "pf-mismatch" : undefined} />
            <label htmlFor="pf-repeat" className="au-label">
              {t("auth.repeatPassword")}
            </label>
          </div>
          {mismatch && (
            <p id="pf-mismatch" className="au-hint au-hint-err">
              {t("auth.mismatch")}
            </p>
          )}
        </div>
        <div aria-live="assertive" aria-atomic="true">
          {err && (
            <p role="alert" className="au-alert">
              {err}
            </p>
          )}
        </div>
        <div aria-live="polite">
          {state === "ok" && msg && (
            <p className="au-panel flex items-center gap-2 rounded-2xl bg-[#1f7a49]/10 px-4 py-3 text-sm font-medium text-[#1f7a49] ring-1 ring-[#1f7a49]/25 dark:text-[#5fd394]">
              <svg viewBox="0 0 24 24" className="au-check h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              {msg}
            </p>
          )}
        </div>
        <button className="au-submit group sm:w-auto sm:px-8" data-state={state === "busy" ? "busy" : undefined} disabled={state === "busy"}>
          {state === "busy" ? <span className="au-spin" aria-hidden /> : null}
          <span>{state === "busy" ? t("auth.busy") : hasPassword ? t("auth.change") : t("auth.set")}</span>
        </button>
      </form>
    );
  }

  const field = admin ? "w-full border border-sand bg-white px-3 py-2.5 text-sm outline-none focus:border-ink" : "field";
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className={`text-sm ${admin ? "text-stone-600" : "text-muted"}`}>{hasPassword ? t("auth.changeIntro") : t("auth.setIntro")}</p>
      <div className="relative">
        <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t("auth.newPassword")} className={`${field} pr-20`} autoComplete="new-password" minLength={10} required />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500">
          {show ? t("auth.hide") : t("auth.show")}
        </button>
      </div>
      {pw && (
        <div className="flex items-center gap-3">
          <div className="flex h-1.5 flex-1 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-full flex-1 rounded-full ${i < score ? colors[score] : "bg-stone-200"}`} />
            ))}
          </div>
          <span className="w-16 text-right text-xs text-stone-500">{labels[score]}</span>
        </div>
      )}
      <input type={show ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder={t("auth.repeatPassword")} className={field} autoComplete="new-password" required />
      <button className={admin ? "bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" : "btn btn-ink"} disabled={state === "busy"}>
        {state === "busy" ? "…" : hasPassword ? t("auth.change") : t("auth.set")}
      </button>
      {msg && <p className={`text-sm ${state === "ok" ? "text-emerald-700" : "text-red-700"}`}>{msg}</p>}
    </form>
  );
}
