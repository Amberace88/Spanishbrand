/**
 * Returns rules (Spain, TRLGDCU — Real Decreto Legislativo 1/2007):
 *  - art. 104: 14 calendar days from receipt to withdraw (desistimiento)
 *  - art. 103 c): no withdrawal for goods made to the consumer's specifications or clearly personalised
 *  - art. 107: refund within 14 days incl. standard outbound shipping; may be withheld until goods / proof of dispatch arrive
 *  - art. 108.1: consumer sends goods back within 14 days of notifying and bears the direct return cost (if informed beforehand)
 *  - art. 108.2: consumer liable for diminished value from handling beyond what is needed to check the goods
 *  - art. 120: 3-year legal guarantee for lack of conformity (defects)
 * Provider side: Printful / Printify / Gelato accept misprint, damage and wrong-item claims within 30 days of delivery.
 * Pure module (no server imports) so the form and the server share one source of truth.
 */

export const WITHDRAWAL_DAYS = 14;
export const RETURN_SHIP_DAYS = 14;
export const PROVIDER_CLAIM_DAYS = 30;
export const GUARANTEE_YEARS = 3;
export const MAX_PHOTOS = 8;

export type ReturnType = "ISSUE" | "WITHDRAWAL";
export type ReasonCode = "PRINT_DEFECT" | "DAMAGED" | "WRONG_ITEM" | "MISSING_ITEM" | "SIZE" | "CHANGED_MIND" | "NOT_AS_EXPECTED";
export type PhotoKind = "product" | "defect" | "label" | "package" | "other";

export const REASONS: Record<ReasonCode, { type: ReturnType; es: string; en: string; hintEs: string; hintEn: string; photos: PhotoKind[] }> = {
  PRINT_DEFECT: {
    type: "ISSUE",
    es: "Defecto de impresión o fabricación",
    en: "Print or manufacturing defect",
    hintEs: "Manchas, colores muy distintos, impresión desplazada, costuras abiertas…",
    hintEn: "Stains, very different colours, shifted print, open seams…",
    photos: ["product", "defect", "label"],
  },
  DAMAGED: {
    type: "ISSUE",
    es: "Llegó dañado en el transporte",
    en: "Arrived damaged in transit",
    hintEs: "Incluye una foto del paquete tal como llegó.",
    hintEn: "Include a photo of the parcel as it arrived.",
    photos: ["product", "defect", "package"],
  },
  WRONG_ITEM: {
    type: "ISSUE",
    es: "Producto, talla o color distinto al pedido",
    en: "Different product, size or colour than ordered",
    hintEs: "Fotografía la etiqueta de talla y el artículo completo.",
    hintEn: "Photograph the size label and the whole item.",
    photos: ["product", "label"],
  },
  MISSING_ITEM: {
    type: "ISSUE",
    es: "Falta un artículo en el paquete",
    en: "An item is missing from the parcel",
    hintEs: "Fotografía el contenido del paquete y la etiqueta de envío.",
    hintEn: "Photograph the parcel contents and the shipping label.",
    photos: ["package", "label"],
  },
  SIZE: {
    type: "WITHDRAWAL",
    es: "La talla no me queda bien",
    en: "The size doesn't fit",
    hintEs: "Puedes pedir el cambio de talla o un vale con +10 %.",
    hintEn: "You can ask for a size exchange or a voucher worth +10%.",
    photos: [],
  },
  NOT_AS_EXPECTED: {
    type: "WITHDRAWAL",
    es: "No es como esperaba",
    en: "Not what I expected",
    hintEs: "Cuéntanos qué no te ha convencido: nos ayuda a mejorar.",
    hintEn: "Tell us what didn't convince you — it helps us improve.",
    photos: [],
  },
  CHANGED_MIND: {
    type: "WITHDRAWAL",
    es: "Ya no lo quiero (desistimiento)",
    en: "I no longer want it (withdrawal)",
    hintEs: "Derecho de desistimiento de 14 días naturales desde la entrega.",
    hintEn: "14-day right of withdrawal from delivery.",
    photos: [],
  },
};

