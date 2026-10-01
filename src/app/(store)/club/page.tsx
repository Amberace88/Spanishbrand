import type { Metadata } from "next";
import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { getLocale } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n/pick";
import { getCurrentCustomer } from "@/lib/account";
import { joinClubAction } from "@/app/actions/growth";
import { POINTS_PER_EURO, REDEEM_POINTS, REDEEM_VALUE, SIGNUP_POINTS } from "@/lib/club";
import { MemberCard } from "@/components/home/ShopSections";
import { Container } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { IconArrow } from "@/components/ui/Icons";

export const metadata: Metadata = { title: "Club de socios", description: "Hazte socio gratis: carnet digital, puntos en cada compra, acceso anticipado a drops y votaciones.", alternates: { canonical: "/club" } };
export const dynamic = "force-dynamic";

export default async function ClubPage() {
  const [brand, locale, { user, customer }] = await Promise.all([getBrand(), getLocale(), getCurrentCustomer()]);
  const c = pick(locale, {
    es: { kicker: "Club de socios", title: "Somos un club", sub: "Gratis. Sin letra pequeña. Para gente orgullosa de España, viva donde viva.", join: "Hacerme socio gratis", signin: "Entrar y hacerme socio", member: "Ya eres socio", see: "Ver mi carnet", how: "Cómo funciona", s1t: "Regístrate", s1b: "Con tu email, sin contraseñas.", s2t: `+${SIGNUP_POINTS} puntos`, s2b: "Al hacerte socio recibes tu carnet digital y puntos de bienvenida.", s3t: `${POINTS_PER_EURO} punto por euro`, s3b: "Cada compra suma puntos automáticamente.", s4t: `${REDEEM_POINTS} puntos = ${REDEEM_VALUE} €`, s4b: "Canjéalos en tu cuenta por un código de descuento.", perks: "Ventajas", p1: "Acceso anticipado a drops y ediciones de socio", p2: "Votas los próximos diseños de la marca", p3: "Ofertas de cumpleaños", p4: "Eventos y quedadas de socios" },
    en: { kicker: "Members club", title: "We are a club", sub: "Free. No small print. For people proud of Spain, wherever they live.", join: "Join for free", signin: "Sign in and join", member: "You're a member", see: "See my card", how: "How it works", s1t: "Sign up", s1b: "With your email, no passwords.", s2t: `+${SIGNUP_POINTS} points`, s2b: "Get your digital member card and welcome points.", s3t: `${POINTS_PER_EURO} point per euro`, s3b: "Every purchase adds points automatically.", s4t: `${REDEEM_POINTS} points = ${REDEEM_VALUE} €`, s4b: "Redeem them in your account for a discount code.", perks: "Perks", p1: "Early access to drops and members' editions", p2: "Vote on the next designs", p3: "Birthday offers", p4: "Members' events and meetups" },
    de: { kicker: "Mitgliederclub", title: "Wir sind ein Club", sub: "Kostenlos. Ohne Kleingedrucktes. Für alle, die stolz auf Spanien sind – egal, wo sie leben.", join: "Kostenlos Mitglied werden", signin: "Anmelden und Mitglied werden", member: "Du bist Mitglied", see: "Meinen Ausweis ansehen", how: "So funktioniert's", s1t: "Registrieren", s1b: "Mit deiner E-Mail, ohne Passwort.", s2t: `+${SIGNUP_POINTS} Punkte`, s2b: "Digitaler Mitgliedsausweis und Willkommenspunkte.", s3t: `${POINTS_PER_EURO} Punkt pro Euro`, s3b: "Jeder Einkauf sammelt automatisch Punkte.", s4t: `${REDEEM_POINTS} Punkte = ${REDEEM_VALUE} €`, s4b: "In deinem Konto gegen einen Rabattcode einlösen.", perks: "Vorteile", p1: "Früher Zugang zu Drops und Mitglieder-Editionen", p2: "Stimme über neue Designs ab", p3: "Geburtstagsangebote", p4: "Mitglieder-Events und Treffen" },
  });
  const isMember = Boolean(customer?.member_number);
  const number = isMember ? String(customer!.member_number).padStart(6, "0") : "000000";

  return (
    <>
      <section className="relative overflow-hidden bg-[#0b0b0b] text-[#f5f1e8]">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#c8102e]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-0 h-[420px] w-[420px] rounded-full bg-[#c99a1e]/20 blur-3xl" />
        <Container className="relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2">
          <Reveal>
            <p className="kicker text-[#e0b84a]">{c.kicker}</p>
            <h1 className="mega mt-4 text-[17vw] sm:text-8xl lg:text-[8rem]">{c.title}</h1>
            <p className="mt-5 max-w-md text-lg text-[#f5f1e8]/75">{c.sub}</p>
            <div className="mt-8">
              {isMember ? (
                <Link href="/account" className="btn bg-[#e0b84a] px-8 py-4 text-[15px] text-black">{c.see} <IconArrow className="h-4 w-4" /></Link>
              ) : user ? (
                <form action={joinClubAction}><button className="btn bg-[#c8102e] px-8 py-4 text-[15px] text-white">{c.join} <IconArrow className="h-4 w-4" /></button></form>
              ) : (
                <Link href="/account?next=/club" className="btn bg-[#c8102e] px-8 py-4 text-[15px] text-white">{c.signin} <IconArrow className="h-4 w-4" /></Link>
              )}
              {isMember && <p className="mt-3 text-sm text-[#e0b84a]">{c.member} · {customer!.points} pts</p>}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <MemberCard brandName={brand.name} number={number} name={(customer?.name as string) || (isMember ? (user?.email ?? "") : "TU NOMBRE")} since="2026" points={isMember ? Number(customer!.points) : undefined} />
          </Reveal>
        </Container>
      </section>

      <section className="bg-bg py-16 sm:py-24">
        <Container>
          <p className="kicker text-accent">{c.how}</p>
          <div className="mt-6 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {[[c.s1t, c.s1b], [c.s2t, c.s2b], [c.s3t, c.s3b], [c.s4t, c.s4b]].map(([t, b], i) => (
              <Reveal key={t} delay={i * 0.05} className="bg-bg p-7">
                <p className="mega text-6xl text-gold">{String(i + 1).padStart(2, "0")}</p>
                <p className="headline mt-5 text-2xl">{t}</p>
                <p className="mt-2 text-muted">{b}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-14 grid gap-3 sm:grid-cols-2">
            {[c.p1, c.p2, c.p3, c.p4].map((p) => (
              <div key={p} className="flex items-center gap-4 rounded-2xl bg-surface-2 p-5 text-[15px] font-medium">
                <span className="h-2.5 w-2.5 shrink-0 rotate-45 bg-accent" /> {p}
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
