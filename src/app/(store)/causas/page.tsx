import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n/pick";
import { CAUSES, getCausesData, type Cause } from "@/lib/causes";
import { formatMoney } from "@/lib/format";
import Image from "next/image";
import { Container } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Causas solidarias", description: "Por cada artículo vendido donamos a organizaciones sin ánimo de lucro que ayudan a veteranos, mayores, infancia y animales. Transparencia total.", alternates: { canonical: "/causas" } };
export const revalidate = 600;

const ICON: Record<Cause, string> = { VETERANOS: "M12 2 L14.6 8.6 L21.6 9 L16.2 13.4 L18 20.2 L12 16.4 L6 20.2 L7.8 13.4 L2.4 9 L9.4 8.6 Z", MAYORES: "M8 21v-6l-2-4 4-5 4 5-2 4v6M14 21v-4h4l1-5", INFANCIA: "M12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 22l2-8-3-3 4-2h6l4 2-3 3 2 8", ANIMALES: "M5 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 10c-4 0-7 5-7 8 0 2 2 3 4 2l3-1 3 1c2 1 4 0 4-2 0-3-3-8-7-8z" };
/** Brand tones per cause (sea navy, gold, rojo, olive). */
const TONE: Record<Cause, { bar: string; chip: string }> = {
  VETERANOS: { bar: "bg-[#15305c]", chip: "bg-[#15305c] text-white" },
  MAYORES: { bar: "bg-[#e0a526]", chip: "bg-[#e0a526] text-[#1c1712]" },
  INFANCIA: { bar: "bg-[#c8102e]", chip: "bg-[#c8102e] text-white" },
  ANIMALES: { bar: "bg-[#4b5726]", chip: "bg-[#4b5726] text-white" },
};

