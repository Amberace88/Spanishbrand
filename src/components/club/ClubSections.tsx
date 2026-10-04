import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Cake, Coins, Ticket, Vote, Zap, UserPlus, ShoppingBag, Gift } from "lucide-react";
import { pick } from "@/lib/i18n/pick";
import { POINTS_PER_EURO, REDEEM_POINTS, REDEEM_VALUE, SIGNUP_POINTS, TIERS, type TierId } from "@/lib/club";

type L = string;

export function tierName(locale: L, id: TierId) {
  const t = TIERS.find((x) => x.id === id) ?? TIERS[0];
  return locale === "en" ? t.label.en : locale === "de" ? t.label.de : t.label.es;
}

export function dateLocale(locale: L) {
  return locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : "es-ES";
}

/** Earning rules, straight from src/lib/club.ts and the award_order_points() SQL. */
export function earnRules(locale: L) {
  const c = pick(locale, {
    es: {
      r1t: `+${SIGNUP_POINTS} puntos de bienvenida`, r1b: "Al hacerte socio, una sola vez.",
      r2t: `${POINTS_PER_EURO} punto por cada euro`, r2b: "En productos, descontando cupones y sin contar el envío. Se suman cuando se confirma el pago.",
      r3t: `${REDEEM_POINTS} puntos = ${REDEEM_VALUE} €`, r3b: "Canjéalos aquí por un código de descuento de un solo uso.",
    },
    en: {
      r1t: `+${SIGNUP_POINTS} welcome points`, r1b: "When you join, once.",
      r2t: `${POINTS_PER_EURO} point per euro`, r2b: "On products, after coupons and excluding shipping. Added once payment is confirmed.",
      r3t: `${REDEEM_POINTS} points = ${REDEEM_VALUE} €`, r3b: "Redeem them here for a single-use discount code.",
    },
    de: {
      r1t: `+${SIGNUP_POINTS} Willkommenspunkte`, r1b: "Einmalig beim Beitritt.",
      r2t: `${POINTS_PER_EURO} Punkt pro Euro`, r2b: "Auf Produkte, nach Gutscheinen und ohne Versand. Gutschrift nach Zahlungseingang.",
      r3t: `${REDEEM_POINTS} Punkte = ${REDEEM_VALUE} €`, r3b: "Hier gegen einen einmaligen Rabattcode einlösen.",
    },
  });
  return [
    { icon: UserPlus, t: c.r1t, b: c.r1b },
    { icon: ShoppingBag, t: c.r2t, b: c.r2b },
    { icon: Ticket, t: c.r3t, b: c.r3b },
  ];
}

/** Only perks the code supports are live; the rest are labelled honestly. */
export function perkList(locale: L) {
  const c = pick(locale, {
    es: { soon: "Próximamente", p1t: "Carnet digital", p1b: "Tu número de socio y tu nivel, siempre contigo.", p2t: "Puntos en cada compra", p2b: `${POINTS_PER_EURO} punto por euro, automático.`, p3t: "Descuentos canjeables", p3b: `Cada ${REDEEM_POINTS} puntos, ${REDEEM_VALUE} € de descuento.`, p4t: "Vota los próximos diseños", p4b: "Decide qué se lanza en la comunidad.", p5t: "Acceso anticipado a drops", p5b: "Ediciones de socio antes que nadie.", p6t: "Regalo de cumpleaños", p6b: "Un detalle del club en tu día." },
    en: { soon: "Coming soon", p1t: "Digital member card", p1b: "Your member number and tier, always with you.", p2t: "Points on every order", p2b: `${POINTS_PER_EURO} point per euro, automatically.`, p3t: "Redeemable discounts", p3b: `Every ${REDEEM_POINTS} points, ${REDEEM_VALUE} € off.`, p4t: "Vote on new designs", p4b: "Decide what launches in the community.", p5t: "Early access to drops", p5b: "Members' editions before anyone else.", p6t: "Birthday gift", p6b: "A little something from the club on your day." },
    de: { soon: "Demnächst", p1t: "Digitaler Ausweis", p1b: "Mitgliedsnummer und Stufe, immer dabei.", p2t: "Punkte bei jedem Kauf", p2b: `${POINTS_PER_EURO} Punkt pro Euro, automatisch.`, p3t: "Einlösbare Rabatte", p3b: `Alle ${REDEEM_POINTS} Punkte ${REDEEM_VALUE} € Rabatt.`, p4t: "Über neue Designs abstimmen", p4b: "Entscheide in der Community, was erscheint.", p5t: "Früher Zugang zu Drops", p5b: "Mitglieder-Editionen vor allen anderen.", p6t: "Geburtstagsgeschenk", p6b: "Eine Kleinigkeit vom Club an deinem Tag." },
  });
  return {
    soon: c.soon,
    items: [
      { icon: BadgeCheck, t: c.p1t, b: c.p1b, live: true as const },
      { icon: Coins, t: c.p2t, b: c.p2b, live: true as const },
      { icon: Gift, t: c.p3t, b: c.p3b, live: true as const },
      { icon: Vote, t: c.p4t, b: c.p4b, live: true as const, href: "/community" },
      { icon: Zap, t: c.p5t, b: c.p5b, live: false as const },
      { icon: Cake, t: c.p6t, b: c.p6b, live: false as const },
    ],
  };
}

