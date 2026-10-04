"use client";
import { IconCheck } from "@/components/ui/Icons";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/providers/I18nProvider";
import { MAX_PHOTOS, PHOTO_KINDS, REASONS, RETURN_SHIP_DAYS, fmtDate, type PhotoKind, type ReasonCode, type Resolution, type ReturnType } from "@/lib/returns/rules";

/* ───────────────────────── copy (es + en; other locales fall back to es) ───────────────────────── */
const ES = {
  steps: ["Pedido", "Motivo", "Artículos", "Fotos", "Solución", "Confirmar"],
  findTitle: "Encuentra tu pedido",
  findSub: "Usa el número de pedido (lo tienes en el email de confirmación) y el email con el que compraste.",
  orderNumber: "Número de pedido",
  email: "Email de la compra",
  find: "Buscar pedido",
  notFound: "No encontramos un pedido con esos datos. Revisa el número y el email.",
  rateLimited: "Demasiados intentos. Espera unos minutos.",
  typeTitle: "¿Qué ha pasado?",
  issueTitle: "Hay un problema con mi pedido",
  issueSub: "Defecto de impresión, llegó dañado, artículo equivocado o falta algo. Lo solucionamos sin coste para ti.",
  wdTitle: "Quiero devolverlo",
  wdSub: (d: string) => `Derecho de desistimiento: 14 días naturales desde la entrega${d ? ` (hasta el ${d})` : ""}. El envío de vuelta corre de tu cuenta.`,
  wdClosed: "El plazo de desistimiento ha terminado o los artículos son personalizados.",
  notShipped: "Tu pedido aún no ha salido. Si quieres cancelarlo, escríbenos cuanto antes desde Contacto: si todavía no está en producción, lo cancelamos sin coste.",
  itemsTitle: "¿Qué artículos?",
  qty: "Cantidad",
  reason: "Motivo",
  details: "Detalles de este artículo (opcional)",
  personalized: "Personalizado · sin desistimiento (art. 103 c TRLGDCU)",
  personalizedIssue: "Personalizado",
  alreadyRequested: (n: number) => `${n} ya en otra solicitud`,
  photosTitle: "Fotos",
  photosSubIssue: "Necesitamos al menos 2 fotos claras con luz natural. Las usamos para resolver tu caso más rápido.",
  photosSubWd: "Opcional, pero recomendable: una foto del estado del artículo antes de enviarlo te protege ante cualquier duda.",
  needed: "Fotos recomendadas",
  add: "Añadir fotos",
  kind: "Tipo de foto",
  uploading: "Subiendo…",
  remove: "Quitar",
  heic: "Esta foto está en formato HEIC. Cambia la cámara a «Más compatible» o haz una captura de pantalla de la foto.",
  photoFail: "No se pudo subir una foto. Inténtalo de nuevo.",
  solutionTitle: "¿Cómo lo solucionamos?",
  res: {
    REPRINT: ["Reposición sin coste", "Te fabricamos y enviamos uno nuevo. Es lo más rápido."],
    REFUND: ["Reembolso", "Al mismo método de pago."],
    STORE_CREDIT: ["Vale de compra +10 %", "Recibes el importe del artículo + 10 % extra para tu próxima compra, al momento de recibir la devolución."],
    EXCHANGE: ["Cambio de talla", "Te enviamos la talla correcta cuando recibamos la devolución."],
  } as Record<Resolution, [string, string]>,
  wdRefundNote: "El reembolso incluye el precio del artículo y el envío estándar original (si devuelves el pedido completo). Se realiza en un máximo de 14 días; podemos esperar a recibir el artículo o el justificante de envío.",
  exchangeNote: "¿Qué talla o color necesitas?",
  yourData: "Tus datos",
  name: "Nombre y apellidos",
  phone: "Teléfono (para el transportista)",
  description: "Cuéntanos qué ha pasado",
  descriptionPh: "Describe el problema con el mayor detalle posible (mín. 10 caracteres).",
  shipTo: "Dirección para la reposición / cambio",
  line1: "Dirección",
  line2: "Piso, puerta (opcional)",
  postal: "Código postal",
  city: "Ciudad",
  province: "Provincia",
  country: "País",
  reviewTitle: "Revisa y confirma",
  decl: {
    truthful: "Confirmo que las fotos y la información corresponden a mi pedido y son veraces.",
    keep_item: "Conservaré el artículo hasta que se resuelva la solicitud (podríamos pedírtelo para el fabricante).",
    withdraw: "Por la presente comunico que desisto de mi contrato de venta de los artículos seleccionados (art. 106 TRLGDCU).",
    return_cost: "Entiendo que los gastos directos de devolución corren de mi cuenta (art. 108.1 TRLGDCU).",
    return_deadline: `Enviaré los artículos en un plazo máximo de ${RETURN_SHIP_DAYS} días naturales desde hoy, bien embalados, y guardaré el justificante de envío.`,
    condition: "Entiendo que puedo comprobar el artículo como en una tienda, pero si lo he usado, lavado o dañado se descontará la depreciación del importe (art. 108.2 TRLGDCU).",
    privacy: "Acepto el tratamiento de mis datos y fotos para gestionar esta solicitud y, si procede, reclamarla al fabricante (Política de privacidad).",
  } as Record<string, string>,
  submit: "Enviar solicitud",
  sending: "Enviando…",
  back: "Atrás",
  next: "Continuar",
  required: "Revisa los campos marcados.",
  errors: {
    PERSONALIZED: "Los productos personalizados no admiten desistimiento.",
    WITHDRAWAL_EXPIRED: "El plazo de desistimiento de 14 días ha terminado.",
    PHOTOS: "Faltan fotos: al menos 2, incluida una del artículo completo.",
    DECLARATIONS: "Debes aceptar todas las declaraciones.",
    RATE_LIMITED: "Demasiadas solicitudes. Inténtalo más tarde.",
    QUANTITY: "La cantidad no es válida.",
    INVALID: "Revisa los datos del formulario.",
  } as Record<string, string>,
  genericError: "No se pudo enviar la solicitud. Inténtalo de nuevo o escríbenos.",
  doneTitle: "Solicitud enviada",
  doneSub: "Te hemos enviado un email con el acuse de recibo.",
  ref: "Referencia",
  nextSteps: "Próximos pasos",
  doneIssue: ["Revisamos tus fotos (normalmente en 24–48 h laborables).", "Si es un defecto o daño, te enviamos la reposición o el reembolso sin coste.", "No tires el artículo hasta que lo resolvamos."],
  doneWd: (d: string) => [`Envía los artículos antes del ${d}, con la referencia escrita dentro del paquete.`, "Usa un envío con seguimiento: los gastos de devolución corren de tu cuenta.", "Cuando lo recibamos y revisemos, procesamos la solución elegida."],
  returnAddress: "Dirección de devolución",
  addressLater: "Te enviaremos la dirección de devolución por email en breve.",
  status: "Ver estado de la solicitud",
  personalizedNotice: "Este pedido contiene productos personalizados: solo admiten reclamación por defecto, daño o error.",
  openRequests: "Ya tienes solicitudes abiertas para este pedido:",
  shippedNote: (d: string) => `Entregado el ${d}`,
  inTransit: "En camino o sin fecha de entrega confirmada",
  whenQ: "¿Cuándo apareció el problema?",
  whenA: ["Al recibirlo", "Tras el primer lavado", "Tras varias semanas de uso"],
  washQ: "¿Cómo lo has lavado?",
  washA: ["Aún sin lavar", "En frío y del revés", "Con agua caliente", "Con secadora"],
  diagNote: "Nos ayuda a distinguir un defecto de fabricación del desgaste normal por uso o lavado.",
  helpTitle: "Antes de empezar",
  help: ["Ten a mano el número de pedido y el email de compra.", "Si hay un defecto, haz fotos con buena luz: el artículo entero, el detalle y la etiqueta.", "Los productos personalizados solo se aceptan por defecto o error."],
};
type Copy = typeof ES;
const EN: Copy = {
  ...ES,
  steps: ["Order", "Reason", "Items", "Photos", "Solution", "Confirm"],
  findTitle: "Find your order",
  findSub: "Use the order number (in your confirmation email) and the email you bought with.",
  orderNumber: "Order number",
  email: "Purchase email",
  find: "Find order",
  notFound: "We couldn't find an order with those details. Check the number and the email.",
  rateLimited: "Too many attempts. Please wait a few minutes.",
  typeTitle: "What happened?",
  issueTitle: "There's a problem with my order",
  issueSub: "Print defect, arrived damaged, wrong item or something missing. We fix it at no cost to you.",
  wdTitle: "I want to return it",
  wdSub: (d: string) => `Right of withdrawal: 14 calendar days from delivery${d ? ` (until ${d})` : ""}. Return shipping is paid by you.`,
  wdClosed: "The withdrawal period has ended or the items are personalised.",
  notShipped: "Your order hasn't shipped yet. To cancel it, contact us as soon as possible: if it isn't in production yet, we cancel it free of charge.",
  itemsTitle: "Which items?",
  qty: "Quantity",
  reason: "Reason",
  details: "Details for this item (optional)",
  personalized: "Personalised · no withdrawal (art. 103 c TRLGDCU)",
  personalizedIssue: "Personalised",
  alreadyRequested: (n: number) => `${n} already in another request`,
  photosTitle: "Photos",
  photosSubIssue: "We need at least 2 clear photos in natural light. They let us solve your case faster.",
  photosSubWd: "Optional but recommended: a photo of the item's condition before sending protects you if anything is disputed.",
  needed: "Recommended photos",
  add: "Add photos",
  kind: "Photo type",
  uploading: "Uploading…",
  remove: "Remove",
  heic: "This photo is HEIC. Set your camera to “Most compatible” or take a screenshot of the photo.",
  photoFail: "A photo couldn't be uploaded. Please try again.",
  solutionTitle: "How should we fix it?",
  res: {
    REPRINT: ["Free replacement", "We make and ship a new one. The fastest option."],
    REFUND: ["Refund", "To the original payment method."],
    STORE_CREDIT: ["Store voucher +10%", "The item's value + 10% extra for your next order, as soon as we receive the return."],
    EXCHANGE: ["Size exchange", "We send the right size once we receive the return."],
  },
  wdRefundNote: "The refund includes the item price and the original standard shipping (if you return the whole order). It's made within 14 days; we may wait until we receive the item or proof of dispatch.",
  exchangeNote: "Which size or colour do you need?",
  yourData: "Your details",
  name: "Full name",
  phone: "Phone (for the courier)",
  description: "Tell us what happened",
  descriptionPh: "Describe the issue in as much detail as possible (min. 10 characters).",
  shipTo: "Address for the replacement / exchange",
  line1: "Address",
  line2: "Flat, door (optional)",
  postal: "Postcode",
  city: "City",
  province: "Province / region",
  country: "Country",
  reviewTitle: "Review and confirm",
  decl: {
    truthful: "I confirm the photos and information belong to my order and are accurate.",
    keep_item: "I'll keep the item until the request is resolved (we may ask for it on behalf of the manufacturer).",
    withdraw: "I hereby give notice that I withdraw from my contract of sale of the selected items (art. 106 TRLGDCU).",
    return_cost: "I understand the direct cost of returning the items is paid by me (art. 108.1 TRLGDCU).",
    return_deadline: `I'll send the items within ${RETURN_SHIP_DAYS} calendar days from today, well packed, and keep proof of dispatch.`,
    condition: "I understand I may inspect the item as in a shop, but if it has been used, washed or damaged the loss in value will be deducted (art. 108.2 TRLGDCU).",
    privacy: "I accept the processing of my data and photos to handle this request and, if applicable, claim it from the manufacturer (Privacy policy).",
  },
  submit: "Submit request",
  sending: "Sending…",
  back: "Back",
  next: "Continue",
  required: "Please check the highlighted fields.",
  errors: {
    PERSONALIZED: "Personalised products can't be withdrawn.",
    WITHDRAWAL_EXPIRED: "The 14-day withdrawal period has ended.",
    PHOTOS: "Photos missing: at least 2, including one of the whole item.",
    DECLARATIONS: "Please accept all statements.",
    RATE_LIMITED: "Too many requests. Please try later.",
    QUANTITY: "Invalid quantity.",
    INVALID: "Please check the form.",
  },
  genericError: "The request couldn't be sent. Please try again or contact us.",
  doneTitle: "Request sent",
  doneSub: "We've emailed you an acknowledgment.",
  ref: "Reference",
  nextSteps: "Next steps",
  doneIssue: ["We review your photos (usually within 24–48 working hours).", "If it's a defect or damage, we send a replacement or refund at no cost.", "Don't throw the item away until we resolve it."],
  doneWd: (d: string) => [`Send the items before ${d}, with the reference written inside the parcel.`, "Use a tracked service: return shipping is paid by you.", "Once received and inspected, we process the solution you chose."],
  returnAddress: "Return address",
  addressLater: "We'll email you the return address shortly.",
  status: "View request status",
  personalizedNotice: "This order contains personalised products: they can only be claimed for a defect, damage or error.",
  openRequests: "You already have open requests for this order:",
  shippedNote: (d: string) => `Delivered on ${d}`,
  inTransit: "In transit or no confirmed delivery date",
  whenQ: "When did the problem appear?",
  whenA: ["On arrival", "After the first wash", "After several weeks of use"],
  washQ: "How have you washed it?",
  washA: ["Not washed yet", "Cold and inside out", "Hot water", "Tumble dryer"],
  diagNote: "It helps us tell a manufacturing defect from normal wear or washing.",
  helpTitle: "Before you start",
  help: ["Have your order number and purchase email ready.", "For defects, take photos in good light: the whole item, the detail and the label.", "Personalised products are only accepted for defects or errors."],
};

