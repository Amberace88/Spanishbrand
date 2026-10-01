import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getT } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n/pick";
import { getPublishedProducts } from "@/lib/products/queries";
import { GIFT_AMOUNTS } from "@/lib/payments/gift-cards";
import { GiftCardForm } from "@/components/forms/GrowthForms";
import { ProductCard } from "@/components/product/ProductCard";
import { Container, PageHero, SectionHead } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { BrandLogo } from "@/components/brand/Wordmark";

export const metadata: Metadata = { title: "Regalos con orgullo español", description: "Encuentra el regalo perfecto: camisetas, sudaderas, tazas y pósters, regalos personalizados y tarjetas regalo.", alternates: { canonical: "/regalos" } };
export const revalidate = 300;

const RECIPIENTS = ["el", "ella", "futbol", "casa", "ninos", "pueblo"] as const;
const BUDGETS = ["25", "50", "100"] as const;

export default async function GiftsPage({ searchParams }: { searchParams: Promise<{ r?: string; b?: string; gift?: string }> }) {
  const [{ r, b, gift }, locale, t, all] = await Promise.all([searchParams, getLocale(), getT(), getPublishedProducts({ limit: 300 })]);
  const c = pick(locale, {
    es: { kicker: "Regalos", title: "Regala orgullo", sub: "Para el futbolero, para la que vive fuera, para el abuelo del pueblo. Encuentra el regalo o regala una tarjeta.", finder: "Buscador de regalos", for: "¿Para quién?", budget: "Presupuesto", el: "Para él", ella: "Para ella", futbol: "Futbolero", casa: "Para casa", ninos: "Niños", pueblo: "Del pueblo", b25: "Hasta 25 €", b50: "Hasta 50 €", b100: "Hasta 100 €", any: "Todo", results: "Ideas de regalo", none: "Aún no hay productos para esta búsqueda. Prueba un regalo personalizado o una tarjeta regalo.", perso: "Regalo personalizado", persoB: "Con su nombre, su dorsal o su pueblo.", cardKicker: "Tarjeta regalo", cardTitle: "¿No sabes qué elegir?", cardBody: "Envía una tarjeta regalo por email al instante. Código de un solo uso, válido en toda la tienda.", amount: "Importe", recipientEmail: "Email del destinatario", recipientName: "Nombre del destinatario", senderName: "Tu nombre", purchaserEmail: "Tu email (recibo)", message: "Mensaje (opcional)", submit: "Comprar tarjeta", note: "Pago seguro con Stripe. Se envía al confirmar el pago.", error: "Revisa los datos e inténtalo de nuevo.", notReady: "Las tarjetas regalo estarán disponibles en cuanto activemos los pagos.", ok: "¡Gracias! La tarjeta regalo se ha enviado por email." },
    en: { kicker: "Gifts", title: "Gift some pride", sub: "For the football fan, for those living abroad, for grandpa in the village. Find the gift or send a gift card.", finder: "Gift finder", for: "Who is it for?", budget: "Budget", el: "For him", ella: "For her", futbol: "Football fan", casa: "For the home", ninos: "Kids", pueblo: "Hometown", b25: "Up to 25 €", b50: "Up to 50 €", b100: "Up to 100 €", any: "All", results: "Gift ideas", none: "No products for this search yet. Try a personalised gift or a gift card.", perso: "Personalised gift", persoB: "With their name, number or hometown.", cardKicker: "Gift card", cardTitle: "Not sure what to choose?", cardBody: "Send a gift card by email instantly. Single-use code, valid across the shop.", amount: "Amount", recipientEmail: "Recipient email", recipientName: "Recipient name", senderName: "Your name", purchaserEmail: "Your email (receipt)", message: "Message (optional)", submit: "Buy gift card", note: "Secure payment with Stripe. Sent once payment is confirmed.", error: "Please check the details and try again.", notReady: "Gift cards will be available as soon as payments are live.", ok: "Thank you! The gift card has been emailed." },
    de: { kicker: "Geschenke", title: "Verschenke Stolz", sub: "Für Fußballfans, für Auswanderer, für den Opa im Dorf. Finde das Geschenk oder verschenke eine Geschenkkarte.", finder: "Geschenkefinder", for: "Für wen?", budget: "Budget", el: "Für ihn", ella: "Für sie", futbol: "Fußballfan", casa: "Fürs Zuhause", ninos: "Kinder", pueblo: "Heimatort", b25: "Bis 25 €", b50: "Bis 50 €", b100: "Bis 100 €", any: "Alle", results: "Geschenkideen", none: "Noch keine Produkte für diese Suche. Probiere ein personalisiertes Geschenk oder eine Geschenkkarte.", perso: "Personalisiertes Geschenk", persoB: "Mit Name, Rückennummer oder Heimatort.", cardKicker: "Geschenkkarte", cardTitle: "Unsicher, was passt?", cardBody: "Sende sofort eine Geschenkkarte per E-Mail. Einmal-Code, im ganzen Shop gültig.", amount: "Betrag", recipientEmail: "E-Mail des Empfängers", recipientName: "Name des Empfängers", senderName: "Dein Name", purchaserEmail: "Deine E-Mail (Beleg)", message: "Nachricht (optional)", submit: "Geschenkkarte kaufen", note: "Sichere Zahlung mit Stripe. Versand nach Zahlungsbestätigung.", error: "Bitte prüfe die Angaben.", notReady: "Geschenkkarten sind verfügbar, sobald Zahlungen aktiv sind.", ok: "Danke! Die Geschenkkarte wurde per E-Mail versendet." },
  });
  const rec = (RECIPIENTS as readonly string[]).includes(r ?? "") ? r : undefined;
  const max = (BUDGETS as readonly string[]).includes(b ?? "") ? Number(b) : undefined;
  if (rec === "pueblo") {
    // handled by the personalization CTA below
  }
  const filtered = all.filter((p) => {
    if (max && p.price > max) return false;
    switch (rec) {
      case "el":
      case "ella":
        return p.categoryCode === "APPAREL" || p.categoryCode === "HEADWEAR";
      case "futbol":
        return p.collection?.slug === "futbol";
      case "casa":
        return ["HOME_LIVING", "DRINKWARE", "WALL_ART"].includes(p.categoryCode ?? "");
      case "ninos":
        return p.categoryCode === "KIDS";
      case "pueblo":
        return p.collection?.slug === "mi-pueblo" || p.personalization?.mode === "fields";
      default:
        return true;
    }
  });
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  const href = (nr?: string, nb?: string) => {
    const q = new URLSearchParams();
    if (nr) q.set("r", nr);
    if (nb) q.set("b", nb);
    const s = q.toString();
    return `/regalos${s ? `?${s}` : ""}#buscador`;
  };
  const chip = (active: boolean) => `rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${active ? "border-fg bg-fg text-bg" : "border-line hover:border-fg"}`;

  return (
    <>
      <PageHero eyebrow={c.kicker} title={c.title} sub={c.sub} />
      {gift === "ok" && <p className="bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white">{c.ok}</p>}
      <section id="buscador" className="scroll-mt-28 bg-bg py-12 sm:py-16">
        <Container>
          <p className="kicker text-accent">{c.finder}</p>
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-sm font-semibold text-muted">{c.for}</span>
              <Link href={href(undefined, b)} className={chip(!rec)}>{c.any}</Link>
              {RECIPIENTS.map((x) => (
                <Link key={x} href={href(x, b)} className={chip(rec === x)}>{c[x]}</Link>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-sm font-semibold text-muted">{c.budget}</span>
              <Link href={href(rec, undefined)} className={chip(!max)}>{c.any}</Link>
              {BUDGETS.map((x) => (
                <Link key={x} href={href(rec, x)} className={chip(max === Number(x))}>{c[`b${x}` as "b25"]}</Link>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <SectionHead eyebrow={c.kicker} title={c.results} />
            {filtered.length ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4">
                {filtered.slice(0, 24).map((p, i) => (
                  <Reveal key={p.id} delay={(i % 4) * 0.05}>
                    <ProductCard p={p} labels={labels} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <p className="rounded-3xl bg-surface-2 p-8 text-muted">{c.none}</p>
                <Link href="/personaliza" className="rounded-3xl bg-fg p-8 text-bg">
                  <span className="headline block text-2xl">{c.perso}</span>
                  <span className="mt-1 block text-bg/70">{c.persoB}</span>
                </Link>
              </div>
            )}
          </div>
        </Container>
      </section>

      <section id="tarjeta" className="bg-bg pb-16 sm:pb-24">
        <Container>
          <div className="grid overflow-hidden rounded-[2rem] border border-line lg:grid-cols-[1fr_1.2fr]">
            <div className="relative flex flex-col justify-between gap-8 bg-[#0b0b0b] p-8 text-[#f5f1e8] sm:p-12">
              <div>
                <p className="kicker text-[#e0b84a]">{c.cardKicker}</p>
                <h2 className="headline mt-3 text-4xl sm:text-5xl">{c.cardTitle}</h2>
                <p className="mt-4 max-w-sm text-[#f5f1e8]/70">{c.cardBody}</p>
              </div>
              <div className="relative aspect-[1.586] w-full max-w-sm rotate-[-4deg] overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#0b0b0b] p-6 shadow-2xl ring-1 ring-[#e0b84a]/40">
                <div className="flag-line absolute inset-x-0 top-0 h-1.5" />
                <span className="block h-12"><BrandLogo variant="full" alt="" /></span>
                <p className="absolute bottom-5 left-6 font-mono text-lg tracking-widest text-[#e0b84a]">RYG-XXXX-XXXX</p>
                <p className="absolute bottom-5 right-6 headline text-3xl text-[#f5f1e8]">€</p>
              </div>
            </div>
            <div className="p-8 sm:p-12">
              <GiftCardForm c={c} amounts={GIFT_AMOUNTS} />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
