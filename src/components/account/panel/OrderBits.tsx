import "./account.css";
import Image from "next/image";
import { Check } from "lucide-react";
import { ORDER_STEPS, orderStatusTone, orderStepIndex, type OrderStep, type StatusTone } from "@/lib/account-panel";

const TONE: Record<StatusTone, string> = {
  done: "bg-[#1f7a49]/10 text-[#1f7a49] ring-[#1f7a49]/25 dark:text-[#5fd394]",
  progress: "bg-[#c9a227]/14 text-[#7a5c0a] ring-[#c9a227]/35 dark:text-[#f1d27a]",
  attention: "bg-accent/10 text-accent ring-accent/30",
  closed: "bg-surface-2 text-muted ring-line",
};
const DOT: Record<StatusTone, string> = { done: "bg-[#1f7a49] dark:bg-[#5fd394]", progress: "bg-gold", attention: "bg-accent", closed: "bg-muted" };

export function StatusBadge({ status, label, tone: forced, className = "" }: { status?: string; label: string; tone?: StatusTone; className?: string }) {
  const tone = forced ?? orderStatusTone(status ?? "");
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${TONE[tone]} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} aria-hidden />
      {label}
    </span>
  );
}

/** Four-step order journey; vertical on phones, horizontal from 640px. */
export function OrderStepper({ status, labels, dates, compact = false, title }: { status: string; labels: Record<OrderStep, string>; dates?: Partial<Record<OrderStep, string>>; compact?: boolean; title: string }) {
  const idx = orderStepIndex(status);
  if (idx < 0) return null;
  return (
    <ol className="ac-steps" data-compact={compact || undefined} aria-label={title}>
      {ORDER_STEPS.map((s, i) => {
        const state = i < idx || (i === idx && s === "DELIVERED") ? "done" : i === idx ? "current" : "todo";
        return (
          <li key={s} className="ac-step" data-state={state} aria-current={state === "current" ? "step" : undefined}>
            <span className="ac-step-dot" aria-hidden>
              {state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : state === "current" ? <span className="h-2 w-2 rounded-full bg-white" /> : <span className="text-[11px] font-bold">{i + 1}</span>}
            </span>
            <span className="ac-step-label">{labels[s]}</span>
            {dates?.[s] && state !== "todo" ? <span className="ac-step-date">{dates[s]}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Overlapping thumbnails of an order's items (max 3 + counter). */
export function OrderThumbs({ images, total, size = "md" }: { images: (string | null)[]; total: number; size?: "md" | "lg" }) {
  const shown = images.slice(0, images.length > 3 || total > 3 ? 2 : 3);
  const extra = total - shown.length;
  const box = size === "lg" ? "h-[76px] w-[60px]" : "h-[52px] w-10 sm:h-[60px] sm:w-12";
  return (
    <div className={`flex shrink-0 items-center ${size === "lg" ? "w-[148px]" : "w-[88px] sm:w-28"}`} aria-hidden>
      {shown.map((src, i) => (
        <span key={i} className={`relative ${box} shrink-0 overflow-hidden rounded-lg bg-surface-2 ring-2 ring-surface ${i ? "-ml-4" : ""}`} style={{ zIndex: 3 - i }}>
          {src ? <Image src={src} alt="" fill sizes="60px" className="object-cover" /> : <span className="absolute inset-0 grid place-items-center text-muted">·</span>}
        </span>
      ))}
      {extra > 0 && <span className={`-ml-4 grid ${box} shrink-0 place-items-center rounded-lg bg-fg text-xs font-bold text-bg ring-2 ring-surface`}>+{extra}</span>}
    </div>
  );
}