export default async function CausesPage() {
  const [locale, data] = await Promise.all([getLocale(), getCausesData()]);
  const c = pick(locale, {
    es: { kicker: "Comercio solidario", title: "Causas", sub: `Por cada artículo vendido, ROJO Y GUALDA dona ${formatMoney(data.perItem)} de su propio margen a organizaciones sin ánimo de lucro. Tú eliges la causa al comprar y a ti no te cuesta nada.`, VETERANOS: "Veteranos", MAYORES: "Mayores", INFANCIA: "Infancia", ANIMALES: "Animales", VETERANOS_b: "Apoyo a veteranos y a sus familias.", MAYORES_b: "Compañía y ayuda a personas mayores que viven solas.", INFANCIA_b: "Infancia en situación de vulnerabilidad.", ANIMALES_b: "Protectoras y rescate de animales abandonados.", pledge: "por cada artículo vendido", pledgeNote: "De nuestro margen. Tú eliges la causa al comprar.", month: "Este mes", partner: "Organización colaboradora", soon: "Organización colaboradora — próximamente", direct: "Donar directamente", registry: "Registro", how: "Cómo funciona", h1: "Donamos una cantidad fija por cada artículo vendido, de nuestro margen.", h2: "Solo colaboramos con organizaciones registradas en España, con convenio firmado.", h3: "Cada mes publicamos el importe donado y el certificado emitido por la organización.", h4: "Si quieres donar más, el botón «Donar directamente» te lleva a la web de la organización: el dinero no pasa por nosotros y recibes tu certificado fiscal.", reports: "Transparencia: donaciones realizadas", noReports: "Publicaremos aquí el primer informe mensual con su certificado.", total: "Total donado", cert: "Certificado" },
    en: { kicker: "Solidarity shopping", title: "Causes", sub: `For every item sold, ROJO Y GUALDA donates ${formatMoney(data.perItem)} from its own margin to non-profits. You choose the cause at checkout — it costs you nothing.`, VETERANOS: "Veterans", MAYORES: "Elderly", INFANCIA: "Children", ANIMALES: "Animals", VETERANOS_b: "Support for veterans and their families.", MAYORES_b: "Company and help for elderly people living alone.", INFANCIA_b: "Children in vulnerable situations.", ANIMALES_b: "Animal shelters and rescue.", pledge: "for every item sold", pledgeNote: "From our margin. You choose the cause at checkout.", month: "This month", partner: "Partner organisation", soon: "Partner organisation — coming soon", direct: "Donate directly", registry: "Registry", how: "How it works", h1: "We donate a fixed amount per item sold, from our margin.", h2: "We only work with organisations registered in Spain, with a signed agreement.", h3: "Every month we publish the amount donated and the certificate issued by the organisation.", h4: "Want to give more? “Donate directly” takes you to the organisation's site: the money never goes through us and you get your tax certificate.", reports: "Transparency: donations made", noReports: "The first monthly report and certificate will be published here.", total: "Total donated", cert: "Certificate" },
    de: { kicker: "Solidarisch einkaufen", title: "Spenden", sub: `Für jeden verkauften Artikel spendet ROJO Y GUALDA ${formatMoney(data.perItem)} aus der eigenen Marge an gemeinnützige Organisationen. Du wählst den Zweck – es kostet dich nichts.`, VETERANOS: "Veteranen", MAYORES: "Senioren", INFANCIA: "Kinder", ANIMALES: "Tiere", VETERANOS_b: "Unterstützung für Veteranen und ihre Familien.", MAYORES_b: "Gesellschaft und Hilfe für alleinlebende Senioren.", INFANCIA_b: "Kinder in schwierigen Situationen.", ANIMALES_b: "Tierheime und Tierrettung.", pledge: "pro verkauftem Artikel", pledgeNote: "Aus unserer Marge. Du wählst den Zweck beim Kauf.", month: "Diesen Monat", partner: "Partnerorganisation", soon: "Partnerorganisation – bald", direct: "Direkt spenden", registry: "Register", how: "So funktioniert's", h1: "Wir spenden pro verkauftem Artikel einen festen Betrag aus unserer Marge.", h2: "Nur in Spanien registrierte Organisationen mit unterzeichneter Vereinbarung.", h3: "Jeden Monat veröffentlichen wir Betrag und Spendenbescheinigung.", h4: "Mehr geben? „Direkt spenden“ führt zur Website der Organisation – das Geld läuft nicht über uns.", reports: "Transparenz: geleistete Spenden", noReports: "Hier erscheint der erste Monatsbericht mit Bescheinigung.", total: "Gespendet gesamt", cert: "Bescheinigung" },
  });
  const monthName = new Date().toLocaleDateString(locale === "de" ? "de-DE" : locale === "en" ? "en-GB" : "es-ES", { month: "long", year: "numeric" });

  return (
    <>
      {/* hero: the pledge itself is the headline figure */}
      <section className="relative overflow-hidden border-b border-line bg-bg">
        <div className="azulejo-line pointer-events-none absolute inset-y-0 left-0 hidden w-[36%] opacity-40 [mask-image:linear-gradient(to_right,black,transparent)] md:block" aria-hidden />
        <Container className="relative grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-20">
          <Reveal>
            <p className="kicker flex items-center gap-2 text-gold">
              <span className="flag-line inline-block h-[3px] w-6 rounded-full" />
              {c.kicker}
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-logo)] text-[11vw] font-bold leading-[1] tracking-[0.01em] sm:text-7xl lg:text-[6rem]">{c.title}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{c.sub}</p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grain-soft relative overflow-hidden rounded-[2rem] bg-[#0b0b0b] p-7 text-[#f5f1e8] sm:p-10">
              <div className="flag-line absolute inset-x-0 top-0 h-1" aria-hidden />
              <div className="pointer-events-none absolute -bottom-10 -right-8 w-48 opacity-[0.12] sm:w-64" aria-hidden>
                <Image src="/brand/logo-lion.webp" alt="" width={256} height={256} className="h-auto w-full" />
              </div>
              <p className="relative font-[family-name:var(--font-logo)] text-[clamp(4rem,14vw,8rem)] font-bold leading-none tabular-nums">
                <span className="text-gold-metal">{formatMoney(data.perItem)}</span>
              </p>
              <p className="headline relative mt-3 text-2xl sm:text-3xl">{c.pledge}</p>
              <p className="relative mt-3 max-w-xs text-sm leading-relaxed text-white/65">{c.pledgeNote}</p>
            </div>
          </Reveal>
        </Container>
      </section>
      <section className="bg-bg py-12 sm:py-16">
        <Container>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CAUSES.map((k, i) => {
              const partner = data.partners.find((p) => p.cause === k);
              const tone = TONE[k];
              return (
                <Reveal key={k} delay={i * 0.05} className="h-full">
                  <article className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-surface p-6 ring-1 ring-line sm:p-7">
                    <span className={`absolute inset-x-0 top-0 h-1.5 ${tone.bar}`} aria-hidden />
                    <div className="flex items-start justify-between gap-4">
                      <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone.chip}`}>
                        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
                          <path d={ICON[k]} />
                        </svg>
                      </span>
                      <p className="text-right">
                        <span className="block text-[11px] text-muted">
                          {c.month} · {monthName}
                        </span>
                        <span className="headline text-2xl tabular-nums">{formatMoney(data.month[k] ?? 0)}</span>
                      </p>
                    </div>
                    <h2 className="mega mt-6 text-[2.6rem] leading-none">{c[k]}</h2>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted">{c[`${k}_b` as "VETERANOS_b"]}</p>
                    <div className="mt-auto pt-6">
                      <div className="border-t border-line pt-4 text-sm">
                        {partner ? (
                          <>
                            <p className="font-semibold">{partner.name}</p>
                            {partner.registryNumber && (
                              <p className="text-xs text-muted">
                                {c.registry}: {partner.registryNumber}
                              </p>
                            )}
                            {partner.donateUrl && (
                              <a href={partner.donateUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ink mt-3 px-4 py-2 text-xs">
                                {c.direct} ↗
                              </a>
                            )}
                          </>
                        ) : (
                          <p className="text-muted">{c.soon}</p>
                        )}
                      </div>
                    </div>
                  </article>
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
                    <span className="mega grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0b0b0b] text-lg text-[#e0b84a] ring-1 ring-[#c9a227]/40">{i + 1}</span>
                    <span className="pt-1.5 text-[15px] leading-relaxed">{h}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="h-fit rounded-[2rem] bg-surface p-6 ring-1 ring-line sm:p-8">
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