/* ───────────────────────── types ───────────────────────── */
interface Item {
  id: string;
  name: string;
  variant: string | null;
  image: string | null;
  quantity: number;
  unitPrice: number;
  personalized: boolean;
  alreadyRequested: number;
  eligibility: { withdrawal: boolean; withdrawalReason?: string; issue: boolean; issueReason?: string; withdrawalDeadline: string | null; providerDeadline: string | null };
}
interface Order {
  orderId: string;
  orderNumber: number;
  email: string;
  customerName: string | null;
  shippingAddress: Record<string, string> | null;
  currency: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: Item[];
  openRequests: { rma: string; status: string }[];
}
interface Photo {
  id: string;
  preview: string;
  path?: string;
  kind: PhotoKind;
  state: "uploading" | "done" | "error";
}
type Sel = Record<string, { on: boolean; quantity: number; reason: ReasonCode | ""; details: string }>;

/* ───────────────────────── helpers ───────────────────────── */
async function compress(file: File): Promise<Blob> {
  // keep upload small for mobile networks (Netlify body limit): ≤2000px JPEG
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
  } catch {
    return file;
  }
}

const Step = ({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) => (
  <li className="flex min-w-0 items-center gap-2">
    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold transition-colors ${active ? "bg-accent text-white" : done ? "bg-fg text-bg" : "border border-line text-muted"}`}>{done ? <IconCheck className="h-3.5 w-3.5" /> : n}</span>
    <span className={`hidden truncate text-[12px] font-semibold uppercase tracking-[0.08em] md:block ${active ? "text-fg" : "text-muted"}`}>{label}</span>
  </li>
);

/* ───────────────────────── component ───────────────────────── */
export function ReturnWizard({ initialOrder, initialEmail }: { initialOrder?: string; initialEmail?: string }) {
  const locale = useLocale();
  const T = locale === "en" ? EN : ES;
  const L = locale === "en" ? "en" : "es";
  const dateLocale = locale === "en" ? "en-GB" : "es-ES";

  const [step, setStep] = useState(0);
  const [orderNumber, setOrderNumber] = useState(initialOrder ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [order, setOrder] = useState<Order | null>(null);
  const [type, setType] = useState<ReturnType | null>(null);
  const [sel, setSel] = useState<Sel>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [exchangeNote, setExchangeNote] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "" });
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState(-1);
  const [wash, setWash] = useState(-1);
  const [address, setAddress] = useState<Record<string, string>>({});
  const [decl, setDecl] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState<{ rma: string; returnAddress: string | null; returnDeadline: string | null } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const top = useRef<HTMLDivElement>(null);

  const go = (n: number) => {
    setError(null);
    setTouched(false);
    setStep(n);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* step 0: lookup */
  async function find(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch("/api/returns/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber: orderNumber.replace(/\D/g, ""), email }) }).catch(() => null);
    setBusy(false);
    if (!r || !r.ok) {
      setError(r?.status === 429 ? T.rateLimited : T.notFound);
      return;
    }
    const o = (await r.json()) as Order;
    setOrder(o);
    setContact({ name: o.customerName ?? "", phone: "" });
    const a = o.shippingAddress ?? {};
    setAddress({ line1: a.line1 ?? a.address1 ?? "", line2: a.line2 ?? "", postalCode: a.postal_code ?? a.postalCode ?? "", city: a.city ?? "", province: a.state ?? a.province ?? "", country: a.country ?? "ES" });
    setSel(Object.fromEntries(o.items.map((i) => [i.id, { on: false, quantity: Math.max(1, i.quantity - i.alreadyRequested), reason: "", details: "" }])));
    go(1);
  }

  const items = order?.items ?? [];
  const canWithdraw = items.some((i) => i.eligibility.withdrawal && i.quantity > i.alreadyRequested);
  const canIssue = items.some((i) => i.eligibility.issue && i.quantity > i.alreadyRequested);
  const notShipped = items.length > 0 && items.every((i) => i.eligibility.issueReason === "NOT_SHIPPED");
  const wdDeadline = items.find((i) => i.eligibility.withdrawalDeadline)?.eligibility.withdrawalDeadline ?? null;
  const reasonsFor = (t: ReturnType) => (Object.entries(REASONS) as [ReasonCode, (typeof REASONS)[ReasonCode]][]).filter(([, r]) => r.type === t);
  const selectable = (i: Item) => (type === "WITHDRAWAL" ? i.eligibility.withdrawal : i.eligibility.issue) && i.quantity > i.alreadyRequested;
  const chosen = items.filter((i) => sel[i.id]?.on && selectable(i));
  const neededKinds = useMemo(() => [...new Set(chosen.flatMap((i) => (sel[i.id]?.reason ? REASONS[sel[i.id].reason as ReasonCode].photos : [])))], [chosen, sel]);
  const photosDone = photos.filter((p) => p.state === "done");
  const needsAddress = resolution === "REPRINT" || resolution === "EXCHANGE";
  const needsDiag = type === "ISSUE" && chosen.some((i) => sel[i.id]?.reason === "PRINT_DEFECT");
  const declKeys = type === "ISSUE" ? ["truthful", "keep_item", "privacy"] : ["withdraw", "return_cost", "return_deadline", "condition", "privacy"];

  /* validation per step */
  const valid = {
    2: chosen.length > 0 && chosen.every((i) => sel[i.id].reason),
    3:
      type === "WITHDRAWAL" ||
      (photosDone.length >= 2 && (chosen.every((i) => sel[i.id].reason === "MISSING_ITEM") || photosDone.some((p) => p.kind === "product")) && !photos.some((p) => p.state === "uploading")),
    4: !!resolution && contact.name.trim().length >= 2 && description.trim().length >= 10 && (!needsAddress || (address.line1 && address.city && address.postalCode)) && (resolution !== "EXCHANGE" || exchangeNote.trim().length > 0) && (!needsDiag || (when >= 0 && wash >= 0)),
    5: declKeys.every((k) => decl[k]),
  } as Record<number, boolean>;

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_PHOTOS - photos.length;
    const list = [...files].slice(0, room);
    for (const f of list) {
      const id = Math.random().toString(36).slice(2);
      const kind: PhotoKind = neededKinds.find((k) => !photos.some((p) => p.kind === k)) ?? "other";
      const preview = URL.createObjectURL(f);
      setPhotos((ps) => [...ps, { id, preview, kind, state: "uploading" }]);
      const blob = await compress(f);
      const fd = new FormData();
      fd.append("file", blob, "photo.jpg");
      const r = await fetch("/api/returns/photo", { method: "POST", body: fd }).catch(() => null);
      const j = r ? await r.json().catch(() => ({})) : {};
      if (r?.ok && j.path) setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, path: j.path, state: "done" } : p)));
      else {
        setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, state: "error" } : p)));
        setError(j.error === "HEIC" ? T.heic : T.photoFail);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit() {
    setTouched(true);
    if (!valid[5] || !order || !type || !resolution) return;
    setBusy(true);
    setError(null);
    const body = {
      orderNumber: order.orderNumber,
      email: order.email,
      type,
      items: chosen.map((i) => ({ id: i.id, quantity: sel[i.id].quantity, reason: sel[i.id].reason, details: sel[i.id].details || undefined })),
      resolution,
      exchangeNote: resolution === "EXCHANGE" ? exchangeNote : undefined,
      description: needsDiag ? `[Apareció: ${ES.whenA[when]}] [Lavado: ${ES.washA[wash]}]\n${description}` : description,
      contact: { name: contact.name, phone: contact.phone || undefined },
      address: needsAddress ? Object.fromEntries(Object.entries(address).filter(([, v]) => v)) : undefined,
      photos: photosDone.map((p) => ({ path: p.path!, kind: p.kind })),
      declarations: declKeys.filter((k) => decl[k]),
      website: "",
    };
    const r = await fetch("/api/returns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    setBusy(false);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) {
      setError(T.errors[j.error] ?? T.genericError);
      return;
    }
    setDone({ rma: j.rma, returnAddress: j.returnAddress, returnDeadline: j.returnDeadline });
    go(6);
  }

  const next = (n: number) => {
    setTouched(true);
    if (valid[step] === false) {
      setError(T.required);
      return;
    }
    go(n);
  };

  /* ───────────────────────── render ───────────────────────── */
  const card = "rounded-[22px] border border-line bg-surface-2 p-5 sm:p-7";
  const bad = (cond: boolean) => (touched && cond ? "!border-accent" : "");
  return (
    <div ref={top} className="scroll-mt-28">
      {step < 6 && (
        <ol className="mb-8 grid grid-cols-6 gap-2 border-b border-line pb-5" aria-label="Progreso">
          {T.steps.map((s, i) => (
            <Step key={s} n={i + 1} label={s} active={i === step} done={i < step} />
          ))}
        </ol>
      )}

      {step === 0 && (
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <form onSubmit={find} className={card}>
            <h2 className="headline text-2xl sm:text-3xl">{T.findTitle}</h2>
            <p className="mt-2 text-sm text-muted">{T.findSub}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="eyebrow mb-2 block text-muted">{T.orderNumber}</span>
                <input className="field" inputMode="numeric" required placeholder="10001" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
              </label>
              <label className="block">
                <span className="eyebrow mb-2 block text-muted">{T.email}</span>
                <input className="field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
            </div>
            {error && <p className="mt-4 border-l-2 border-accent pl-3 text-sm text-accent">{error}</p>}
            <button className="btn btn-primary mt-6 w-full py-4 sm:w-auto sm:px-10" disabled={busy}>
              {busy ? "…" : T.find} <span aria-hidden>→</span>
            </button>
          </form>
          <aside className="rounded-[22px] bg-[#0b0b0b] p-6 text-[#f5f1e8] sm:p-7">
            <p className="kicker text-[#e0b84a]">{T.helpTitle}</p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[#f5f1e8]/80">
              {T.help.map((h) => (
                <li key={h} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-[#e0b84a]" />
                  {h}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      {step === 1 && order && (
        <div className="space-y-5">
          <OrderStrip order={order} T={T} dateLocale={dateLocale} />
          {order.openRequests.length > 0 && (
            <p className="rounded-2xl border border-line px-4 py-3 text-sm">
              {T.openRequests}{" "}
              {order.openRequests.map((r) => (
                <Link key={r.rma} className="font-semibold underline" href={`/returns/status?rma=${r.rma}&email=${encodeURIComponent(order.email)}`}>
                  {r.rma}
                </Link>
              ))}
            </p>
          )}
          {notShipped ? (
            <p className={`${card} text-sm`}>{T.notShipped}</p>
          ) : (
            <>
              <h2 className="headline text-2xl sm:text-3xl">{T.typeTitle}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <ChoiceCard active={type === "ISSUE"} disabled={!canIssue} onClick={() => setType("ISSUE")} title={T.issueTitle} sub={T.issueSub} icon="!" accent />
                <ChoiceCard active={type === "WITHDRAWAL"} disabled={!canWithdraw} onClick={() => setType("WITHDRAWAL")} title={T.wdTitle} sub={canWithdraw ? T.wdSub(wdDeadline ? fmtDate(wdDeadline, dateLocale) : "") : T.wdClosed} icon="↩" />
              </div>
              {items.some((i) => i.personalized) && <p className="text-sm text-muted">✦ {T.personalizedNotice}</p>}
            </>
          )}
          <Nav back={() => go(0)} next={type ? () => go(2) : undefined} T={T} />
        </div>
      )}

      {step === 2 && order && type && (
        <div className="space-y-5">
          <h2 className="headline text-2xl sm:text-3xl">{T.itemsTitle}</h2>
          <ul className="space-y-3">
            {items.map((i) => {
              const s = sel[i.id];
              const ok = selectable(i);
              const max = i.quantity - i.alreadyRequested;
              return (
                <li key={i.id} className={`${card} !p-4 sm:!p-5 ${!ok ? "opacity-55" : ""} ${s.on ? "!border-fg" : ""}`}>
                  <label className={`flex items-center gap-4 ${ok ? "cursor-pointer" : "cursor-not-allowed"}`}>
                    <input type="checkbox" disabled={!ok} checked={s.on && ok} onChange={(e) => setSel({ ...sel, [i.id]: { ...s, on: e.target.checked } })} className="h-5 w-5 shrink-0 accent-[var(--accent)]" />
                    <span className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl bg-bg">{i.image && <Image src={i.image} alt="" fill sizes="64px" className="object-cover" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-tight">{i.name}</span>
                      <span className="block text-sm text-muted">
                        {i.variant ?? ""} · × {i.quantity}
                      </span>
                      {i.personalized && <span className="mt-1 inline-block rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold">{type === "WITHDRAWAL" ? T.personalized : T.personalizedIssue}</span>}
                      {i.alreadyRequested > 0 && <span className="ml-1 mt-1 inline-block rounded-full bg-fg/10 px-2 py-0.5 text-[11px] font-semibold">{T.alreadyRequested(i.alreadyRequested)}</span>}
                    </span>
                  </label>
                  {s.on && ok && (
                    <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[110px_1fr]">
                      <label className="block">
                        <span className="eyebrow mb-1.5 block text-muted">{T.qty}</span>
                        <select className="field" value={s.quantity} onChange={(e) => setSel({ ...sel, [i.id]: { ...s, quantity: Number(e.target.value) } })}>
                          {Array.from({ length: max }, (_, k) => k + 1).map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="eyebrow mb-1.5 block text-muted">{T.reason}</span>
                        <select className={`field ${bad(!s.reason)}`} value={s.reason} onChange={(e) => setSel({ ...sel, [i.id]: { ...s, reason: e.target.value as ReasonCode } })}>
                          <option value="">—</option>
                          {reasonsFor(type).map(([code, r]) => (
                            <option key={code} value={code}>
                              {r[L]}
                            </option>
                          ))}
                        </select>
                        {s.reason && <span className="mt-1.5 block text-xs text-muted">{L === "en" ? REASONS[s.reason].hintEn : REASONS[s.reason].hintEs}</span>}
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="eyebrow mb-1.5 block text-muted">{T.details}</span>
                        <input className="field" maxLength={1000} value={s.details} onChange={(e) => setSel({ ...sel, [i.id]: { ...s, details: e.target.value } })} />
                      </label>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {error && <p className="border-l-2 border-accent pl-3 text-sm text-accent">{error}</p>}
          <Nav back={() => go(1)} next={() => next(3)} T={T} />
        </div>
      )}

      {step === 3 && type && (
        <div className="space-y-5">
          <h2 className="headline text-2xl sm:text-3xl">{T.photosTitle}</h2>
          <p className="text-sm text-muted">{type === "ISSUE" ? T.photosSubIssue : T.photosSubWd}</p>
          {neededKinds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="eyebrow mr-1 self-center text-muted">{T.needed}:</span>
              {neededKinds.map((k) => {
                const has = photosDone.some((p) => p.kind === k);
                return (
                  <span key={k} className={`rounded-full px-3 py-1 text-xs font-semibold ${has ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400" : "border border-line"}`}>
                    {has ? <IconCheck className="mr-1 inline h-3.5 w-3.5 align-[-2px]" /> : null}
                    {PHOTO_KINDS[k][L]}
                  </span>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((p) => (
              <figure key={p.id} className={`overflow-hidden rounded-2xl border bg-surface-2 ${p.state === "error" ? "border-accent" : "border-line"}`}>
                <div className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt="" className="h-full w-full object-cover" />
                  {p.state === "uploading" && <span className="absolute inset-0 grid place-items-center bg-black/45 text-xs font-semibold text-white">{T.uploading}</span>}
                  <button type="button" onClick={() => setPhotos((ps) => ps.filter((x) => x.id !== p.id))} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-sm text-white" aria-label={T.remove}>
                    ×
                  </button>
                </div>
                <select value={p.kind} onChange={(e) => setPhotos((ps) => ps.map((x) => (x.id === p.id ? { ...x, kind: e.target.value as PhotoKind } : x)))} className="w-full border-0 border-t border-line bg-transparent px-2 py-2 text-xs" aria-label={T.kind}>
                  {(Object.keys(PHOTO_KINDS) as PhotoKind[]).map((k) => (
                    <option key={k} value={k}>
                      {PHOTO_KINDS[k][L]}
                    </option>
                  ))}
                </select>
              </figure>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button type="button" onClick={() => fileRef.current?.click()} className={`grid aspect-square place-items-center rounded-2xl border-2 border-dashed border-line text-center transition-colors hover:border-fg ${bad(type === "ISSUE" && photosDone.length < 2)}`}>
                <span>
                  <span className="block text-3xl leading-none">+</span>
                  <span className="mt-2 block text-xs font-semibold uppercase tracking-wider text-muted">{T.add}</span>
                  <span className="block text-[11px] text-muted">
                    {photos.length}/{MAX_PHOTOS}
                  </span>
                </span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple capture={undefined} className="hidden" onChange={(e) => addFiles(e.target.files)} />
          {error && <p className="border-l-2 border-accent pl-3 text-sm text-accent">{error}</p>}
          <Nav back={() => go(2)} next={() => next(4)} T={T} />
        </div>
      )}

      {step === 4 && type && (
        <div className="space-y-6">
          <h2 className="headline text-2xl sm:text-3xl">{T.solutionTitle}</h2>
          <div className={`grid gap-3 ${type === "ISSUE" ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
            {(type === "ISSUE" ? (["REPRINT", "REFUND"] as Resolution[]) : (["STORE_CREDIT", "EXCHANGE", "REFUND"] as Resolution[])).map((r, k) => (
              <ChoiceCard key={r} active={resolution === r} onClick={() => setResolution(r)} title={T.res[r][0]} sub={T.res[r][1]} badge={k === 0 ? (L === "en" ? "Recommended" : "Recomendado") : undefined} />
            ))}
          </div>
          {type === "WITHDRAWAL" && <p className="text-xs leading-relaxed text-muted">{T.wdRefundNote}</p>}
          {resolution === "EXCHANGE" && (
            <label className="block">
              <span className="eyebrow mb-2 block text-muted">{T.exchangeNote}</span>
              <input className={`field ${bad(!exchangeNote.trim())}`} maxLength={300} value={exchangeNote} onChange={(e) => setExchangeNote(e.target.value)} />
            </label>
          )}
          <div className={card}>
            <h3 className="text-lg font-bold">{T.yourData}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="eyebrow mb-1.5 block text-muted">{T.name}</span>
                <input className={`field ${bad(contact.name.trim().length < 2)}`} autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
              </label>
              <label className="block">
                <span className="eyebrow mb-1.5 block text-muted">{T.phone}</span>
                <input className="field" type="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              </label>
              <label className="block sm:col-span-2">
                <span className="eyebrow mb-1.5 block text-muted">{T.description}</span>
                <textarea className={`field min-h-[120px] ${bad(description.trim().length < 10)}`} maxLength={4000} placeholder={T.descriptionPh} value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
            </div>
            {needsDiag && (
              <div className="mt-6 grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
                {([[T.whenQ, T.whenA, when, setWhen], [T.washQ, T.washA, wash, setWash]] as [string, string[], number, (n: number) => void][]).map(([q, opts, val, set]) => (
                  <fieldset key={q}>
                    <legend className="eyebrow mb-2 text-muted">{q}</legend>
                    <div className="flex flex-wrap gap-2">
                      {opts.map((o, k) => (
                        <button key={o} type="button" onClick={() => set(k)} className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${val === k ? "border-fg bg-fg text-bg" : touched && val < 0 ? "border-accent" : "border-line hover:border-fg/50"}`}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <p className="text-xs text-muted sm:col-span-2">{T.diagNote}</p>
              </div>
            )}
            {needsAddress && (
              <div className="mt-6 border-t border-line pt-5">
                <h4 className="eyebrow mb-3 text-muted">{T.shipTo}</h4>
                <div className="grid gap-4 sm:grid-cols-6">
                  <Field className="sm:col-span-4" label={T.line1} v={address.line1} on={(v) => setAddress({ ...address, line1: v })} bad={bad(!address.line1)} ac="address-line1" />
                  <Field className="sm:col-span-2" label={T.line2} v={address.line2} on={(v) => setAddress({ ...address, line2: v })} ac="address-line2" />
                  <Field className="sm:col-span-2" label={T.postal} v={address.postalCode} on={(v) => setAddress({ ...address, postalCode: v })} bad={bad(!address.postalCode)} ac="postal-code" />
                  <Field className="sm:col-span-2" label={T.city} v={address.city} on={(v) => setAddress({ ...address, city: v })} bad={bad(!address.city)} ac="address-level2" />
                  <Field className="sm:col-span-2" label={T.province} v={address.province} on={(v) => setAddress({ ...address, province: v })} ac="address-level1" />
                </div>
              </div>
            )}
          </div>
          {error && <p className="border-l-2 border-accent pl-3 text-sm text-accent">{error}</p>}
          <Nav back={() => go(3)} next={() => next(5)} T={T} />
        </div>
      )}

      {step === 5 && order && type && resolution && (
        <div className="space-y-6">
          <h2 className="headline text-2xl sm:text-3xl">{T.reviewTitle}</h2>
          <div className={`${card} space-y-3 text-sm`}>
            <Row k={T.orderNumber} v={`#${order.orderNumber}`} />
            <Row k={T.typeTitle} v={type === "ISSUE" ? T.issueTitle : T.wdTitle} />
            {chosen.map((i) => (
              <Row key={i.id} k={`${i.name}${i.variant ? ` · ${i.variant}` : ""} × ${sel[i.id].quantity}`} v={REASONS[sel[i.id].reason as ReasonCode][L]} />
            ))}
            <Row k={T.photosTitle} v={String(photosDone.length)} />
            <Row k={T.solutionTitle} v={T.res[resolution][0] + (resolution === "EXCHANGE" ? ` · ${exchangeNote}` : "")} />
            <Row k={T.name} v={contact.name} />
          </div>
          <fieldset className="space-y-3">
            {declKeys.map((k) => (
              <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-relaxed transition-colors ${decl[k] ? "border-fg bg-fg/[0.03]" : touched ? "border-accent" : "border-line"}`}>
                <input type="checkbox" checked={!!decl[k]} onChange={(e) => setDecl({ ...decl, [k]: e.target.checked })} className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]" />
                <span>
                  {T.decl[k]}
                  {k === "privacy" && (
                    <>
                      {" "}
                      <Link href="/privacy" className="underline" target="_blank">
                        ↗
                      </Link>
                    </>
                  )}
                </span>
              </label>
            ))}
          </fieldset>
          {error && <p className="border-l-2 border-accent pl-3 text-sm text-accent">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => go(4)} className="btn btn-ghost px-6 py-3.5">
              ← {T.back}
            </button>
            <button type="button" onClick={submit} disabled={busy} className="btn btn-primary px-10 py-4">
              {busy ? T.sending : T.submit} {!busy && <span aria-hidden>→</span>}
            </button>
          </div>
        </div>
      )}

      {step === 6 && done && order && (
        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-600 text-3xl text-white"><IconCheck className="h-8 w-8" /></span>
          <h2 className="headline mt-6 text-3xl sm:text-4xl">{T.doneTitle}</h2>
          <p className="mt-2 text-muted">{T.doneSub}</p>
          <p className="mt-6 inline-block rounded-2xl border border-line px-5 py-3">
            <span className="eyebrow block text-muted">{T.ref}</span>
            <span className="font-mono text-2xl font-bold tracking-wider">{done.rma}</span>
          </p>
          <div className={`${card} mt-8 text-left`}>
            <h3 className="eyebrow text-muted">{T.nextSteps}</h3>
            <ol className="mt-3 space-y-2 text-sm">
              {(type === "WITHDRAWAL" ? T.doneWd(fmtDate(done.returnDeadline, dateLocale)) : T.doneIssue).map((s, k) => (
                <li key={k} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-fg text-xs font-bold text-bg">{k + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            {type === "WITHDRAWAL" && (
              <div className="mt-5 rounded-2xl bg-bg p-4 text-sm">
                <p className="eyebrow mb-1 text-muted">{T.returnAddress}</p>
                {done.returnAddress ? <p className="whitespace-pre-line font-medium">{done.returnAddress}</p> : <p>{T.addressLater}</p>}
              </div>
            )}
          </div>
          <Link href={`/returns/status?rma=${done.rma}&email=${encodeURIComponent(order.email)}`} className="btn btn-primary mt-8 px-8 py-4">
            {T.status} →
          </Link>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── small parts ───────────────────────── */
function OrderStrip({ order, T, dateLocale }: { order: Order; T: Copy; dateLocale: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-[#0b0b0b] px-5 py-4 text-sm text-[#f5f1e8]">
      <span className="font-mono text-base font-bold">#{order.orderNumber}</span>
      <span className="text-[#f5f1e8]/70">{order.email}</span>
      <span className="text-[#e0b84a]">{order.deliveredAt ? T.shippedNote(fmtDate(order.deliveredAt, dateLocale)) : T.inTransit}</span>
    </div>
  );
}

function ChoiceCard({ active, disabled, onClick, title, sub, icon, accent, badge }: { active: boolean; disabled?: boolean; onClick: () => void; title: string; sub: string; icon?: string; accent?: boolean; badge?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={`group relative flex h-full flex-col rounded-[22px] border-2 p-5 text-left transition-[border-color,background-color,box-shadow] duration-150 sm:p-6 ${active ? "border-accent bg-accent/[0.04] shadow-[0_18px_40px_-24px_var(--accent)]" : "border-line bg-surface-2 hover:border-fg/40"} ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
    >
      {badge && <span className="absolute right-4 top-4 rounded-full bg-gold/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">{badge}</span>}
      {icon && <span className={`mb-4 grid h-10 w-10 place-items-center rounded-full text-lg font-bold ${accent ? "bg-accent text-white" : "bg-fg text-bg"}`}>{icon}</span>}
      <span className="pr-16 text-lg font-bold leading-tight">{title}</span>
      <span className="mt-2 text-sm leading-relaxed text-muted">{sub}</span>
      <span className={`absolute bottom-5 right-5 grid h-6 w-6 place-items-center rounded-full border-2 text-[11px] ${active ? "border-accent bg-accent text-white" : "border-line"}`}>{active ? <IconCheck className="h-3.5 w-3.5" /> : null}</span>
    </button>
  );
}

function Field({ label, v, on, bad = "", className = "", ac }: { label: string; v?: string; on: (v: string) => void; bad?: string; className?: string; ac?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="eyebrow mb-1.5 block text-muted">{label}</span>
      <input className={`field ${bad}`} autoComplete={ac} value={v ?? ""} onChange={(e) => on(e.target.value)} />
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-2 last:border-0 last:pb-0">
      <span className="text-muted">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}

function Nav({ back, next, T }: { back?: () => void; next?: () => void; T: Copy }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      {back ? (
        <button type="button" onClick={back} className="btn btn-ghost px-6 py-3.5">
          ← {T.back}
        </button>
      ) : (
        <span />
      )}
      {next && (
        <button type="button" onClick={next} className="btn btn-primary px-8 py-3.5">
          {T.next} →
        </button>
      )}
    </div>
  );
}
