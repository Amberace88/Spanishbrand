"use client";
import "./auth.css";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useT } from "@/components/providers/I18nProvider";

type Mode = "password" | "link" | "reset";

const Eye = ({ off }: { off: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);
const Tick = () => (
  <svg viewBox="0 0 20 20" className="au-tick" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4.5 10.5l3.5 3.5 7.5-8" />
  </svg>
);
const Alert = () => (
  <svg viewBox="0 0 20 20" className="mt-px h-[17px] w-[17px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
    <circle cx="10" cy="10" r="8" />
    <path d="M10 6v4.5M10 13.6v.1" />
  </svg>
);

/** Animated envelope that seals and earns a check — shown once a link has been sent. */
function MailSent() {
  return (
    <svg viewBox="0 0 132 112" className="au-mail" aria-hidden>
      <defs>
        <linearGradient id="au-env-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6efe3" />
          <stop offset="1" stopColor="#e7dcc6" />
        </linearGradient>
        <linearGradient id="au-gold-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7e08a" />
          <stop offset=".5" stopColor="#d9a93a" />
          <stop offset="1" stopColor="#a37a22" />
        </linearGradient>
        <clipPath id="au-env-clip">
          <rect x="14" y="0" width="96" height="98" />
        </clipPath>
      </defs>
      <path className="au-mail-trail" d="M8 30 C 22 22, 30 40, 44 30" fill="none" stroke="#e0b84a" strokeWidth="2" strokeLinecap="round" />
      <g className="au-mail-env">
        {/* back */}
        <rect x="14" y="38" width="96" height="60" rx="8" fill="#a3162b" />
        {/* letter rising out */}
        <g clipPath="url(#au-env-clip)">
          <g className="au-mail-letter">
            <rect x="26" y="22" width="72" height="56" rx="5" fill="#fffcf7" />
            <rect x="34" y="32" width="34" height="4" rx="2" fill="#c8102e" />
            <rect x="34" y="41" width="50" height="3" rx="1.5" fill="#d9cdb6" />
            <rect x="34" y="48" width="44" height="3" rx="1.5" fill="#d9cdb6" />
          </g>
        </g>
        {/* front pocket */}
        <path d="M14 46 L62 74 L110 46 V90 a8 8 0 0 1 -8 8 H22 a8 8 0 0 1 -8 -8 Z" fill="url(#au-env-g)" />
        <path d="M14 90 L50 66 M110 90 L74 66" stroke="#d6c8ad" strokeWidth="1.4" />
        {/* flap closes */}
        <path className="au-mail-flap" d="M14 46 a8 8 0 0 1 3 -6 L62 72 L107 40 a8 8 0 0 1 3 6 L62 76 Z" fill="#c8102e" />
        <rect x="14" y="94" width="96" height="4" rx="2" fill="url(#au-gold-g)" opacity=".85" />
      </g>
      <g className="au-mail-badge">
        <circle cx="106" cy="38" r="17" fill="url(#au-gold-g)" stroke="#070606" strokeWidth="3" />
        <path d="M98.5 38.5l5 5 9-10" fill="none" stroke="#1a1206" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/**
 * Sign-in with email + password or a magic link (no password needed), plus password reset.
 * Accounts created with a magic link have no password until the user sets one in their account.
 */
export function AuthForm({ next = "/account", dark = false }: { next?: string; dark?: boolean }) {
  const t = useT();
  const router = useRouter();
  const uid = useId();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "ok" | "sent" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({ email: false, password: false });
  const [caps, setCaps] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  const sentRef = useRef<HTMLHeadingElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  // client hints only — the same constraints the browser enforces (required, type=email, minLength)
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const pwOk = password.length >= 8;
  const emailErr = touched.email && !emailOk ? t("auth.emailInvalid") : null;
  const pwErr = mode === "password" && touched.password && !pwOk ? (password ? t("auth.passwordShort") : t("auth.passwordRequired")) : null;

  useEffect(() => {
    if (state === "sent") sentRef.current?.focus();
  }, [state]);

  const target = () => {
    const q = new URLSearchParams(window.location.search).get("next");
    return q && q.startsWith("/") && !q.startsWith("//") ? q : next;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // inline validation replaces the native bubbles (form is noValidate); same rules, no request when invalid
    if (!emailOk || (mode === "password" && !pwOk)) {
      setTouched({ email: true, password: true });
      (!emailOk ? emailRef : pwRef).current?.focus();
      return;
    }
    const sb = supabaseBrowser();
    if (!sb) return setState("error");
    setState("busy");
    setMsg(null);
    const cb = (to: string) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(to)}`;
    if (mode === "password") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        setState("error");
        setMsg(/invalid/i.test(error.message) ? t("auth.invalid") : error.message);
        return;
      }
      setState("ok");
      router.replace(target());
      router.refresh();
      return;
    }
    if (mode === "link") {
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: cb(target()) } });
      setState(error ? "error" : "sent");
      setMsg(error ? error.message : t("account.signin.sent"));
      return;
    }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: cb(`${next === "/admin" ? "/admin/cuenta" : "/account/profile"}?reset=1`) });
    setState(error ? "error" : "sent");
    setMsg(error ? error.message : t("auth.resetSent"));
  }

  const go = (m: Mode) => {
    setMode(m);
    setState("idle");
    setMsg(null);
    setTouched((x) => ({ ...x, password: false }));
  };

  const order: Mode[] = ["password", "link"];
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const j = e.key === "Home" ? 0 : e.key === "End" ? 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + 2) % 2;
    go(order[j]);
    tabs.current[j]?.focus();
  };

  const capsCheck = (e: React.KeyboardEvent) => setCaps(e.getModifierState?.("CapsLock") ?? false);
  const busy = state === "busy" || state === "ok";
  const errorText = state === "error" ? (msg ?? t("common.error")) : null;
  const ids = { email: `${uid}-email`, pw: `${uid}-pw`, emailHint: `${uid}-email-hint`, pwHint: `${uid}-pw-hint`, panel: `${uid}-panel` };

  return (
    <div className={`au ${dark ? "au-dark" : ""}`}>
      {mode !== "reset" && state !== "sent" && (
        <div className="au-seg mb-6" role="tablist" aria-label={t("account.signin")} data-mode={mode}>
          <span className="au-pill" aria-hidden />
          {order.map((m, i) => (
            <button
              key={m}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${m}`}
              aria-selected={mode === m}
              aria-controls={ids.panel}
              tabIndex={mode === m ? 0 : -1}
              onClick={() => go(m)}
              onKeyDown={(e) => onTabKey(e, i)}
              className="au-tab"
            >
              {m === "password" ? (
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                  <rect x="4" y="8.5" width="12" height="8.5" rx="2" />
                  <path d="M7 8.5V6.5a3 3 0 0 1 6 0v2" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden>
                  <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
                  <path d="M3 5.5l7 5.5 7-5.5" />
                </svg>
              )}
              {m === "password" ? t("auth.tabPassword") : t("auth.tabLink")}
            </button>
          ))}
        </div>
      )}

      {state === "sent" ? (
        <div className="au-panel flex flex-col items-center py-2 text-center" aria-live="polite">
          <div className="relative grid place-items-center">
            <span className="absolute h-44 w-44 rounded-full bg-[radial-gradient(circle,rgb(224_184_74/0.28),transparent_65%)]" aria-hidden />
            <MailSent />
          </div>
          <h2 ref={sentRef} tabIndex={-1} className="headline mt-5 text-2xl leading-tight outline-none sm:text-[1.7rem]">
            {msg}
          </h2>
          {email && (
            <p className="mt-3 text-sm" style={{ color: "var(--au-muted)" }}>
              {t("auth.sentTo", { email })}
            </p>
          )}
          <p className="mt-1 text-sm" style={{ color: "var(--au-muted)" }}>
            {t("auth.spamHint")}
          </p>
          <button
            type="button"
            onClick={() => setState("idle")}
            className="mt-7 inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-transform hover:-translate-x-0.5"
            style={{ boxShadow: "inset 0 0 0 1px var(--au-line)", background: "var(--au-field)" }}
          >
            <span aria-hidden>←</span> {t("auth.back")}
          </button>
        </div>
      ) : (
        <form
          key={mode}
          id={ids.panel}
          role={mode === "reset" ? undefined : "tabpanel"}
          aria-labelledby={mode === "reset" ? undefined : `${uid}-tab-${mode}`}
          onSubmit={submit}
          noValidate
          aria-busy={busy}
          className="au-panel space-y-4"
        >
          {mode === "reset" && (
            <div className="mb-2">
              <p className="headline text-2xl">{t("auth.resetTitle")}</p>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--au-muted)" }}>
                {t("auth.resetIntro")}
              </p>
            </div>
          )}

          <div>
            <div className="au-field" data-invalid={emailErr ? "true" : undefined} data-valid={emailOk && touched.email ? "true" : undefined}>
              <input
                ref={emailRef}
                id={ids.email}
                type="email"
                name="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => email && setTouched((x) => ({ ...x, email: true }))}
                placeholder=" "
                className="au-input pr-11"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={emailErr ? true : undefined}
                aria-describedby={emailErr ? ids.emailHint : undefined}
                disabled={busy}
              />
              <label htmlFor={ids.email} className="au-label">
                {t("auth.email")}
              </label>
              <Tick />
            </div>
            {emailErr && (
              <p id={ids.emailHint} className="au-hint au-hint-err">
                {emailErr}
              </p>
            )}
          </div>

          {mode === "password" && (
            <div>
              <div className="au-field" data-invalid={pwErr ? "true" : undefined}>
                <input
                  ref={pwRef}
                  id={ids.pw}
                  type={show ? "text" : "password"}
                  name="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => {
                    setCaps(false);
                    if (password) setTouched((x) => ({ ...x, password: true }));
                  }}
                  onKeyDown={capsCheck}
                  onKeyUp={capsCheck}
                  placeholder=" "
                  className="au-input pr-14"
                  autoComplete="current-password"
                  aria-invalid={pwErr ? true : undefined}
                  aria-describedby={[pwErr ? ids.pwHint : "", caps ? `${ids.pwHint}-caps` : ""].filter(Boolean).join(" ") || undefined}
                  disabled={busy}
                />
                <label htmlFor={ids.pw} className="au-label">
                  {t("auth.password")}
                </label>
                <button type="button" onClick={() => setShow((s) => !s)} className="au-eye" aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")} aria-pressed={show} aria-controls={ids.pw}>
                  <Eye off={show} />
                </button>
              </div>
              {caps && (
                <p id={`${ids.pwHint}-caps`} className="au-hint au-hint-caps">
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
                    <path d="M10 3 3.5 10H7v4h6v-4h3.5Z" />
                    <path d="M7 17h6" strokeLinecap="round" />
                  </svg>
                  {t("auth.capsLock")}
                </p>
              )}
              {pwErr && (
                <p id={ids.pwHint} className="au-hint au-hint-err">
                  {pwErr}
                </p>
              )}
            </div>
          )}

          {mode === "link" && (
            <p className="flex items-start gap-2 px-1 text-[13px] leading-relaxed" style={{ color: "var(--au-muted)" }}>
              <span className="mt-[3px] text-[11px]" style={{ color: "var(--au-gold)" }} aria-hidden>
                ✦
              </span>
              {t("auth.linkHint")}
            </p>
          )}

          <div aria-live="assertive" aria-atomic="true">
            {errorText && (
              <p role="alert" className="au-alert">
                <Alert />
                <span>{errorText}</span>
              </p>
            )}
          </div>

          <button type="submit" className="au-submit group" data-state={state === "ok" ? "ok" : state === "busy" ? "busy" : undefined} disabled={busy}>
            {state === "busy" ? (
              <>
                <span className="au-spin" aria-hidden />
                <span>{t("auth.busy")}</span>
              </>
            ) : state === "ok" ? (
              <>
                <svg viewBox="0 0 24 24" className="au-check h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                <span>{t("auth.success")}</span>
              </>
            ) : (
              <>
                <span>{mode === "password" ? t("auth.signIn") : mode === "link" ? t("account.signin.send") : t("auth.sendReset")}</span>
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </>
            )}
          </button>
          <p className="sr-only" aria-live="polite">
            {state === "busy" ? t("auth.busy") : state === "ok" ? t("auth.success") : ""}
          </p>

          <div className="flex items-center justify-between gap-4 pt-1 text-[13px]" style={{ color: "var(--au-muted)" }}>
            {mode === "password" ? (
              <button type="button" onClick={() => go("reset")} className="font-medium underline decoration-[var(--au-line)] underline-offset-4 transition-colors hover:text-[var(--au-fg)] hover:decoration-current">
                {t("auth.forgot")}
              </button>
            ) : mode === "reset" ? (
              <button type="button" onClick={() => go("password")} className="font-medium underline decoration-[var(--au-line)] underline-offset-4 transition-colors hover:text-[var(--au-fg)] hover:decoration-current">
                ← {t("auth.back")}
              </button>
            ) : (
              <span>{t("auth.newHere")}</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
