import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n/pick";
import { B2BForm } from "@/components/forms/GrowthForms";
import { Container, PageHero } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import Image from "next/image";
import { campaignPhoto } from "@/lib/campaign";
import { Mockup } from "@/components/art/Mockup";
import { getShowcase } from "@/lib/products/queries";

export const metadata: Metadata = { title: "Empresas, peñas y eventos", description: "Camisetas y merchandising personalizado para bares, peñas, fiestas, clubes deportivos, empresas y eventos. Pide presupuesto.", alternates: { canonical: "/empresas" } };

export default async function BusinessPage() {
  const locale = await getLocale();
  const c = pick(locale, {
    es: { kicker: "Empresas y eventos", title: "Para tu peña, tu bar o tu empresa", sub: "Camisetas de peña, uniformes, delantales, regalos de empresa y merchandising para eventos. Con tu logo o con diseños de la casa, desde pocas unidades.", u1: "Bares y restaurantes", u1b: "Delantales, camisetas de equipo y tazas con tu marca.", u2: "Peñas y fiestas", u2b: "Camisetas de peña para Fallas, Hogueras, ferias y fiestas patronales.", u3: "Clubes deportivos", u3b: "Equipación de afición, sudaderas y gorras para tu club o escuela.", u4: "Empresas y eventos", u4b: "Regalos de empresa, bodas, despedidas, congresos y ferias.", how: "Cómo trabajamos", h1: "Nos cuentas qué necesitas", h2: "Te enviamos propuesta y presupuesto en 48 h", h3: "Apruebas el diseño y producimos", h4: "Recibes el pedido en España y la UE", formTitle: "Pide presupuesto", company: "Empresa / peña / club", contact: "Persona de contacto", phone: "Teléfono", type: "Tipo", type_BAR_RESTAURANT: "Bar / restaurante", type_FIESTA_PENA: "Peña / fiestas", type_SPORTS_CLUB: "Club deportivo", type_COMPANY: "Empresa", type_EVENT: "Evento / boda", type_SCHOOL: "Colegio / asociación", type_OTHER: "Otro", quantity: "Cantidad aproximada", products: "Productos", productsPh: "Camisetas, sudaderas, delantales…", deadline: "Fecha límite", message: "Cuéntanos tu idea", privacy: "Acepto la política de privacidad para que me contactéis sobre esta solicitud.", submit: "Enviar solicitud", error: "Revisa los campos obligatorios.", doneTitle: "¡Solicitud enviada!", doneBody: "Te responderemos en un máximo de 48 horas laborables." },
    en: { kicker: "Business & events", title: "For your club, bar or company", sub: "Club tees, uniforms, aprons, corporate gifts and event merch. With your logo or our designs, from small quantities.", u1: "Bars & restaurants", u1b: "Aprons, team tees and mugs with your brand.", u2: "Fiestas & 'peñas'", u2b: "Group tees for Fallas, Hogueras, ferias and local fiestas.", u3: "Sports clubs", u3b: "Fan kits, hoodies and caps for your club or school.", u4: "Companies & events", u4b: "Corporate gifts, weddings, conferences and fairs.", how: "How we work", h1: "Tell us what you need", h2: "Proposal and quote within 48 h", h3: "Approve the design and we produce", h4: "Delivered across Spain and the EU", formTitle: "Request a quote", company: "Company / club", contact: "Contact person", phone: "Phone", type: "Type", type_BAR_RESTAURANT: "Bar / restaurant", type_FIESTA_PENA: "Fiesta group", type_SPORTS_CLUB: "Sports club", type_COMPANY: "Company", type_EVENT: "Event / wedding", type_SCHOOL: "School / association", type_OTHER: "Other", quantity: "Approx. quantity", products: "Products", productsPh: "T-shirts, hoodies, aprons…", deadline: "Deadline", message: "Tell us your idea", privacy: "I accept the privacy policy so you can contact me about this request.", submit: "Send request", error: "Please check the required fields.", doneTitle: "Request sent!", doneBody: "We'll reply within 48 business hours." },
    de: { kicker: "Firmen & Events", title: "Für Verein, Bar oder Firma", sub: "Vereinsshirts, Uniformen, Schürzen, Firmengeschenke und Event-Merch. Mit deinem Logo oder unseren Designs, schon ab kleinen Mengen.", u1: "Bars & Restaurants", u1b: "Schürzen, Team-Shirts und Tassen mit deiner Marke.", u2: "Fiestas & Peñas", u2b: "Gruppenshirts für Fallas, Hogueras, Ferias und Dorffeste.", u3: "Sportvereine", u3b: "Fan-Ausrüstung, Hoodies und Caps für Verein oder Schule.", u4: "Firmen & Events", u4b: "Firmengeschenke, Hochzeiten, Kongresse und Messen.", how: "So arbeiten wir", h1: "Du sagst uns, was du brauchst", h2: "Angebot innerhalb von 48 h", h3: "Design freigeben – wir produzieren", h4: "Lieferung in Spanien und der EU", formTitle: "Angebot anfragen", company: "Firma / Verein", contact: "Ansprechpartner", phone: "Telefon", type: "Art", type_BAR_RESTAURANT: "Bar / Restaurant", type_FIESTA_PENA: "Fiesta-Gruppe", type_SPORTS_CLUB: "Sportverein", type_COMPANY: "Firma", type_EVENT: "Event / Hochzeit", type_SCHOOL: "Schule / Verein", type_OTHER: "Sonstiges", quantity: "Ungefähre Menge", products: "Produkte", productsPh: "T-Shirts, Hoodies, Schürzen…", deadline: "Termin", message: "Erzähl uns deine Idee", privacy: "Ich akzeptiere die Datenschutzerklärung, damit ihr mich zu dieser Anfrage kontaktiert.", submit: "Anfrage senden", error: "Bitte Pflichtfelder prüfen.", doneTitle: "Anfrage gesendet!", doneBody: "Wir antworten innerhalb von 48 Werktagsstunden." },
  });
  const show = await getShowcase();
  // lifestyle photos of each use (bar, fiesta, grada, oficio), product photos as fallback
  const uses = [[c.u1, c.u1b, "tote", campaignPhoto("tapas") ?? show.byType.APRON ?? show.byType.TOTE], [c.u2, c.u2b, "tee", campaignPhoto("fiestas") ?? show.byType.TSHIRT], [c.u3, c.u3b, "hoodie", campaignPhoto("futbol") ?? show.byType.HOODIE ?? show.byType.CAP], [c.u4, c.u4b, "mug", campaignPhoto("profesiones") ?? show.byType.MUG]] as const;
  return (
    <>
      <PageHero eyebrow={c.kicker} title={c.title} sub={c.sub} />
      <section className="bg-bg py-12 sm:py-16">
        <Container>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {uses.map(([t, b, k, photo], i) => (
              <Reveal key={t} delay={i * 0.05}>
                <div className="h-full overflow-hidden rounded-3xl bg-surface-2 p-6">
                  {photo ? (
                    <div className="relative -mx-6 -mt-6 aspect-[4/3] overflow-hidden bg-[#0b0b0b]">
                      <Image src={photo} alt={t} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />
                    </div>
                  ) : (
                    <div className="mx-auto w-2/3"><Mockup kind={k} color="#111111" print="logo" /></div>
                  )}
                  <p className="headline mt-4 text-xl">{t}</p>
                  <p className="mt-1 text-[15px] text-muted">{b}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="kicker text-accent">{c.how}</p>
              <ol className="mt-5 space-y-4">
                {[c.h1, c.h2, c.h3, c.h4].map((h, i) => (
                  <li key={h} className="flex items-center gap-4">
                    <span className="mega grid h-12 w-12 shrink-0 place-items-center rounded-full bg-fg text-xl text-bg">{i + 1}</span>
                    <span className="text-lg font-medium">{h}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-[2rem] border border-line p-6 sm:p-10">
              <p className="headline mb-6 text-3xl">{c.formTitle}</p>
              <B2BForm c={c} />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
