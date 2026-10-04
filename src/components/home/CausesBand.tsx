import Link from "next/link";
import { CAUSES, type Cause } from "@/lib/causes";
import { pick } from "@/lib/i18n/pick";
import { Container } from "@/components/ui/Section";
import { Reveal, Stagger } from "@/components/ui/Reveal";
import { IconArrow } from "@/components/ui/Icons";
import { CoinMedal, MoneyCount } from "./CausesBandMotion";

const ICON: Record<Cause, string> = {
  VETERANOS: "M12 2 L14.6 8.6 L21.6 9 L16.2 13.4 L18 20.2 L12 16.4 L6 20.2 L7.8 13.4 L2.4 9 L9.4 8.6 Z",
  MAYORES: "M8 21v-6l-2-4 4-5 4 5-2 4v6M14 21v-4h4l1-5",
  INFANCIA: "M12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 22l2-8-3-3 4-2h6l4 2-3 3 2 8",
  ANIMALES: "M5 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 10c-4 0-7 5-7 8 0 2 2 3 4 2l3-1 3 1c2 1 4 0 4-2 0-3-3-8-7-8z",
};
const CHIP: Record<Cause, string> = { VETERANOS: "bg-[#15305c] text-white", MAYORES: "bg-[#e0a526] text-[#1c1712]", INFANCIA: "bg-[#c8102e] text-white", ANIMALES: "bg-[#4b5726] text-white" };

/**
 * Home: the donation pledge. Every item sold gives a fixed amount from our margin to one of four causes the
 * buyer picks at checkout. Gold medallion with coins dropping in (CausesBandMotion), the four causes, and the
 * month-to-date total once there is one.
 */
export function CausesBand({ perItem, month, locale }: { perItem: number; month: Record<string, number>; locale: string }) {
  const c = pick(locale, {
    es: { title: "Cada compra ayuda", body: "Por cada artículo vendido donamos de nuestro propio margen a organizaciones sin ánimo de lucro. Tú eliges la causa al pagar y a ti no te cuesta nada.", per: "por artículo, de nuestro margen", month: "Donado este mes", cta: "Ver causas y transparencia", VETERANOS: "Veteranos", MAYORES: "Mayores", INFANCIA: "Infancia", ANIMALES: "Animales", VETERANOS_b: "Veteranos y sus familias", MAYORES_b: "Mayores que viven solos", INFANCIA_b: "Infancia vulnerable", ANIMALES_b: "Protectoras y rescate" },
    en: { title: "Every purchase helps", body: "For every item sold we donate from our own margin to non-profit organisations. You choose the cause at checkout and it costs you nothing.", per: "per item, from our margin", month: "Donated this month", cta: "See causes and reports", VETERANOS: "Veterans", MAYORES: "Elderly", INFANCIA: "Children", ANIMALES: "Animals", VETERANOS_b: "Veterans and their families", MAYORES_b: "Elderly people living alone", INFANCIA_b: "Vulnerable children", ANIMALES_b: "Shelters and rescue" },
    de: { title: "Jeder Kauf hilft", body: "Für jeden verkauften Artikel spenden wir aus unserer eigenen Marge an gemeinnützige Organisationen. Du wählst den Zweck an der Kasse, dich kostet es nichts.", per: "pro Artikel, aus unserer Marge", month: "Diesen Monat gespendet", cta: "Zwecke und Berichte", VETERANOS: "Veteranen", MAYORES: "Senioren", INFANCIA: "Kinder", ANIMALES: "Tiere", VETERANOS_b: "Veteranen und Familien", MAYORES_b: "Alleinlebende Senioren", INFANCIA_b: "Kinder in Not", ANIMALES_b: "Tierheime und Rettung" },
  });
  const total = Object.values(month).reduce((s, n) => s + n, 0);
  return (
    <section className="relative overflow-hidden bg-[#0b0b0b] py-20 text-[#f5f1e8] sm:py-28">
      <div className="flag-line absolute inset-x-0 top-0 h-1" aria-hidden />
      <div className="grain-soft pointer-events-none absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute -left-40 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(224,184,74,0.14),transparent_65%)]" aria-hidden />
      <Container className="relative grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <Reveal className="order-2 lg:order-1">
          <CoinMedal amount={perItem} />
          <p className="mt-2 text-center text-sm text-white/60">{c.per}</p>
        </Reveal>
        <div className="order-1 lg:order-2">
          <Reveal>
            <h2 className="headline text-balance text-[2.6rem] leading-[0.95] sm:text-6xl lg:text-[4.4rem]">{c.title}</h2>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/70">{c.body}</p>
          </Reveal>
          <Stagger className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-3">
            {CAUSES.map((k, i) => (
              <Stagger.Item key={k} index={i}>
                <div className="flex h-full items-center gap-3 rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/10 sm:p-4">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${CHIP[k]}`}>
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
                      <path d={ICON[k]} />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold">{c[k]}</span>
                    <span className="block text-[12px] leading-snug text-white/55">{c[`${k}_b` as "VETERANOS_b"]}</span>
                  </span>
                </div>
              </Stagger.Item>
            ))}
          </Stagger>
          <Reveal className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            {total > 0 && (
              <p>
                <span className="block text-[12px] uppercase tracking-[0.14em] text-white/50">{c.month}</span>
                <MoneyCount to={total} className="headline text-3xl text-[#e0b84a]" />
              </p>
            )}
            <Link href="/causas" className="btn btn-light press">
              {c.cta} <IconArrow className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
