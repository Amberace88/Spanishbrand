"use client";
import "./cart.css";
import { useFormStatus } from "react-dom";
import { updateLineAction } from "@/app/actions/cart";

const Dots = () => (
  <span className="ct-dots" aria-hidden>
    <i />
    <i />
    <i />
  </span>
);

/** Shows the quantity being submitted (optimistic) while the server action runs. */
function Stepper({ lineId, quantity, max, labels }: { lineId: string; quantity: number; max: number; labels: { qty: string; dec: string; inc: string } }) {
  const { pending, data } = useFormStatus();
  const pendingQty = pending && data ? Number(data.get("quantity")) : null;
  const shown = pendingQty != null && Number.isFinite(pendingQty) && pendingQty > 0 ? pendingQty : quantity;
  return (
    <div className={`ct-step ${pending ? "ct-pending" : ""}`} role="group" aria-label={labels.qty}>
      <input type="hidden" name="lineId" value={lineId} />
      <button name="quantity" value={quantity - 1} aria-label={labels.dec} disabled={pending}>
        −
      </button>
      <output className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {shown}
      </output>
      <button name="quantity" value={quantity + 1} aria-label={labels.inc} disabled={pending || quantity >= max}>
        +
      </button>
    </div>
  );
}

function Remove({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button name="quantity" value={0} disabled={pending} className="group inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold uppercase tracking-wider text-muted transition-colors hover:bg-surface-2 hover:text-accent">
      {pending ? (
        <Dots />
      ) : (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 6h12M8 6V4.5h4V6M6 6l.7 10h6.6L14 6" />
        </svg>
      )}
      {label}
    </button>
  );
}

/** Quantity stepper + remove — same `updateLineAction` forms (lineId + quantity) as before, with pending feedback. */
export function LineControls({ lineId, quantity, max = 20, labels }: { lineId: string; quantity: number; max?: number; labels: { qty: string; dec: string; inc: string; remove: string } }) {
  return (
    <div className="flex items-center gap-2">
      <form action={updateLineAction}>
        <Stepper lineId={lineId} quantity={quantity} max={max} labels={labels} />
      </form>
      <form action={updateLineAction}>
        <input type="hidden" name="lineId" value={lineId} />
        <Remove label={labels.remove} />
      </form>
    </div>
  );
}