export const PHOTO_KINDS: Record<PhotoKind, { es: string; en: string }> = {
  product: { es: "Artículo completo", en: "Whole item" },
  defect: { es: "Detalle del problema", en: "Close-up of the issue" },
  label: { es: "Etiqueta de talla / producto", en: "Size / product label" },
  package: { es: "Paquete y etiqueta de envío", en: "Parcel and shipping label" },
  other: { es: "Otra", en: "Other" },
};

export const RESOLUTIONS = {
  ISSUE: ["REPRINT", "REFUND"] as const,
  WITHDRAWAL: ["STORE_CREDIT", "EXCHANGE", "REFUND"] as const,
};
export type Resolution = "REFUND" | "REPRINT" | "EXCHANGE" | "STORE_CREDIT";

export const STATUS_LABELS: Record<string, { es: string; en: string; tone: "info" | "warn" | "ok" | "bad" }> = {
  SUBMITTED: { es: "Recibida — en revisión", en: "Received — under review", tone: "info" },
  NEED_INFO: { es: "Necesitamos más información", en: "We need more information", tone: "warn" },
  APPROVED: { es: "Aprobada", en: "Approved", tone: "ok" },
  AWAITING_RETURN: { es: "Pendiente de que envíes el artículo", en: "Waiting for you to send the item", tone: "warn" },
  RECEIVED: { es: "Artículo recibido — revisando", en: "Item received — inspecting", tone: "info" },
  RESOLVED: { es: "Resuelta", en: "Resolved", tone: "ok" },
  REJECTED: { es: "No aceptada", en: "Not accepted", tone: "bad" },
  CANCELLED: { es: "Cancelada", en: "Cancelled", tone: "bad" },
};

const DAY = 86_400_000;
export const addDays = (d: Date | string, n: number) => new Date(new Date(d).getTime() + n * DAY);

/** Same rule as the cart: any personalisation payload on the line = made to the customer's specifications. */
export function isPersonalized(p: unknown): boolean {
  return !!p && typeof p === "object" && Object.keys(p as object).length > 0;
}

export interface Eligibility {
  withdrawal: boolean;
  withdrawalReason?: "PERSONALIZED" | "EXPIRED" | "NOT_SHIPPED";
  issue: boolean;
  issueReason?: "NOT_SHIPPED" | "EXPIRED";
  withdrawalDeadline: string | null;
  providerDeadline: string | null;
}

/**
 * deliveredAt unknown but shipped → still inside the window (the 14 days run from physical receipt,
 * which hasn't been proven yet). Not shipped yet → nothing to return; the customer contacts us to cancel.
 */
export function eligibility(opts: { personalized: boolean; shippedAt: string | null; deliveredAt: string | null; now?: Date }): Eligibility {
  const now = opts.now ?? new Date();
  if (!opts.shippedAt && !opts.deliveredAt) return { withdrawal: false, withdrawalReason: "NOT_SHIPPED", issue: false, issueReason: "NOT_SHIPPED", withdrawalDeadline: null, providerDeadline: null };
  const base = opts.deliveredAt;
  const wd = base ? addDays(base, WITHDRAWAL_DAYS) : null;
  const pd = base ? addDays(base, PROVIDER_CLAIM_DAYS) : null;
  const guaranteeEnd = addDays(base ?? opts.shippedAt!, GUARANTEE_YEARS * 365);
  const withdrawalOpen = !wd || now <= endOfDay(wd);
  return {
    withdrawal: !opts.personalized && withdrawalOpen,
    withdrawalReason: opts.personalized ? "PERSONALIZED" : withdrawalOpen ? undefined : "EXPIRED",
    issue: now <= guaranteeEnd,
    issueReason: now <= guaranteeEnd ? undefined : "EXPIRED",
    withdrawalDeadline: wd?.toISOString() ?? null,
    providerDeadline: pd?.toISOString() ?? null,
  };
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

export function fmtDate(iso: string | null | undefined, locale = "es-ES") {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
}
