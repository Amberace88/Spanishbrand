"use client";
import { useMemo, useState } from "react";
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