export function PerksGrid({ locale, tone = "theme" }: { locale: L; tone?: "theme" | "dark" }) {
  const { soon, items } = perkList(locale);
  const dark = tone === "dark";
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ icon: Icon, t, b, live, ...rest }) => {
        const href = "href" in rest ? (rest.href as string) : undefined;
        const inner = (
          <>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${live ? "bg-[linear-gradient(135deg,#f7e08a,#c9962e_55%,#8f6a1f)] text-[#1a1206] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]" : dark ? "bg-white/5 text-white/45 ring-1 ring-white/10" : "bg-surface-2 text-muted ring-1 ring-line"}`}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className={`font-semibold ${live ? "" : dark ? "text-white/70" : "text-muted"}`}>{t}</span>
                {!live && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${dark ? "bg-white/10 text-white/70" : "bg-surface-2 text-muted ring-1 ring-line"}`}>{soon}</span>}
              </span>
              <span className={`mt-1 block text-sm leading-snug ${dark ? "text-white/60" : "text-muted"}`}>{b}</span>
            </span>
            {href && <ArrowUpRight className="h-4 w-4 shrink-0 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />}
          </>
        );
        const cls = `group flex items-start gap-4 rounded-2xl p-5 transition-colors ${dark ? "bg-white/[0.03] ring-1 ring-white/10" : "bg-surface ring-1 ring-line"} ${href ? (dark ? "hover:ring-[#e0b84a]/50" : "hover:ring-fg/30") : ""}`;
        return (
          <li key={t}>
            {href ? (
              <Link href={href} className={`${cls} rg-focus`}>
                {inner}
              </Link>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Three tiers as a medal rail: medallions I–III on a gold line, the line filled up to `current`.
 * Positions are ranks, not point distances, so the labels never collide on phones.
 */
export function TierLadder({ locale, current, tone = "theme" }: { locale: L; current?: TierId; tone?: "theme" | "dark" }) {
  const c = pick(locale, { es: { from: "desde", pts: "pts acumulados", start: "Al unirte", you: "Tu nivel" }, en: { from: "from", pts: "lifetime pts", start: "When you join", you: "Your tier" }, de: { from: "ab", pts: "gesammelte Pkt.", start: "Beim Beitritt", you: "Deine Stufe" } });
  const dark = tone === "dark";
  const at = current ? TIERS.findIndex((t) => t.id === current) : -1;
  const fill = at <= 0 ? 0 : (at / (TIERS.length - 1)) * 100;
  return (
    <div className={`relative rounded-[1.75rem] p-5 sm:p-8 ${dark ? "bg-white/[0.03] ring-1 ring-white/10" : "bg-surface ring-1 ring-line"}`}>
      <ol className="relative grid grid-cols-3">
        {/* rail between the first and last medallion centres */}
        <span className={`absolute left-[16.66%] right-[16.66%] top-7 h-[2px] sm:top-9 ${dark ? "bg-white/15" : "bg-line"}`} aria-hidden>
          <span className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,#c9962e,#f1d27a)]" style={{ width: `${fill}%` }} />
        </span>
        {TIERS.map((t, i) => {
          const on = current === t.id;
          const reached = at >= i;
          return (
            <li key={t.id} className="relative flex flex-col items-center text-center" aria-current={on ? "step" : undefined}>
              <span
                className={`relative grid h-14 w-14 place-items-center rounded-full font-[family-name:var(--font-logo)] text-xl font-bold sm:h-[72px] sm:w-[72px] sm:text-2xl ${
                  reached ? "bg-[linear-gradient(135deg,#f7e08a,#c9962e_55%,#8f6a1f)] text-[#1a1206] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]" : "bg-[#070606] ring-1 ring-[#c9a227]/60"
                } ${on ? "ring-4 ring-[#e0b84a]/30" : ""}`}
                aria-hidden
              >
                <span className={reached ? "" : "text-gold-metal"}>{["I", "II", "III"][i]}</span>
              </span>
              <p className="mt-4 text-sm font-semibold leading-tight sm:text-base">{tierName(locale, t.id)}</p>
              <p className={`mt-1 text-xs leading-snug sm:text-sm ${dark ? "text-white/60" : "text-muted"}`}>{t.min === 0 ? c.start : `${c.from} ${t.min.toLocaleString("es-ES")} ${c.pts}`}</p>
              {on && <span className="mt-2 rounded-full bg-[#a3162b] px-2.5 py-0.5 text-[11px] font-semibold text-white">{c.you}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
