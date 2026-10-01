import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n/pick";
import { CAUSES, getCausesData, type Cause } from "@/lib/causes";
import { formatMoney } from "@/lib/format";
import { Container, PageHero } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Causas solidarias", description: "Por cada artículo vendido donamos a organizaciones sin ánimo de lucro que ayudan a veteranos, mayores, infancia y animales. Transparencia total.", alternates: { canonical: "/causas" } };
export const revalidate = 600;

const ICON: Record<Cause, string> = { VETERANOS: "M12 2 L14.6 8.6 L21.6 9 L16.2 13.4 L18 20.2 L12 16.4 L6 20.2 L7.8 13.4 L2.4 9 L9.4 8.6 Z", MAYORES: "M8 21v-6l-2-4 4-5 4 5-2 4v6M14 21v-4h4l1-5", INFANCIA: "M12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 22l2-8-3-3 4-2h6l4 2-3 3 2 8", ANIMALES: "M5 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 10c-4 0-7 5-7 8 0 2 2 3 4 2l3-1 3 1c2 1 4 0 4-2 0-3-3-8-7-8z" };
const TONE: Record<Cause, string> = { VETERANOS: "bg-[#14213d] text-white", MAYORES: "bg-gold text-black", INFANCIA: "bg-accent text-white", ANIMALES: "bg-[#0f7a3d] text-white" };

