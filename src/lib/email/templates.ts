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
  | "POST_PURCHASE"
  | "GIFT_CARD"
  | "GIFT_CARD_RECEIPT"
  | "B2B_REQUEST"
  | "CLUB_WELCOME"
  | "RETURN_RECEIVED"
  | "RETURN_UPDATED"
  | "RETURN_ADMIN";

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
  giftCode?: string;
  giftAmount?: string;
  giftMessage?: string | null;
  senderName?: string | null;
  memberNumber?: string;
  lines?: [string, string][];
  rma?: string;
  returnUrl?: string;
  returnStatus?: string;
  message?: string | null;
  returnAddress?: string | null;
  returnDeadline?: string | null;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(ctx: EmailContext, title: string, body: string, cta?: { label: string; url: string }) {
  const logo = `${ctx.siteUrl.replace(/\/$/, "")}/brand/logo-full.png`;
  return `<!doctype html><html lang="es"><body style="margin:0;background:#0b0b0b;font-family:Helvetica,Arial,sans-serif;color:#0d0d0d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0b;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#fbfaf7;border-radius:18px;overflow:hidden">
<tr><td align="center" style="background:#0b0b0b;padding:28px 32px"><img src="${esc(logo)}" alt="${esc(ctx.brandName)}" width="220" style="display:block;width:220px;max-width:70%;height:auto;border:0"></td></tr>
<tr><td style="height:6px;background:linear-gradient(90deg,#c8102e 0 33%,#ffc400 33% 66%,#c8102e 66%)"></td></tr>
<tr><td style="padding:36px 32px 8px"><h1 style="margin:0 0 16px;font-size:26px;line-height:1.15;font-weight:800;letter-spacing:-.01em">${esc(title)}</h1>${body}</td></tr>
${cta ? `<tr><td style="padding:8px 32px 32px"><a href="${esc(cta.url)}" style="display:inline-block;background:#c8102e;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:700;font-size:14px">${esc(cta.label)}</a></td></tr>` : ""}
<tr><td style="padding:24px 32px;border-top:1px solid #eadfcc;font-size:12px;color:#6b675f">${esc(ctx.brandName)} · <a href="${esc(ctx.siteUrl)}" style="color:#6b675f">${esc(ctx.siteUrl.replace(/^https?:\/\//, ""))}</a>${ctx.unsubscribeUrl ? ` · <a href="${esc(ctx.unsubscribeUrl)}" style="color:#6b675f">Darse de baja</a>` : ""}</td></tr>
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
    case "GIFT_CARD":
      return {
        subject: `${ctx.senderName ? `${ctx.senderName} te regala` : "Tienes un regalo"}: tarjeta ${ctx.giftAmount ?? ""}`,
        html: layout(
          ctx,
          "Tienes una tarjeta regalo",
          p(hi) +
            p(`${ctx.senderName ? `<strong>${esc(ctx.senderName)}</strong> te ha enviado` : "Has recibido"} una tarjeta regalo de <strong>${esc(ctx.giftAmount)}</strong> para ${esc(ctx.brandName)}.`) +
            (ctx.giftMessage ? `<blockquote style="margin:0 0 16px;padding:14px 18px;background:#f1ede4;border-left:4px solid #c99a1e;font-style:italic">${esc(ctx.giftMessage)}</blockquote>` : "") +
            `<p style="margin:0 0 8px;font-size:13px;color:#6b675f">Tu código</p><p style="margin:0 0 18px;font-size:26px;font-weight:800;letter-spacing:.12em;font-family:monospace">${esc(ctx.giftCode)}</p>` +
            p("Introdúcelo en el checkout. Se aplica en una sola compra."),
          { label: "Elegir mi regalo", url: ctx.siteUrl },
        ),
      };
    case "GIFT_CARD_RECEIPT":
      return { subject: "Tu tarjeta regalo ha sido enviada", html: layout(ctx, "Tarjeta regalo enviada", p(hi) + p(`Hemos enviado tu tarjeta regalo de <strong>${esc(ctx.giftAmount)}</strong>. Código (por si quieres entregarlo tú): <strong style="font-family:monospace">${esc(ctx.giftCode)}</strong>`)) };
    case "B2B_REQUEST":
      return {
        subject: "Nueva solicitud de empresa / evento",
        html: layout(ctx, "Nueva solicitud B2B", (ctx.lines ?? []).map(([k, v]) => p(`<strong>${esc(k)}:</strong> ${esc(v)}`)).join(""), { label: "Abrir en admin", url: `${ctx.siteUrl}/admin/b2b` }),
      };
    case "CLUB_WELCOME":
      return { subject: `Bienvenido al club · Socio nº ${ctx.memberNumber ?? ""}`, html: layout(ctx, `Socio nº ${ctx.memberNumber ?? ""}`, p(hi) + p("Ya eres socio del club. Tienes 50 puntos de bienvenida y sumarás 1 punto por cada euro de tus compras."), { label: "Ver mi carnet", url: `${ctx.siteUrl}/account` }) };
    case "RETURN_RECEIVED":
      return {
        subject: `Solicitud ${ctx.rma ?? ""} recibida · pedido ${order}`,
        html: layout(
          ctx,
          `Solicitud ${ctx.rma ?? ""} recibida`,
          p(hi) +
            p(`Hemos registrado tu solicitud sobre el pedido ${order}. Este correo es el acuse de recibo en soporte duradero.`) +
            (ctx.lines ?? []).map(([k, v]) => p(`<strong>${esc(k)}:</strong> ${esc(v)}`)).join("") +
            (ctx.returnAddress
              ? p(`<strong>Dirección de devolución:</strong><br>${esc(ctx.returnAddress).replace(/\n/g, "<br>")}`) + (ctx.returnDeadline ? p(`Envía los artículos como muy tarde el <strong>${esc(ctx.returnDeadline)}</strong>. Los gastos de envío de la devolución corren de tu cuenta; guarda el justificante.`) : "")
              : ""),
          ctx.returnUrl ? { label: "Ver estado", url: ctx.returnUrl } : undefined,
        ),
      };
    case "RETURN_UPDATED":
      return {
        subject: `Actualización de tu solicitud ${ctx.rma ?? ""}`,
        html: layout(
          ctx,
          ctx.returnStatus ?? "Actualización",
          p(hi) + (ctx.message ? p(esc(ctx.message).replace(/\n/g, "<br>")) : p(`Tu solicitud ${esc(ctx.rma)} ha cambiado de estado.`)) + (ctx.returnAddress ? p(`<strong>Dirección de devolución:</strong><br>${esc(ctx.returnAddress).replace(/\n/g, "<br>")}`) : ""),
          ctx.returnUrl ? { label: "Ver estado", url: ctx.returnUrl } : undefined,
        ),
      };
    case "RETURN_ADMIN":
      return {
        subject: `Nueva solicitud ${ctx.rma ?? ""} · pedido ${order}`,
        html: layout(ctx, `Nueva solicitud ${ctx.rma ?? ""}`, (ctx.lines ?? []).map(([k, v]) => p(`<strong>${esc(k)}:</strong> ${esc(v)}`)).join(""), ctx.returnUrl ? { label: "Abrir en admin", url: ctx.returnUrl } : undefined),
      };
    case "POST_PURCHASE":
      return { subject: "¿Qué tal tu pedido?", html: layout(ctx, "Cuéntanos", p(hi) + p("Nos encantaría saber qué te ha parecido. Tu opinión decide los próximos diseños."), { label: "Comunidad", url: `${ctx.siteUrl}/community` }) };
  }
}
