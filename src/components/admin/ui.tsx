import type { ReactNode } from "react";
import Link from "next/link";

export function PageTitle({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="display text-5xl">{title}</h1>
        {sub && <p className="mt-2 text-sm text-stone-2">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`border border-sand bg-white ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-sand px-5 py-3">
          <h2 className="eyebrow text-[0.65rem] text-stone-2">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone = "ink" }: { label: string; value: ReactNode; hint?: string; tone?: "ink" | "rojo" | "green" | "oro" }) {
  const toneCls = tone === "rojo" ? "text-rojo" : tone === "green" ? "text-emerald-700" : tone === "oro" ? "text-oro" : "text-ink";
  return (
    <div className="border border-sand bg-white p-5">
      <p className="eyebrow text-[0.6rem] text-stone-2">{label}</p>
      <p className={`display mt-2 text-4xl tabular-nums ${toneCls}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-stone">{hint}</p>}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  ONLINE: "bg-emerald-100 text-emerald-800",
  PAID: "bg-emerald-100 text-emerald-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  SHIPPED: "bg-sky-100 text-sky-800",
  SUCCEEDED: "bg-emerald-100 text-emerald-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  LIVE: "bg-emerald-100 text-emerald-800",
  OPEN: "bg-emerald-100 text-emerald-800",
  IN_PRODUCTION: "bg-indigo-100 text-indigo-800",
  PROVIDER_ACCEPTED: "bg-indigo-100 text-indigo-800",
  SENT_TO_PROVIDER: "bg-indigo-100 text-indigo-800",
  PROCESSING: "bg-indigo-100 text-indigo-800",
  READY_FOR_FULFILLMENT: "bg-indigo-100 text-indigo-800",
  DEGRADED: "bg-amber-100 text-amber-800",
  RETRY_SCHEDULED: "bg-amber-100 text-amber-800",
  PENDING: "bg-amber-100 text-amber-800",
  PENDING_PAYMENT: "bg-stone-100 text-stone-700",
  DRAFT: "bg-stone-100 text-stone-700",
  IMPORTED: "bg-stone-100 text-stone-700",
  UNKNOWN: "bg-stone-100 text-stone-700",
  REQUIRES_REVIEW: "bg-red-100 text-red-800",
  FAILED: "bg-red-100 text-red-800",
  FULFILLMENT_FAILED: "bg-red-100 text-red-800",
  OFFLINE: "bg-red-100 text-red-800",
  ERROR: "bg-red-100 text-red-800",
  PROVIDER_UNAVAILABLE: "bg-red-100 text-red-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-stone-200 text-stone-700",
  REFUNDED: "bg-stone-200 text-stone-700",
  PAUSED: "bg-amber-100 text-amber-800",
  ARCHIVED: "bg-stone-200 text-stone-600",
};

export function Badge({ children, status }: { children?: ReactNode; status: string }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2 py-0.5 text-[0.68rem] font-semibold tracking-wide ${STATUS_TONE[status] ?? "bg-stone-100 text-stone-700"}`}>{children ?? status}</span>;
}

export function Dot({ status }: { status: string }) {
  const c = status === "ONLINE" ? "bg-emerald-500" : status === "DEGRADED" ? "bg-amber-500" : status === "UNKNOWN" ? "bg-stone-400" : "bg-red-500";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${c}`} />;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-stone-2">{children}</p>;
}

export function FilterLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={`rounded-sm px-3 py-1.5 text-xs font-semibold ${active ? "bg-ink text-bone" : "bg-white text-stone-2 ring-1 ring-sand hover:text-ink"}`}>
      {children}
    </Link>
  );
}

export function SubmitButton({ children, variant = "ink", name, value, className = "" }: { children: ReactNode; variant?: "ink" | "primary" | "ghost" | "danger"; name?: string; value?: string; className?: string }) {
  const v = variant === "primary" ? "btn-primary" : variant === "ghost" ? "btn-ghost" : variant === "danger" ? "border border-red-300 text-red-700 hover:bg-red-50" : "btn-ink";
  return (
    <button type="submit" name={name} value={value} className={`btn ${v} px-4 py-2.5 text-[0.62rem] ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-stone-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone">{hint}</span>}
    </label>
  );
}

export const inputCls = "w-full border border-sand bg-white px-3 py-2 text-sm outline-none focus:border-ink";
