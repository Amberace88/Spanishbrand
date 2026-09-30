/**
 * Transactional & marketing email templates (Spanish-first). Pure functions → { subject, html }.
 */

export type EmailTemplate =
  | "ACCOUNT_CREATED"
  | "ORDER_CONFIRMATION"
  | "PAYMENT_CONFIRMED"
  | "ORDER_PROCESSING"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "ORDER_FAILED"
  | "ORDER_REFUNDED"
  | "ABANDONED_CART"
  | "NEW_DROP"
  | "LIMITED_COLLECTION"
  | "WELCOME"
  | "POST_PURCHASE";

/** Marketing templates require explicit consent (GDPR). */
export const MARKETING_TEMPLATES: EmailTemplate[] = ["ABANDONED_CART", "NEW_DROP", "LIMITED_COLLECTION", "POST_PURCHASE"];

export interface EmailContext {
  brandName: string;
  siteUrl: string;
  customerName?: string | null;
  orderNumber?: number | string;
  orderUrl?: string;
  items?: { name: string; variant?: string | null; quantity: number; total: string }[];
  total?: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrier?: string | null;
  cartUrl?: string;
  dropName?: string;
  dropUrl?: string;
  refundAmount?: string;
  unsubscribeUrl?: string;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(ctx: EmailContext, title: string, body: string, cta?: { label: string; url: string }) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F4EFE6;font-family:Helvetica,Arial,sans-serif;color:#0B0B0C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4EFE6;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#FBF8F3;border:1px solid #E6DED0">
<tr><td style="background:#0B0B0C;padding:28px 32px;color:#F4EFE6;font-weight:800;letter-spacing:.28em;font-size:14px">${esc(ctx.brandName)}</td></tr>
<tr><td style="height:4px;background:linear-gradient(90deg,#B3122E,#A8894F)"></td></tr>
<tr><td style="padding:36px 32px 8px"><h1 style="margin:0 0 16px;font-size:26px;line-height:1.15;font-weight:800;text-transform:uppercase;letter-spacing:-.01em">${esc(title)}</h1>${body}</td></tr>
${cta ? `<tr><td style="padding:8px 32px 32px"><a href="${esc(cta.url)}" style="display:inline-block;background:#B3122E;color:#fff;text-decoration:none;padding:14px 26px;font-weight:700;letter-spacing:.12em;font-size:12px;text-transform:uppercase">${esc(cta.label)}</a></td></tr>` : ""}
<tr><td style="padding:24px 32px;border-top:1px solid #E6DED0;font-size:12px;color:#6B645A">${esc(ctx.brandName)} · <a href="${esc(ctx.siteUrl)}" style="color:#6B645A">${esc(ctx.siteUrl.replace(/^https?:\/\//, ""))}</a>${ctx.unsubscribeUrl ? ` · <a href="${esc(ctx.unsubscribeUrl)}" style="color:#6B645A">Darse de baja</a>` : ""}</td></tr>
</table></td></tr></table></body></html>`;
}

function itemsTable(ctx: EmailContext) {
  if (!ctx.items?.length) return "";
  const rows = ctx.items
    .map((i) => `<tr><td style="padding:10px 0;border-bottom:1px solid #E6DED0">${esc(i.name)}${i.variant ? `<br><span style="color:#6B645A;font-size:13px">${esc(i.variant)}</span>` : ""} × ${i.quantity}</td><td align="right" style="padding:10px 0;border-bottom:1px solid #E6DED0">${esc(i.total)}</td></tr>`)
    .join("");
  return `<table width="100%" style="border-collapse:collapse;font-size:14px;margin:16px 0">${rows}${ctx.total ? `<tr><td style="padding:12px 0;font-weight:700">Total</td><td align="right" style="padding:12px 0;font-weight:700">${esc(ctx.total)}</td></tr>` : ""}</table>`;
}

const p = (s: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${s}</p>`;

export function renderEmail(t: EmailTemplate, ctx: EmailContext): { subject: string; html: string } {
  const hi = ctx.customerName ? `Hola ${esc(ctx.customerName.split(" ")[0])},` : "Hola,";
  const order = ctx.orderNumber ? `#${esc(ctx.orderNumber)}` : "";
  const orderCta = ctx.orderUrl ? { label: "Ver pedido", url: ctx.orderUrl } : undefined;

  switch (t) {
    case "ACCOUNT_CREATED":
      return { subject: `Bienvenido a ${ctx.brandName}`, html: layout(ctx, "Tu cuenta está lista", p(hi) + p("Ya puedes seguir tus pedidos y votar en la comunidad."), { label: "Mi cuenta", url: `${ctx.siteUrl}/account` }) };
    case "ORDER_CONFIRMATION":
    case "PAYMENT_CONFIRMED":
      return {
        subject: `Pedido ${order} confirmado`,
        html: layout(ctx, `Pedido ${order} confirmado`, p(hi) + p("Hemos recibido tu pago. Cada pieza se produce bajo pedido para ti; te avisaremos cuando salga hacia tu dirección.") + itemsTable(ctx), orderCta),
      };
    case "ORDER_PROCESSING":
      return { subject: `Tu pedido ${order} está en producción`, html: layout(ctx, "En producción", p(hi) + p(`Tu pedido ${order} ya se está produciendo.`), orderCta) };
    case "ORDER_SHIPPED":
      return {
        subject: `Tu pedido ${order} está en camino`,
        html: layout(
          ctx,
          "En camino",
          p(hi) + p(`Tu pedido ${order} ha salido.`) + (ctx.carrier ? p(`Transportista: <strong>${esc(ctx.carrier)}</strong>`) : "") + (ctx.trackingNumber ? p(`Número de seguimiento: <strong>${esc(ctx.trackingNumber)}</strong>`) : ""),
          ctx.trackingUrl ? { label: "Seguir envío", url: ctx.trackingUrl } : orderCta,
        ),
      };
    case "ORDER_DELIVERED":
      return { subject: `Pedido ${order} entregado`, html: layout(ctx, "Entregado", p(hi) + p("Tu pedido figura como entregado. Esperamos que lo disfrutes."), orderCta) };
    case "ORDER_FAILED":
      return {
        subject: `Actualización sobre tu pedido ${order}`,
        html: layout(ctx, "Estamos revisando tu pedido", p(hi) + p("Ha surgido una incidencia al preparar tu pedido. Nuestro equipo ya lo está revisando y te escribiremos en breve. No tienes que hacer nada."), orderCta),
      };
    case "ORDER_REFUNDED":
      return { subject: `Reembolso del pedido ${order}`, html: layout(ctx, "Reembolso procesado", p(hi) + p(`Hemos procesado un reembolso${ctx.refundAmount ? ` de <strong>${esc(ctx.refundAmount)}</strong>` : ""}. Puede tardar unos días en reflejarse.`), orderCta) };
    case "ABANDONED_CART":
      return { subject: "Tu selección te espera", html: layout(ctx, "¿Lo dejamos aquí?", p(hi) + p("Guardamos tu carrito. Cuando quieras, puedes terminar tu pedido."), ctx.cartUrl ? { label: "Volver al carrito", url: ctx.cartUrl } : undefined) };
    case "NEW_DROP":
      return { subject: `Nuevo drop: ${ctx.dropName ?? ""}`, html: layout(ctx, ctx.dropName ?? "Nuevo drop", p(hi) + p("Ya está disponible nuestro nuevo lanzamiento."), ctx.dropUrl ? { label: "Descubrir", url: ctx.dropUrl } : undefined) };
    case "LIMITED_COLLECTION":
      return { subject: `Edición limitada: ${ctx.dropName ?? ""}`, html: layout(ctx, ctx.dropName ?? "Edición limitada", p(hi) + p("Una colección por tiempo limitado."), ctx.dropUrl ? { label: "Ver colección", url: ctx.dropUrl } : undefined) };
    case "WELCOME":
      return { subject: `Bienvenido a ${ctx.brandName}`, html: layout(ctx, "Bienvenido", p("Gracias por unirte. Te escribiremos solo cuando haya algo que merezca la pena: nuevos drops, colecciones e historias."), { label: "Explorar", url: ctx.siteUrl }) };
    case "POST_PURCHASE":
      return { subject: "¿Qué tal tu pedido?", html: layout(ctx, "Cuéntanos", p(hi) + p("Nos encantaría saber qué te ha parecido. Tu opinión decide los próximos diseños."), { label: "Comunidad", url: `${ctx.siteUrl}/community` }) };
  }
}
