"use client";
import { useActionState, useState } from "react";
import { b2bRequestAction, creatorApplyAction, giftCardAction, type FormState } from "@/app/actions/growth";

type Copy = Record<string, string>;

function Done({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl bg-emerald-600/10 p-8 text-center">
      <p className="headline text-3xl">{title}</p>
      <p className="mt-2 text-muted">{body}</p>
    </div>
  );
}

const Label = ({ children, req }: { children: React.ReactNode; req?: boolean }) => (
  <span className="mb-1.5 block text-[13px] font-semibold">
    {children} {req && <span className="text-accent">*</span>}
  </span>
);

const Honeypot = () => <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />;

export function B2BForm({ c }: { c: Copy }) {
  const [state, action, pending] = useActionState<FormState, FormData>(b2bRequestAction, null);
  if (state?.ok) return <Done title={c.doneTitle} body={c.doneBody} />;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Honeypot />
      <label><Label req>{c.company}</Label><input name="company" required maxLength={120} className="field" /></label>
      <label><Label req>{c.contact}</Label><input name="contactName" required maxLength={120} className="field" /></label>
      <label><Label req>Email</Label><input name="email" type="email" required className="field" /></label>
      <label><Label>{c.phone}</Label><input name="phone" maxLength={40} className="field" /></label>
      <label>
        <Label req>{c.type}</Label>
        <select name="type" required className="field appearance-none">
          {["BAR_RESTAURANT", "FIESTA_PENA", "SPORTS_CLUB", "COMPANY", "EVENT", "SCHOOL", "OTHER"].map((v) => (
            <option key={v} value={v}>{c[`type_${v}`]}</option>
          ))}
        </select>
      </label>
      <label><Label>{c.quantity}</Label><input name="quantity" type="number" min={1} className="field" /></label>
      <label className="sm:col-span-2"><Label>{c.products}</Label><input name="products" maxLength={400} placeholder={c.productsPh} className="field" /></label>
      <label><Label>{c.deadline}</Label><input name="deadline" type="date" className="field" /></label>
      <label className="sm:col-span-2"><Label>{c.message}</Label><textarea name="message" rows={4} maxLength={2000} className="field !rounded-2xl" /></label>
      <label className="flex items-start gap-3 text-[13px] text-muted sm:col-span-2"><input type="checkbox" name="privacy" required className="mt-0.5 accent-[var(--accent)]" /> {c.privacy}</label>
      {state?.error && <p className="text-sm font-semibold text-accent sm:col-span-2">{c.error}</p>}
      <div className="sm:col-span-2"><button disabled={pending} className="btn btn-primary px-8 py-4">{pending ? "…" : c.submit}</button></div>
    </form>
  );
}

export function CreatorForm({ c }: { c: Copy }) {
  const [state, action, pending] = useActionState<FormState, FormData>(creatorApplyAction, null);
  if (state?.ok) return <Done title={c.doneTitle} body={c.doneBody} />;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Honeypot />
      <label><Label req>{c.name}</Label><input name="name" required maxLength={120} className="field" /></label>
      <label><Label req>Email</Label><input name="email" type="email" required className="field" /></label>
      <label>
        <Label req>{c.kind}</Label>
        <select name="kind" className="field appearance-none">
          <option value="DESIGNER">{c.kind_DESIGNER}</option>
          <option value="INFLUENCER">{c.kind_INFLUENCER}</option>
          <option value="AFFILIATE">{c.kind_AFFILIATE}</option>
        </select>
      </label>
      <label><Label>{c.platform}</Label><input name="platform" maxLength={60} placeholder="Instagram, TikTok, Behance…" className="field" /></label>
      <label><Label>{c.handle}</Label><input name="handle" maxLength={80} placeholder="@tu_usuario" className="field" /></label>
      <label><Label>{c.audience}</Label><input name="audience" type="number" min={0} className="field" /></label>
      <label className="sm:col-span-2"><Label>Portfolio / URL</Label><input name="portfolio" type="url" maxLength={300} placeholder="https://" className="field" /></label>
      <label className="sm:col-span-2"><Label>{c.message}</Label><textarea name="message" rows={4} maxLength={2000} className="field !rounded-2xl" /></label>
      <label className="flex items-start gap-3 text-[13px] text-muted sm:col-span-2"><input type="checkbox" name="privacy" required className="mt-0.5 accent-[var(--accent)]" /> {c.privacy}</label>
      {state?.error && <p className="text-sm font-semibold text-accent sm:col-span-2">{c.error}</p>}
      <div className="sm:col-span-2"><button disabled={pending} className="btn btn-primary px-8 py-4">{pending ? "…" : c.submit}</button></div>
    </form>
  );
}

export function GiftCardForm({ c, amounts }: { c: Copy; amounts: readonly number[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(giftCardAction, null);
  const [amount, setAmount] = useState<number>(amounts[1] ?? amounts[0]);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="amount" value={amount} />
      <div className="sm:col-span-2">
        <Label req>{c.amount}</Label>
        <div className="flex flex-wrap gap-2">
          {amounts.map((a) => (
            <button type="button" key={a} onClick={() => setAmount(a)} className={`rounded-2xl border px-5 py-3 text-lg font-bold transition-colors ${amount === a ? "border-fg bg-fg text-bg" : "border-line hover:border-fg"}`}>
              {a} €
            </button>
          ))}
        </div>
      </div>
      <label><Label req>{c.recipientEmail}</Label><input name="recipientEmail" type="email" required className="field" /></label>
      <label><Label>{c.recipientName}</Label><input name="recipientName" maxLength={80} className="field" /></label>
      <label><Label>{c.senderName}</Label><input name="senderName" maxLength={80} className="field" /></label>
      <label><Label req>{c.purchaserEmail}</Label><input name="purchaserEmail" type="email" required className="field" /></label>
      <label className="sm:col-span-2"><Label>{c.message}</Label><textarea name="message" rows={3} maxLength={400} className="field !rounded-2xl" /></label>
      {state?.error && <p className="text-sm font-semibold text-accent sm:col-span-2">{state.error === "NOT_CONFIGURED" ? c.notReady : c.error}</p>}
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button disabled={pending} className="btn btn-primary px-8 py-4">{pending ? "…" : `${c.submit} · ${amount} €`}</button>
        <span className="text-xs text-muted">{c.note}</span>
      </div>
    </form>
  );
}
