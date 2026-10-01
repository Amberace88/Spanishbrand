"use client";
import { useState } from "react";
import { useT } from "@/components/providers/I18nProvider";

export function Newsletter({ dark = false, source = "site" }: { dark?: boolean; source?: string }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) return;
    setState("loading");
    const res = await fetch("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, consent: true, source }) }).catch(() => null);
    setState(res?.ok ? "ok" : "error");
  }

  if (state === "ok") return <p className={`text-lg font-semibold ${dark ? "text-gold" : "text-accent"}`}>{t("newsletter.success")}</p>;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("newsletter.placeholder")}
          aria-label="Email"
          className={`field ${dark ? "field-dark" : ""} flex-1`}
        />
        <button type="submit" disabled={state === "loading"} className="btn btn-primary shrink-0 sm:px-7">
          {t("newsletter.submit")}
        </button>
      </div>
      <label className={`flex cursor-pointer items-start gap-3 text-xs leading-relaxed ${dark ? "text-white/70" : "text-muted"}`}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" required />
        <span>
          {t("newsletter.consent")} <a href="/privacy" className="underline">Privacidad</a>
        </span>
      </label>
      {state === "error" && <p className="text-xs text-accent">{t("newsletter.error")}</p>}
    </form>
  );
}
