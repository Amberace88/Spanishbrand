"use client";
import "./club.css";
import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { Gift, Loader2, Copy, Check } from "lucide-react";

/** Submit button for the redeem form: aria-disabled (stays focusable so the tooltip is reachable) + pending state. */
export function RedeemButton({ label, pendingLabel, disabled, hint }: { label: string; pendingLabel: string; disabled: boolean; hint?: string }) {
  const { pending } = useFormStatus();
  const tipId = useId();
  const off = disabled || pending;
  const btn = (
    <button
      type="submit"
      aria-disabled={off}
      aria-describedby={disabled && hint ? tipId : undefined}
      onClick={(e) => {
        if (off) e.preventDefault();
      }}
      className={`rg-focus inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full px-6 py-3 text-[15px] font-semibold transition-all duration-300 ${
        disabled
          ? "cursor-not-allowed bg-surface-2 text-muted ring-1 ring-line"
          : "bg-[linear-gradient(135deg,#f7e08a,#d9a93a_45%,#a37a22)] text-[#1a1206] shadow-[0_12px_30px_-12px_rgba(201,162,39,0.8),inset_0_1px_0_rgba(255,255,255,0.5)] hover:-translate-y-px hover:shadow-[0_18px_40px_-14px_rgba(201,162,39,0.9),inset_0_1px_0_rgba(255,255,255,0.5)]"
      }`}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Gift className="h-4 w-4" aria-hidden />}
      {pending ? pendingLabel : label}
    </button>
  );
  if (!disabled || !hint) return btn;
  return (
    <span className="rg-tip">
      {btn}
      <span role="tooltip" id={tipId}>
        {hint}
      </span>
    </span>
  );
}

export function CopyCode({ code, copyLabel, copiedLabel }: { code: string; copyLabel: string; copiedLabel: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setDone(true);
          setTimeout(() => setDone(false), 2200);
        } catch {
          /* clipboard blocked — the code stays visible and selectable */
        }
      }}
      className="rg-focus inline-flex items-center gap-2 rounded-full border border-[#e0b84a]/60 px-4 py-2 text-sm font-semibold text-[#f1d27a] transition-colors hover:bg-[#e0b84a]/10"
    >
      {done ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      <span aria-live="polite">{done ? copiedLabel : copyLabel}</span>
    </button>
  );
}
