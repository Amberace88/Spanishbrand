"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useT } from "@/components/providers/I18nProvider";

export function MagicLinkForm({ next = "/account", dark = false }: { next?: string; dark?: boolean }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabaseBrowser();
    if (!sb) return setState("error");
    setState("sending");
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    setState(error ? "error" : "sent");
  }

  if (state === "sent") return <p className={`text-lg font-semibold ${dark ? "text-oro-2" : "text-rojo"}`}>{t("account.signin.sent")}</p>;
  return (
    <form onSubmit={submit} className="space-y-4">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className={`field ${dark ? "field-dark" : ""}`} autoComplete="email" />
      <button className="btn btn-primary w-full" disabled={state === "sending"}>
        {state === "sending" ? "…" : t("account.signin.send")}
      </button>
      {state === "error" && <p className="text-sm text-rojo">{t("common.error")}</p>}
    </form>
  );
}
