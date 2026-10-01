"use client";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/Wordmark";
import { useT } from "@/components/providers/I18nProvider";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const KEY = "ryg-install-dismissed";
const store = {
  get: () => {
    try {
      return Number(localStorage.getItem(KEY) ?? 0);
    } catch {
      return 0;
    }
  },
  set: () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {}
  },
};

/** Registers the service worker and offers "install the app" (Android/desktop prompt, iOS instructions). */
export function AppShell() {
  const t = useT();
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    if (standalone) return;
    const recentlyDismissed = Date.now() - store.get() < 14 * 864e5;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      if (!recentlyDismissed) setTimeout(() => setOpen(true), 12000);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    if (isIos && !recentlyDismissed) {
      setIos(true);
      const timer = setTimeout(() => setOpen(true), 20000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }
    const onOpen = () => setOpen(true);
    window.addEventListener("ryg:install", onOpen);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("ryg:install", onOpen);
    };
  }, []);

  if (!open || (!evt && !ios)) return null;
  const close = () => {
    store.set();
    setOpen(false);
  };
  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
    setOpen(false);
  };

  return (
    <div role="dialog" aria-label={t("app.installTitle")} className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md animate-rise rounded-3xl border border-line bg-surface p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] lg:bottom-6 lg:left-auto lg:right-6">
      <div className="flex items-start gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#0b0b0b] p-1.5">
          <BrandLogo variant="lion" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t("app.installTitle")}</p>
          <p className="mt-0.5 text-sm text-muted">{ios ? t("app.iosBody") : t("app.installBody")}</p>
        </div>
        <button onClick={close} aria-label={t("nav.close")} className="-mr-1 -mt-1 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-fg/5">
          ✕
        </button>
      </div>
      {ios ? (
        <ol className="mt-3 space-y-1.5 rounded-2xl bg-surface-2 p-3 text-sm">
          <li>
            1. {t("app.iosStep1")} <span aria-hidden>⬆︎</span>
          </li>
          <li>2. {t("app.iosStep2")}</li>
        </ol>
      ) : (
        <div className="mt-3 flex gap-2">
          <button onClick={install} className="btn btn-primary flex-1 !py-3">
            {t("app.install")}
          </button>
          <button onClick={close} className="btn btn-ghost !py-3">
            {t("app.later")}
          </button>
        </div>
      )}
    </div>
  );
}
