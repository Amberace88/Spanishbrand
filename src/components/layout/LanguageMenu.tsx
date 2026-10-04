"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale } from "@/components/providers/I18nProvider";
import { Flag, LANGUAGES } from "./Flags";

/** Header language selector: flag pill + dropdown with every language spoken across Spain. */
export function LanguageMenu({ align = "right", className = "" }: { align?: "left" | "right"; className?: string }) {
  const current = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const active = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (code: string) => {
    setOpen(false);
    if (code === current) return;
    document.cookie = `locale=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.lang = code;
    start(() => router.refresh());
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Idioma: ${active.name}`}
        className={`flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-bold tracking-[0.08em] transition-colors hover:bg-fg/[0.06] ${open ? "bg-fg/[0.06]" : ""} ${pending ? "opacity-60" : ""}`}
      >
        <Flag code={active.code} className="h-[15px] w-[22px]" />
        <span className="hidden sm:inline">{active.short}</span>
        <svg viewBox="0 0 12 12" className={`hidden h-2.5 w-2.5 transition-transform sm:block ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="M2 4.5 L6 8 L10 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        role="listbox"
        aria-label="Idioma / Language"
        className={`absolute ${align === "left" ? "left-0 origin-top-left" : "right-0 origin-top-right"} top-[calc(100%+10px)] z-[80] w-[min(300px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-line bg-bg p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] transition-[opacity,transform,visibility] duration-150 ease-out ${open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-1 scale-[0.98] opacity-0"}`}
      >
        <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Idioma · Language</p>
        {LANGUAGES.map((l) => {
          const on = l.code === current;
          return (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={on}
              lang={l.code}
              onClick={() => choose(l.code)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${on ? "bg-fg/[0.06]" : "hover:bg-fg/[0.04]"}`}
            >
              <Flag code={l.code} className="h-[18px] w-[27px]" />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold leading-tight">{l.name}</span>
                <span className="block truncate text-[11px] text-muted">{l.region}</span>
              </span>
              {on ? (
                <svg viewBox="0 0 16 16" className="h-4 w-4 text-accent" aria-hidden>
                  <path d="M3 8.5 L6.5 12 L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span className="text-[10px] font-bold tracking-wider text-muted">{l.short}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
