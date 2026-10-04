"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "@/components/ui/Icons";

export interface FilterOption {
  label: string;
  href: string;
  active: boolean;
  count?: number;
}
export interface FilterGroup {
  title: string;
  options: FilterOption[];
}

/**
 * "Filtros" button + slide-over panel (Para quién, tipo, colección, orden). Every option is a plain link
 * (server-rendered URLs), so filtering works without JS and the back button behaves; the panel closes on
 * navigation, Escape and backdrop click, and traps nothing else on the page while open.
 */
export function FilterDrawer({ groups, label, title, activeCount, resultLabel, clearHref, clearLabel }: { groups: FilterGroup[]; label: string; title: string; activeCount: number; resultLabel: string; clearHref?: string; clearLabel: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // portal: the sticky bar's backdrop-filter would otherwise become the containing block of `fixed`
  useEffect(() => setMounted(true), []);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      opener.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${activeCount ? "border-fg bg-fg text-bg" : "border-line bg-surface hover:border-fg/40"}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
          <circle cx="16" cy="6" r="2" />
          <circle cx="10" cy="12" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
        <span className="sr-only sm:not-sr-only">{label}</span>
        {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">{activeCount}</span>}
      </button>

      {mounted && createPortal(
      <div className={`fixed inset-0 z-[70] overflow-hidden ${open ? "" : "pointer-events-none invisible delay-500"}`} inert={!open}>
        <div className={`absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col bg-bg shadow-2xl transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
            <p className="headline text-2xl">{title}</p>
            <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-line hover:border-fg" aria-label="Cerrar">
              <IconClose className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-2">
            {groups
              .filter((g) => g.options.length > 1)
              .map((g) => (
                <section key={g.title} className="border-b border-line py-5 last:border-0">
                  <p className="kicker text-muted">{g.title}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {g.options.map((o) => (
                      <Link
                        key={o.href + o.label}
                        href={o.href}
                        scroll={false}
                        onClick={() => setOpen(false)}
                        aria-current={o.active ? "true" : undefined}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${o.active ? "border-fg bg-fg text-bg" : "border-line hover:border-fg/40"}`}
                      >
                        {o.label}
                        {o.count != null && <span className={`text-[11px] font-medium tabular-nums ${o.active ? "text-bg/70" : "text-muted"}`}>{o.count}</span>}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
          </div>
          <div className="flex items-center gap-3 border-t border-line px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {clearHref && (
              <Link href={clearHref} onClick={() => setOpen(false)} className="btn btn-ghost">
                {clearLabel}
              </Link>
            )}
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ink flex-1">
              {resultLabel}
            </button>
          </div>
        </div>
      </div>,
      document.body,
      )}
    </>
  );
}
