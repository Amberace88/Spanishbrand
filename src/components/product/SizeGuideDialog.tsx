"use client";
import { useRef } from "react";
import type { SizeGuide } from "@/lib/products/queries";
import { useT } from "@/components/providers/I18nProvider";
import { SizeFinder } from "./SizeFinder";

/** Size guide opened next to the size picker: the real measurement table + the size finder, in a native modal dialog. */
export function SizeGuideDialog({ guide, label, note }: { guide: SizeGuide; label: string; note: string }) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} aria-haspopup="dialog" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg underline decoration-line decoration-2 underline-offset-4 transition-colors hover:decoration-accent">
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
          <rect x="1.5" y="6" width="17" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 6v3M8 6v2M11 6v3M14 6v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {label}
      </button>
      <dialog
        ref={ref}
        aria-label={label}
        onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
        className="m-auto w-[min(92vw,560px)] rounded-3xl border border-line bg-bg p-0 text-fg shadow-2xl backdrop:bg-black/55 backdrop:backdrop-blur-sm"
      >
        <div className="max-h-[85svh] overflow-y-auto p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <h2 className="headline text-2xl">{label}</h2>
            <button type="button" onClick={() => ref.current?.close()} className="-mr-2 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl hover:bg-fg/[0.06]" aria-label={t("common.close")}>
              ×
            </button>
          </div>
          <div className="-mx-1 mt-5 overflow-x-auto">
            <table className="w-full min-w-[380px] text-left text-[13px] tabular-nums">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-2 pr-3 font-semibold">{guide.unit}</th>
                  {guide.sizes.map((s) => (
                    <th key={s} className="px-2 py-2 font-semibold">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guide.rows.map((r) => (
                  <tr key={r.label} className="border-b border-line/60">
                    <td className="py-2 pr-3 font-medium">{r.label}</td>
                    {r.values.map((v, i) => (
                      <td key={i} className="px-2 py-2 text-muted">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">{note}</p>
          <SizeFinder guide={guide} />
        </div>
      </dialog>
    </>
  );
}