export default async function CausesPage() {
  const [locale, data] = await Promise.all([getLocale(), getCausesData()]);
  const c = pick(locale, {
    es: { kicker: "Comercio solidario", title: "Causas", sub: `Por cada artículo vendido, ROJO Y GUALDA dona ${formatMoney(data.perItem)} de su propio margen a organizaciones sin ánimo de lucro. Tú eliges la causa al comprar y a ti no te cuesta nada.`, VETERANOS: "Veteranos", MAYORES: "Mayores", INFANCIA: "Infancia", ANIMALES: "Animales", VETERANOS_b: "Apoyo a veteranos y a sus familias.", MAYORES_b: "Compañía y ayuda a personas mayores que viven solas.", INFANCIA_b: "Infancia en situación de vulnerabilidad.", ANIMALES_b: "Protectoras y rescate de animales abandonados.", month: "Este mes", partner: "Organización colaboradora", soon: "Organización colaboradora — próximamente", direct: "Donar directamente", registry: "Registro", how: "Cómo funciona", h1: "Donamos una cantidad fija por cada artículo vendido, de nuestro margen.", h2: "Solo colaboramos con organizaciones registradas en España, con convenio firmado.", h3: "Cada mes publicamos el importe donado y el certificado emitido por la organización.", h4: "Si quieres donar más, el botón «Donar directamente» te lleva a la web de la organización: el dinero no pasa por nosotros y recibes tu certificado fiscal.", reports: "Transparencia: donaciones realizadas", noReports: "Publicaremos aquí el primer informe mensual con su certificado.", total: "Total donado", cert: "Certificado" },
    en: { kicker: "Solidarity shopping", title: "Causes", sub: `For every item sold, ROJO Y GUALDA donates ${formatMoney(data.perItem)} from its own margin to non-profits. You choose the cause at checkout — it costs you nothing.`, VETERANOS: "Veterans", MAYORES: "Elderly", INFANCIA: "Children", ANIMALES: "Animals", VETERANOS_b: "Support for veterans and their families.", MAYORES_b: "Company and help for elderly people living alone.", INFANCIA_b: "Children in vulnerable situations.", ANIMALES_b: "Animal shelters and rescue.", month: "This month", partner: "Partner organisation", soon: "Partner organisation — coming soon", direct: "Donate directly", registry: "Registry", how: "How it works", h1: "We donate a fixed amount per item sold, from our margin.", h2: "We only work with organisations registered in Spain, with a signed agreement.", h3: "Every month we publish the amount donated and the certificate issued by the organisation.", h4: "Want to give more? “Donate directly” takes you to the organisation's site: the money never goes through us and you get your tax certificate.", reports: "Transparency: donations made", noReports: "The first monthly report and certificate will be published here.", total: "Total donated", cert: "Certificate" },
    de: { kicker: "Solidarisch einkaufen", title: "Spenden", sub: `Für jeden verkauften Artikel spendet ROJO Y GUALDA ${formatMoney(data.perItem)} aus der eigenen Marge an gemeinnützige Organisationen. Du wählst den Zweck – es kostet dich nichts.`, VETERANOS: "Veteranen", MAYORES: "Senioren", INFANCIA: "Kinder", ANIMALES: "Tiere", VETERANOS_b: "Unterstützung für Veteranen und ihre Familien.", MAYORES_b: "Gesellschaft und Hilfe für alleinlebende Senioren.", INFANCIA_b: "Kinder in schwierigen Situationen.", ANIMALES_b: "Tierheime und Tierrettung.", month: "Diesen Monat", partner: "Partnerorganisation", soon: "Partnerorganisation – bald", direct: "Direkt spenden", registry: "Register", how: "So funktioniert's", h1: "Wir spenden pro verkauftem Artikel einen festen Betrag aus unserer Marge.", h2: "Nur in Spanien registrierte Organisationen mit unterzeichneter Vereinbarung.", h3: "Jeden Monat veröffentlichen wir Betrag und Spendenbescheinigung.", h4: "Mehr geben? „Direkt spenden“ führt zur Website der Organisation – das Geld läuft nicht über uns.", reports: "Transparenz: geleistete Spenden", noReports: "Hier erscheint der erste Monatsbericht mit Bescheinigung.", total: "Gespendet gesamt", cert: "Bescheinigung" },
  });
  const monthName = new Date().toLocaleDateString(locale === "de" ? "de-DE" : locale === "en" ? "en-GB" : "es-ES", { month: "long", year: "numeric" });

  return (
    <>
      <PageHero eyebrow={c.kicker} title={c.title} sub={c.sub} />
      <section className="bg-bg py-12 sm:py-16">
        <Container>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CAUSES.map((k, i) => {
              const partner = data.partners.find((p) => p.cause === k);
              return (
                <Reveal key={k} delay={i * 0.05}>
                  <div className={`flex h-full flex-col rounded-[2rem] p-7 ${TONE[k]}`}>
                    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
                      <path d={ICON[k]} />
                    </svg>
                    <p className="mega mt-6 text-5xl">{c[k]}</p>
                    <p className="mt-2 opacity-85">{c[`${k}_b` as "VETERANOS_b"]}</p>
                    <div className="mt-auto pt-8">
                      <p className="text-xs uppercase tracking-wider opacity-70">{c.month} · {monthName}</p>
                      <p className="headline text-3xl">{formatMoney(data.month[k] ?? 0)}</p>
                      <div className="mt-4 border-t border-current/20 pt-4 text-sm">
                        {partner ? (
                          <>
                            <p className="font-semibold">{partner.name}</p>
                            {partner.registryNumber && <p className="text-xs opacity-70">{c.registry}: {partner.registryNumber}</p>}
                            {partner.donateUrl && (
                              <a href={partner.donateUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-black">
                                {c.direct} ↗
                              </a>
                            )}
                          </>
                        ) : (
                          <p className="opacity-75">{c.soon}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <div className="mt-16 grid gap-10 lg:grid-cols-2">
            <div>
              <p className="kicker text-accent">{c.how}</p>
              <ol className="mt-5 space-y-4">
                {[c.h1, c.h2, c.h3, c.h4].map((h, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="mega grid h-10 w-10 shrink-0 place-items-center rounded-full bg-fg text-lg text-bg">{i + 1}</span>
                    <span className="pt-1.5 text-[15px] leading-relaxed">{h}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-[2rem] border border-line p-6 sm:p-8">
              <div className="flex items-end justify-between gap-4">
                <p className="headline text-2xl">{c.reports}</p>
                <p className="text-right"><span className="block text-xs text-muted">{c.total}</span><span className="headline text-2xl text-accent">{formatMoney(data.totalPublished)}</span></p>
              </div>
              {data.reports.length ? (
                <ul className="mt-5 divide-y divide-line">
                  {data.reports.map((r) => (
                    <li key={`${r.period}-${r.cause}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span><strong>{new Date(r.period).toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "UTC" })}</strong> · {c[r.cause]}{r.partner ? ` · ${r.partner}` : ""}</span>
                      <span className="flex items-center gap-3">
                        <span className="font-semibold tabular-nums">{formatMoney(r.amount)}</span>
                        {r.certificateUrl && <a href={r.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline">{c.cert}</a>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 text-muted">{c.noReports}</p>
              )}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
