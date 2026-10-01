"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Flag } from "./Flags";

const LANGS = [
  ["es", "ES", "Español"],
  ["ca", "CA", "Català / Valencià"],
  ["eu", "EU", "Euskara"],
  ["gl", "GL", "Galego"],
  ["en", "EN", "English"],
  ["de", "DE", "Deutsch"],
] as const;

export function LanguageSwitcher({ current, className = "" }: { current: string; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (l: string) => {
    document.cookie = `locale=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    start(() => router.refresh());
  };
  return (
    <div className={`flex flex-wrap items-center gap-1 ${pending ? "opacity-60" : ""} ${className}`} role="group" aria-label="Idioma / Language">
      {LANGS.map(([code, label, title]) => (
        <button
          key={code}
          onClick={() => set(code)}
          aria-pressed={current === code}
          title={title}
          lang={code}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider transition-colors ${current === code ? "bg-white text-[#0d0d0d]" : "text-white/60 hover:text-white"}`}
        >
          <Flag code={code} className="h-3 w-[18px]" />
          {label}
        </button>
      ))}
    </div>
  );
}
