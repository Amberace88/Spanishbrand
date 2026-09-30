"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/components/providers/I18nProvider";

function getCookie(name: string) {
  return document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.split("=")[1];
}

/** GDPR consent: analytics only after explicit acceptance. Also sends first-party page views. */
export function CookieBanner() {
  const t = useT();
  const pathname = usePathname();
  const [consent, setConsent] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConsent(getCookie("consent"));
    setReady(true);
  }, []);

  useEffect(() => {
    if (consent !== "all" || pathname.startsWith("/admin")) return;
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
      const v = params.get(k);
      if (v) utm[k] = v.slice(0, 100);
    }
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "page_view", path: pathname, referrer: document.referrer.slice(0, 500) || undefined, utm: Object.keys(utm).length ? utm : undefined }),
      keepalive: true,
    }).catch(() => {});
  }, [consent, pathname]);

  function choose(v: "all" | "necessary") {
    document.cookie = `consent=${v}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    setConsent(v);
  }

  if (!ready || consent || pathname.startsWith("/admin")) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-xl border sm:bottom-6 sm:left-6 sm:right-auto sm:mx-0 sm:max-w-md border-ink/10 bg-warm p-5 shadow-2xl">
      <p className="text-sm leading-relaxed text-ink/80">
        {t("cookie.text")}{" "}
        <a href="/cookies" className="underline">
          {t("footer.cookies")}
        </a>
      </p>
      <div className="mt-4 flex gap-3">
        <button onClick={() => choose("all")} className="btn btn-ink flex-1 py-3">
          {t("cookie.accept")}
        </button>
        <button onClick={() => choose("necessary")} className="btn btn-ghost flex-1 py-3">
          {t("cookie.reject")}
        </button>
      </div>
    </div>
  );
}
