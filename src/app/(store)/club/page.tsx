import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { getLocale } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n/pick";
import { getCurrentCustomer } from "@/lib/account";
import { joinClubAction } from "@/app/actions/growth";
import { POINTS_PER_EURO, REDEEM_POINTS, REDEEM_VALUE, SIGNUP_POINTS, lifetimePoints, tierFor } from "@/lib/club";
import { dbOrNull } from "@/lib/supabase/admin";
import { Container } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { ClubHeroMedia } from "@/components/club/ClubHeroMedia";
import { MemberCard3D } from "@/components/club/MemberCard3D";
import { PerksGrid, TierLadder, tierName } from "@/components/club/ClubSections";

export const metadata: Metadata = { title: "Club de socios", description: "Hazte socio gratis: carnet digital, puntos en cada compra y descuentos canjeables.", alternates: { canonical: "/club" } };
export const dynamic = "force-dynamic";

export default async function ClubPage() {
  const [locale, { user, customer }] = await Promise.all([getLocale(), getCurrentCustomer()]);
  const c = pick(locale, {
    es: { kicker: "Club de socios", title: "Somos un club", sub: "Gratis. Sin letra pequeña. Para gente orgullosa de España, viva donde viva.", join: "Hacerme socio gratis", signin: "Entrar y hacerme socio", member: "Ya eres socio", see: "Ver mi club", trust: `Gratis · Sin cuotas · +${SIGNUP_POINTS} puntos de bienvenida`, how: "Cómo funciona", howT: "Tres pasos, cero complicaciones", s1t: "Hazte socio", s1b: `Regístrate con tu email y únete gratis. Recibes tu carnet digital y ${SIGNUP_POINTS} puntos de bienvenida.`, s2t: "Compra y suma", s2b: `${POINTS_PER_EURO} punto por cada euro en productos. Se suman solos al confirmarse el pago.`, s3t: "Canjea", s3b: `${REDEEM_POINTS} puntos = ${REDEEM_VALUE} € de descuento, en un código de un solo uso desde tu cuenta.`, perks: "Ventajas", perksT: "Lo que te da el club", tiers: "Niveles", tiersT: "Tu carnet sube de nivel contigo", tiersB: "El nivel crece con los puntos que acumulas y se muestra en tu carnet. Canjear puntos nunca te baja de nivel.", ctaT: "Tu número de socio te espera", ctaB: "Únete en segundos y empieza a sumar desde tu primera compra.", club: "Club de socios", since: "Desde", pts: "pts", name: "TU NOMBRE", aria: "Carnet de socio del club" },
    en: { kicker: "Members club", title: "We are a club", sub: "Free. No small print. For people proud of Spain, wherever they live.", join: "Join for free", signin: "Sign in and join", member: "You're a member", see: "Go to my club", trust: `Free · No fees · +${SIGNUP_POINTS} welcome points`, how: "How it works", howT: "Three steps, zero hassle", s1t: "Join", s1b: `Sign up with your email and join for free. Get your digital card and ${SIGNUP_POINTS} welcome points.`, s2t: "Shop and earn", s2b: `${POINTS_PER_EURO} point per euro on products. Added automatically once payment is confirmed.`, s3t: "Redeem", s3b: `${REDEEM_POINTS} points = ${REDEEM_VALUE} € off, as a single-use code from your account.`, perks: "Perks", perksT: "What the club gives you", tiers: "Tiers", tiersT: "Your card levels up with you", tiersB: "Your tier grows with the points you earn and shows on your card. Redeeming never lowers it.", ctaT: "Your member number is waiting", ctaB: "Join in seconds and start earning from your first order.", club: "Members club", since: "Since", name: "YOUR NAME", aria: "Club member card" },
    de: { kicker: "Mitgliederclub", title: "Wir sind ein Club", sub: "Kostenlos. Ohne Kleingedrucktes. Für alle, die stolz auf Spanien sind – egal, wo sie leben.", join: "Kostenlos Mitglied werden", signin: "Anmelden und Mitglied werden", member: "Du bist Mitglied", see: "Zu meinem Club", trust: `Kostenlos · Ohne Gebühren · +${SIGNUP_POINTS} Willkommenspunkte`, how: "So funktioniert's", howT: "Drei Schritte, null Aufwand", s1t: "Beitreten", s1b: `Mit deiner E-Mail registrieren und kostenlos beitreten. Digitaler Ausweis und ${SIGNUP_POINTS} Willkommenspunkte.`, s2t: "Einkaufen und sammeln", s2b: `${POINTS_PER_EURO} Punkt pro Euro auf Produkte. Automatische Gutschrift nach Zahlungseingang.`, s3t: "Einlösen", s3b: `${REDEEM_POINTS} Punkte = ${REDEEM_VALUE} € Rabatt als einmaliger Code in deinem Konto.`, perks: "Vorteile", perksT: "Was dir der Club bietet", tiers: "Stufen", tiersT: "Dein Ausweis wächst mit dir", tiersB: "Deine Stufe wächst mit gesammelten Punkten und steht auf deinem Ausweis. Einlösen senkt sie nie.", ctaT: "Deine Mitgliedsnummer wartet", ctaB: "In Sekunden beitreten und ab dem ersten Einkauf sammeln.", club: "Mitgliederclub", since: "Seit", pts: "Pkt.", name: "DEIN NAME", aria: "Club-Mitgliedsausweis" },
  });
  const isMember = Boolean(customer?.member_number);
  const number = isMember ? String(customer!.member_number).padStart(6, "0") : "000000";
  const points = Number(customer?.points ?? 0);
  const sb = dbOrNull();
  const { data: ledger } = isMember && sb ? await sb.from("points_ledger").select("points, reason").eq("customer_id", customer!.id).limit(1000) : { data: null };
  const tier = tierFor(lifetimePoints(ledger as { points: number; reason: string }[] | null, points)).id;
  const since = isMember && customer?.member_since ? new Date(customer.member_since as string).getFullYear().toString() : new Date().getFullYear().toString();

  const cta = (big = true) =>
    isMember ? (
      <Link href="/account" className={`rg-focus btn bg-[linear-gradient(135deg,#f7e08a,#d9a93a_45%,#a37a22)] text-[#1a1206] ${big ? "px-8 py-4 text-[15px]" : "px-7 py-3.5"}`}>
        {c.see} <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
    ) : user ? (
      <form action={joinClubAction}>
        <button className={`rg-focus btn bg-[#a3162b] text-white hover:-translate-y-px hover:shadow-[0_14px_34px_-12px_#a3162b] ${big ? "px-8 py-4 text-[15px]" : "px-7 py-3.5"}`}>
          {c.join} <ArrowUpRight className="h-4 w-4" aria-hidden />
        </button>
      </form>
    ) : (
      <Link href="/account?next=/club" className={`rg-focus btn bg-[#a3162b] text-white hover:-translate-y-px hover:shadow-[0_14px_34px_-12px_#a3162b] ${big ? "px-8 py-4 text-[15px]" : "px-7 py-3.5"}`}>
        {c.signin} <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
    );

  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-[#070606] text-[#f5f1e8]">
        <ClubHeroMedia />
        <Container className="relative grid items-center gap-12 py-16 sm:py-24 lg:min-h-[min(86vh,820px)] lg:grid-cols-[1.1fr_1fr] lg:py-28">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="flag-stripe h-3.5 w-5 rounded-[3px]" aria-hidden />
              <p className="kicker text-[#e0b84a]">{c.kicker}</p>
            </div>
            <h1 className="mt-5 font-[family-name:var(--font-logo)] text-[clamp(3rem,13vw,7.2rem)] font-bold leading-[0.98] tracking-[0.01em]">
              <span className="block text-red-metal">{c.title.split(" ").slice(0, -1).join(" ")}</span>
              <span className="block text-gold-metal">{c.title.split(" ").slice(-1)}</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/75">{c.sub}</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">{cta()}</div>
            <p className="mt-4 text-sm text-[#e0b84a]/90">{isMember ? `${c.member} · ${tierName(locale, tier)} · ${points.toLocaleString("es-ES")} ${c.pts}` : c.trust}</p>
          </Reveal>
          <Reveal delay={0.12}>
            <MemberCard3D
              number={number}
              name={(customer?.name as string) || (isMember ? (user?.email ?? "") : c.name)}
              since={since}
              points={isMember ? points : undefined}
              tier={tier}
              tierLabel={tierName(locale, tier)}
              labels={{ club: c.club, since: c.since, points: c.pts }}
              ariaLabel={c.aria}
            />
          </Reveal>
        </Container>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-bg py-16 sm:py-24">
        <Container>
          <p className="kicker text-accent">{c.how}</p>
          <h2 className="headline mt-3 max-w-2xl text-4xl sm:text-5xl">{c.howT}</h2>
          <div className="relative mt-8 sm:mt-10">
          <ol className="relative grid gap-3 md:grid-cols-3 md:gap-4">
            {[[c.s1t, c.s1b], [c.s2t, c.s2b], [c.s3t, c.s3b]].map(([t, b], i) => (
              <li key={t} className="relative">
                {/* phones: numeral beside the text (a third of the height); md+: stacked cards */}
                <Reveal delay={i * 0.08} className="flex h-full gap-5 rounded-[24px] bg-surface p-5 ring-1 ring-line sm:p-7 md:flex-col md:gap-0">
                  <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#070606] font-[family-name:var(--font-logo)] text-xl font-bold ring-1 ring-[#c9a227]/60 md:h-[60px] md:w-[60px] md:text-2xl">
                    <span className="text-gold-metal">{["I", "II", "III"][i]}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="headline block text-xl md:mt-6 md:text-2xl">{t}</span>
                    <span className="mt-1.5 block leading-relaxed text-muted md:mt-2">{b}</span>
                  </span>
                </Reveal>
              </li>
            ))}
          </ol>
          </div>
        </Container>
      </section>

      {/* PERKS */}
      <section className="bg-surface-2/50 py-16 sm:py-24">
        <Container>
          <p className="kicker text-accent">{c.perks}</p>
          <h2 className="headline mt-3 text-4xl sm:text-5xl">{c.perksT}</h2>
          <div className="mt-10">
            <PerksGrid locale={locale} />
          </div>
        </Container>
      </section>

      {/* TIERS */}
      <section className="bg-bg py-16 sm:py-24">
        <Container className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center lg:gap-10">
          <div>
            <p className="kicker text-accent">{c.tiers}</p>
            <h2 className="headline mt-3 text-4xl sm:text-5xl">{c.tiersT}</h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted">{c.tiersB}</p>
          </div>
          <TierLadder locale={locale} current={isMember ? tier : undefined} />
        </Container>
      </section>

      {/* CTA */}
      {!isMember && (
        <section className="bg-bg pb-20 sm:pb-28">
          <Container>
            <div className="relative isolate overflow-hidden rounded-[28px] bg-[#070606] px-6 py-14 text-center text-[#f5f1e8] sm:px-12 sm:py-20">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(163,22,43,0.45),transparent_70%),radial-gradient(50%_60%_at_50%_100%,rgba(201,162,39,0.2),transparent_70%)]" aria-hidden />
              <div className="relative mx-auto h-20 w-fit opacity-90">
                <Image src="/brand/logo-lion.webp" alt="" width={997} height={1174} className="h-full w-auto" />
              </div>
              <h2 className="relative mt-6 font-[family-name:var(--font-logo)] text-[clamp(2rem,6vw,3.6rem)] font-bold leading-tight text-gold-metal">{c.ctaT}</h2>
              <p className="relative mx-auto mt-3 max-w-md text-white/70">{c.ctaB}</p>
              <div className="relative mt-8 flex justify-center">{cta(false)}</div>
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
