"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Phones / tablets: subtotal + checkout stay in reach above the tab bar while the order summary is off-screen
 * (it sits under every line on small screens). Hidden once the summary itself is visible.
 */
export function CheckoutBar({ targetId, subtotal, label, totalLabel, href, fixLabel }: { targetId: string; subtotal: string; label: string; totalLabel: string; href: string | null; fixLabel: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(!e.isIntersecting && e.boundingClientRect.top > 0), { threshold: 0, rootMargin: "0px 0px -140px 0px" }); // tab bar + this bar
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);
  const jump = () => document.getElementById(targetId)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  return (
    <div
      className={`fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-bg/95 px-4 py-3 shadow-[0_-12px_30px_-18px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(.16,1,.3,1)] lg:hidden ${on ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"}`}
      aria-hidden={!on}
    >
      <div className="mx-auto flex max-w-xl items-center gap-4">
        <button type="button" onClick={jump} tabIndex={on ? 0 : -1} className="min-w-0 flex-1 text-left">
          <span className="block text-xs text-muted">{totalLabel}</span>
          <span className="headline block text-xl tabular-nums leading-tight">{subtotal}</span>
        </button>
        {href ? (
          <Link href={href} tabIndex={on ? 0 : -1} className="btn btn-primary shrink-0 px-6 py-3.5 text-[0.8rem]">
            {label}
          </Link>
        ) : (
          <button type="button" onClick={jump} tabIndex={on ? 0 : -1} className="btn btn-ink shrink-0 px-6 py-3.5 text-[0.8rem]">
            {fixLabel}
          </button>
        )}
      </div>
    </div>
  );
}
