"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

const LANGS = [
  ["es", "ES"],
  ["en", "EN"],
  ["de", "DE"],
] as const;

export function LanguageSwitcher({ current, className = "" }: { current: string; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (l: string) => {
    document.cookie = `locale=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    start(() => router.refresh());
  };
  return (
    <div className={`flex items-center gap-1 ${pending ? "opacity-60" : ""} ${className}`} role="group" aria-label="Idioma / Language">
      {LANGS.map(([code, label]) => (
        <button
          key={code}
          onClick={() => set(code)}
          aria-pressed={current === code}
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider transition-colors ${current === code ? "bg-white text-[#0d0d0d]" : "text-white/60 hover:text-white"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
