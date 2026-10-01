"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useT } from "@/components/providers/I18nProvider";

type Mode = "password" | "link" | "reset";

/**
 * Sign-in with email + password or a magic link (no password needed), plus password reset.
 * Accounts created with a magic link have no password until the user sets one in their account.
 */
export function AuthForm({ next = "/account", dark = false }: { next?: string; dark?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  const target = () => {
    const q = new URLSearchParams(window.location.search).get("next");
    return q && q.startsWith("/") && !q.startsWith("//") ? q : next;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(m);
        setState("idle");
        setMsg(null);
      }}
      className={`flex-1 rounded-full px-3 py-2 text-[13px] font-semibold transition-colors ${mode === m ? (dark ? "bg-bone text-ink" : "bg-fg text-bg") : dark ? "text-bone/70 hover:text-bone" : "text-muted hover:text-fg"}`}
    >
      {label}
    </button>
  );

  return (
    <div>
      {mode !== "reset" && (
        <div className={`mb-5 flex gap-1 rounded-full p-1 ${dark ? "bg-bone/10" : "bg-surface-2"}`} role="tablist">
          {tab("password", t("auth.tabPassword"))}
          {tab("link", t("auth.tabLink"))}
        </div>
      )}
      {state === "sent" ? (
        <div className="space-y-3">
          <p className={`text-lg font-semibold ${dark ? "text-gold" : "text-accent"}`}>{msg}</p>
          <button type="button" onClick={() => setState("idle")} className={`text-sm underline ${dark ? "text-bone/70" : "text-muted"}`}>
            {t("auth.back")}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {mode === "reset" && <p className={`text-sm ${dark ? "text-bone/70" : "text-muted"}`}>{t("auth.resetIntro")}</p>}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className={`field ${dark ? "field-dark" : ""}`} autoComplete="email" />
          {mode === "password" && (
            <div className="relative">
              <input type={show ? "text" : "password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.password")} className={`field pr-20 ${dark ? "field-dark" : ""}`} autoComplete="current-password" />
              <button type="button" onClick={() => setShow((s) => !s)} className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold ${dark ? "text-bone/60" : "text-muted"}`}>
                {show ? t("auth.hide") : t("auth.show")}
              </button>
            </div>
          )}
          <button className="btn btn-primary w-full" disabled={state === "busy"}>
            {state === "busy" ? "…" : mode === "password" ? t("auth.signIn") : mode === "link" ? t("account.signin.send") : t("auth.sendReset")}
          </button>
          {msg && state === "error" && <p className="text-sm text-accent">{msg}</p>}
          <div className={`flex justify-between text-xs ${dark ? "text-bone/60" : "text-muted"}`}>
            {mode === "password" ? (
              <button type="button" onClick={() => setMode("reset")} className="underline-offset-4 hover:underline">
                {t("auth.forgot")}
              </button>
            ) : mode === "reset" ? (
              <button type="button" onClick={() => setMode("password")} className="underline-offset-4 hover:underline">
                {t("auth.back")}
              </button>
            ) : (
              <span>{t("account.signin.body")}</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
