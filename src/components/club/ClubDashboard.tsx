import Link from "next/link";
import { ArrowUpRight, Package, Palette, ShieldCheck, Sparkles, History } from "lucide-react";
import { formatDate } from "@/lib/format";
import { REDEEM_POINTS, REDEEM_VALUE, SIGNUP_POINTS, redeemProgress, tierProgress, type LedgerReason } from "@/lib/club";
import { ClubHeroMedia } from "./ClubHeroMedia";
import { MemberCard3D } from "./MemberCard3D";
import { CopyCode, RedeemButton } from "./ClubControls";
import { PerksGrid, TierLadder, dateLocale, earnRules, tierName } from "./ClubSections";

export type LedgerRow = { id: string; date: string; reason: LedgerReason | string; points: number; orderNumber?: string | number | null };
export type ClubDashboardProps = {
  locale: string;
  email: string;
  member: { number: string; name: string; firstName: string | null; since: string | null; points: number; lifetime: number } | null;
  flags: { welcome?: boolean; code?: string | null; insufficient?: boolean };
  ledger: LedgerRow[];
  orders: { count: number; last?: { number: string | number; status: string; date: string; href: string } | null };
  joinAction: () => Promise<void>;
  redeemAction: () => Promise<void>;
};

const RING = 2 * Math.PI * 70;

/** Like i18n `pick`, but copy values may be formatter functions. */
function sel<T extends object>(locale: string, copy: { es: T; en?: Partial<T>; de?: Partial<T> }): T {
  const extra = locale === "en" ? copy.en : locale === "de" ? copy.de : undefined;
  return extra ? { ...copy.es, ...extra } : copy.es;
}

export function ClubDashboard({ locale, email, member, flags, ledger, orders, joinAction, redeemAction }: ClubDashboardProps) {
  const dl = dateLocale(locale);
  const c = sel(locale, {
    es: {
      kicker: "Mi club", hello: "Hola", helloAnon: "Bienvenido", sub: "Cada compra suma. Aquí tienes tu carnet, tus puntos y todo lo que el club te da.",
      welcome: "¡Bienvenido al club!", welcomeB: `Tu carnet ya está activo y te hemos regalado ${SIGNUP_POINTS} puntos de bienvenida.`,
      code: "Tu código de descuento", codeB: `${REDEEM_VALUE} € de descuento · úsalo en el checkout (un solo uso).`, copy: "Copiar", copied: "Copiado",
      low: `Necesitas al menos ${REDEEM_POINTS} puntos para canjear.`,
      sPoints: "Puntos", sValue: "Canjeable ahora", sSince: "Socio desde", sOrders: "Pedidos",
      club: "Club de socios", cardSince: "Desde", pts: "pts",
      pointsT: "Tus puntos", pointsK: "Recompensas", of: `de ${REDEEM_POINTS}`,
      ready: (n: number, v: number) => (n > 1 ? `Tienes ${n} descuentos disponibles (${v} €).` : `Tienes un descuento de ${v} € disponible.`),
      need: (n: number) => `Te faltan ${n} pts para tu próximo descuento de ${REDEEM_VALUE} €.`,
      redeem: `Canjear ${REDEEM_POINTS} pts por ${REDEEM_VALUE} €`, redeeming: "Generando código…",
      tip: (n: number) => `Te faltan ${n} puntos. Cada euro en productos suma 1 punto.`,
      redeemNote: "Recibirás un código de un solo uso para el checkout.",
      tierK: "Tu nivel", tierNext: (n: number, t: string) => `${n.toLocaleString("es-ES")} pts más para ${t}`, tierTop: "Has alcanzado el nivel más alto del club.", tierNote: "Tu nivel crece con los puntos que acumulas; canjear no te baja de nivel.",
      howT: "Cómo sumar puntos", howK: "Reglas del club",
      histT: "Historial de puntos", histK: "Movimientos",
      rORDER: "Compra", rSIGNUP: "Bienvenida al club", rBIRTHDAY: "Regalo de cumpleaños", rREDEEM: "Canje por código de descuento", rREFUND: "Devolución", rADJUSTMENT: "Ajuste", order: "Pedido",
      actionsK: "Accesos rápidos", orders: "Mis pedidos", ordersNone: "Aún no tienes pedidos", ordersLast: "Último pedido", ordersCount: (n: number) => `${n} ${n === 1 ? "pedido" : "pedidos"}`,
      profile: "Perfil y privacidad", profileB: "Datos, contraseña, comunicaciones y RGPD.", design: "Diseña tú mismo", designB: "Crea tu prenda con nuestro editor.",
      perksK: "Ventajas de socio", perksT: "Lo que te da el club",
      joinK: "Club de socios · gratis", joinT: "Hazte socio del club", joinB: `Carnet digital con número de socio, ${SIGNUP_POINTS} puntos de bienvenida y puntos en cada compra. Sin cuotas.`, join: "Hacerme socio gratis", joinMore: "Ver el club",
      preview: "TU NOMBRE", cardAria: (n: string, t: string, p: number) => `Carnet de socio Nº ${n}, nivel ${t}, ${p} puntos`, cardAriaAnon: "Vista previa del carnet de socio",
    },
    en: {
      kicker: "My club", hello: "Hi", helloAnon: "Welcome", sub: "Every order counts. Your card, your points and everything the club gives you.",
      welcome: "Welcome to the club!", welcomeB: `Your card is active and we've added ${SIGNUP_POINTS} welcome points.`,
      code: "Your discount code", codeB: `${REDEEM_VALUE} € off · use it at checkout (single use).`, copy: "Copy", copied: "Copied",
      low: `You need at least ${REDEEM_POINTS} points to redeem.`,
      sPoints: "Points", sValue: "Redeemable now", sSince: "Member since", sOrders: "Orders",
      club: "Members club", cardSince: "Since",
      pointsT: "Your points", pointsK: "Rewards", of: `of ${REDEEM_POINTS}`,
      ready: (n: number, v: number) => (n > 1 ? `You have ${n} discounts available (${v} €).` : `You have a ${v} € discount available.`),
      need: (n: number) => `${n} pts to go for your next ${REDEEM_VALUE} € discount.`,
      redeem: `Redeem ${REDEEM_POINTS} pts for ${REDEEM_VALUE} €`, redeeming: "Creating code…",
      tip: (n: number) => `You need ${n} more points. Every euro on products earns 1 point.`,
      redeemNote: "You'll get a single-use code for checkout.",
      tierK: "Your tier", tierNext: (n: number, t: string) => `${n.toLocaleString("en-GB")} more pts to ${t}`, tierTop: "You've reached the club's top tier.", tierNote: "Your tier grows with the points you earn; redeeming never lowers it.",
      howT: "How to earn points", howK: "Club rules",
      histT: "Points history", histK: "Activity",
      rORDER: "Purchase", rSIGNUP: "Welcome to the club", rBIRTHDAY: "Birthday gift", rREDEEM: "Redeemed for a discount code", rREFUND: "Refund", rADJUSTMENT: "Adjustment", order: "Order",
      actionsK: "Quick actions", orders: "My orders", ordersNone: "No orders yet", ordersLast: "Last order", ordersCount: (n: number) => `${n} ${n === 1 ? "order" : "orders"}`,
      profile: "Profile & privacy", profileB: "Details, password, emails and GDPR.", design: "Design your own", designB: "Create your piece with our editor.",
      perksK: "Member perks", perksT: "What the club gives you",
      joinK: "Members club · free", joinT: "Join the club", joinB: `Digital member card, ${SIGNUP_POINTS} welcome points and points on every order. No fees.`, join: "Join for free", joinMore: "About the club",
      preview: "YOUR NAME", cardAria: (n: string, t: string, p: number) => `Member card No. ${n}, ${t} tier, ${p} points`, cardAriaAnon: "Member card preview",
    },
    de: {
      kicker: "Mein Club", hello: "Hallo", helloAnon: "Willkommen", sub: "Jeder Einkauf zählt. Dein Ausweis, deine Punkte und alles, was der Club dir bietet.",
      welcome: "Willkommen im Club!", welcomeB: `Dein Ausweis ist aktiv – ${SIGNUP_POINTS} Willkommenspunkte sind gutgeschrieben.`,
      code: "Dein Rabattcode", codeB: `${REDEEM_VALUE} € Rabatt · im Checkout einlösen (einmalig).`, copy: "Kopieren", copied: "Kopiert",
      low: `Du brauchst mindestens ${REDEEM_POINTS} Punkte.`,
      sPoints: "Punkte", sValue: "Jetzt einlösbar", sSince: "Mitglied seit", sOrders: "Bestellungen",
      club: "Mitgliederclub", cardSince: "Seit", pts: "Pkt.",
      pointsT: "Deine Punkte", pointsK: "Prämien", of: `von ${REDEEM_POINTS}`,
      ready: (n: number, v: number) => (n > 1 ? `Du hast ${n} Rabatte verfügbar (${v} €).` : `Du hast einen Rabatt von ${v} € verfügbar.`),
      need: (n: number) => `Noch ${n} Pkt. bis zu deinem nächsten ${REDEEM_VALUE} €-Rabatt.`,
      redeem: `${REDEEM_POINTS} Pkt. gegen ${REDEEM_VALUE} € einlösen`, redeeming: "Code wird erstellt…",
      tip: (n: number) => `Dir fehlen ${n} Punkte. Jeder Euro auf Produkte bringt 1 Punkt.`,
      redeemNote: "Du erhältst einen einmaligen Code für den Checkout.",
      tierK: "Deine Stufe", tierNext: (n: number, t: string) => `Noch ${n.toLocaleString("de-DE")} Pkt. bis ${t}`, tierTop: "Du hast die höchste Stufe erreicht.", tierNote: "Deine Stufe wächst mit gesammelten Punkten; Einlösen senkt sie nie.",
      howT: "So sammelst du Punkte", howK: "Clubregeln",
      histT: "Punkteverlauf", histK: "Bewegungen",
      rORDER: "Einkauf", rSIGNUP: "Willkommen im Club", rBIRTHDAY: "Geburtstagsgeschenk", rREDEEM: "Gegen Rabattcode eingelöst", rREFUND: "Erstattung", rADJUSTMENT: "Korrektur", order: "Bestellung",
      actionsK: "Schnellzugriff", orders: "Meine Bestellungen", ordersNone: "Noch keine Bestellungen", ordersLast: "Letzte Bestellung", ordersCount: (n: number) => `${n} ${n === 1 ? "Bestellung" : "Bestellungen"}`,
      profile: "Profil & Datenschutz", profileB: "Daten, Passwort, E-Mails und DSGVO.", design: "Selbst gestalten", designB: "Gestalte dein Teil im Editor.",
      perksK: "Mitgliedervorteile", perksT: "Was dir der Club bietet",
      joinK: "Mitgliederclub · kostenlos", joinT: "Werde Clubmitglied", joinB: `Digitaler Ausweis, ${SIGNUP_POINTS} Willkommenspunkte und Punkte bei jedem Einkauf. Ohne Gebühren.`, join: "Kostenlos beitreten", joinMore: "Zum Club",
      preview: "DEIN NAME", cardAria: (n: string, t: string, p: number) => `Mitgliedsausweis Nr. ${n}, Stufe ${t}, ${p} Punkte`, cardAriaAnon: "Vorschau des Mitgliedsausweises",
    },
  });

  const isMember = Boolean(member);
  const points = member?.points ?? 0;
  const rp = redeemProgress(points);
  const tp = tierProgress(member?.lifetime ?? 0);
  const tLabel = tierName(locale, tp.tier.id);
  const nextLabel = tp.next ? tierName(locale, tp.next.id) : null;
  const sinceLabel = member?.since ? new Intl.DateTimeFormat(dl, { month: "short", year: "numeric" }).format(new Date(member.since)) : "—";
  const sinceYear = member?.since ? new Date(member.since).getFullYear().toString() : new Date().getFullYear().toString();
  const rules = earnRules(locale);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ---------------- HERO ---------------- */}
      <section className="relative isolate overflow-hidden rounded-[28px] bg-[#070606] text-[#f5f1e8] shadow-[0_40px_80px_-50px_rgba(0,0,0,0.8)]">
        <ClubHeroMedia />
        <div className="relative grid gap-10 p-6 pb-8 sm:p-10 lg:min-h-[560px] lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:p-14">
          <div className="min-w-0">
            {flags.welcome && isMember && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl bg-[#e0b84a]/12 p-4 ring-1 ring-[#e0b84a]/40 backdrop-blur-sm" role="status">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#f1d27a]" aria-hidden />
                <p className="text-sm leading-relaxed">
                  <strong className="font-semibold text-[#f1d27a]">{c.welcome}</strong> <span className="text-white/80">{c.welcomeB}</span>
                </p>
              </div>
            )}
            {flags.code && (
              <div className="mb-6 overflow-hidden rounded-2xl bg-black/40 ring-1 ring-[#e0b84a]/60 backdrop-blur-sm" role="status">
                <div className="flag-line h-1" />
                <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f1d27a]">{c.code}</p>
                    <p className="mt-1 select-all break-all font-mono text-2xl font-bold tracking-[0.18em] sm:text-3xl">{flags.code}</p>
                    <p className="mt-1 text-xs text-white/65">{c.codeB}</p>
                  </div>
                  <CopyCode code={flags.code} copyLabel={c.copy} copiedLabel={c.copied} />
                </div>
              </div>
            )}
            {flags.insufficient && <p className="mb-6 rounded-2xl bg-[#a3162b]/25 p-4 text-sm font-semibold ring-1 ring-[#e8263f]/40" role="alert">{c.low}</p>}

            <div className="flex items-center gap-3">
              <span className="flag-stripe h-3.5 w-5 rounded-[3px]" aria-hidden />
              <p className="kicker text-[#e0b84a]">{isMember ? `${c.kicker} · ${tLabel}` : c.joinK}</p>
            </div>
            <h2 className="mt-4 font-[family-name:var(--font-logo)] text-[clamp(2.4rem,9vw,4.6rem)] font-bold leading-[1.02] tracking-[0.01em]">
              {isMember ? (
                <>
                  <span className="text-red-metal">{c.hello},</span> <span className="text-gold-metal break-words">{member!.firstName ?? tLabel}</span>
                </>
              ) : (
                <span className="text-gold-metal">{c.joinT}</span>
              )}
            </h2>
            <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-white/75 sm:text-[17px]">{isMember ? c.sub : c.joinB}</p>

            {isMember ? (
              <dl className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10 backdrop-blur-md">
                {[
                  [c.sPoints, points.toLocaleString(dl)],
                  [c.sValue, `${rp.value} €`],
                  [c.sSince, sinceLabel],
                ].map(([k, v]) => (
                  <div key={k} className="bg-[#0b0909]/70 px-3 py-4 sm:px-5">
                    <dt className="min-h-[2.4em] text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-white/60 sm:min-h-0 sm:text-[11px]">{k}</dt>
                    <dd className="mt-1.5 whitespace-nowrap text-lg font-bold tabular-nums text-[#f5f1e8] sm:text-2xl">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <form action={joinAction}>
                  <button className="rg-focus btn bg-[#a3162b] px-7 py-4 text-[15px] text-white hover:-translate-y-px hover:shadow-[0_14px_34px_-12px_#a3162b]">
                    {c.join} <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </button>
                </form>
                <Link href="/club" className="rg-focus btn btn-ghost-light px-7 py-4 text-[15px]">
                  {c.joinMore}
                </Link>
              </div>
            )}
          </div>

          <div className="relative">
            <MemberCard3D
              number={member?.number ?? "000000"}
              name={member?.name || (isMember ? email : c.preview)}
              since={sinceYear}
              points={isMember ? points : undefined}
              tier={tp.tier.id}
              tierLabel={tLabel}
              labels={{ club: c.club, since: c.cardSince, points: c.pts }}
              ariaLabel={isMember ? c.cardAria(member!.number, tLabel, points) : c.cardAriaAnon}
            />
          </div>
        </div>
      </section>

      {/* ---------------- POINTS & REWARDS ---------------- */}
      {isMember && (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <section className="rounded-[24px] bg-surface p-6 ring-1 ring-line sm:p-8" aria-labelledby="club-points">
            <h3 id="club-points" className="headline text-3xl">{c.pointsT}</h3>

            <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
              <div className="relative h-[168px] w-[168px] shrink-0">
                <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" aria-hidden>
                  <defs>
                    <linearGradient id="rg-ring-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f7e08a" />
                      <stop offset="55%" stopColor="#c9a227" />
                      <stop offset="100%" stopColor="#a3162b" />
                    </linearGradient>
                  </defs>
                  <circle cx="80" cy="80" r="70" fill="none" strokeWidth="10" className="rg-ring-track" />
                  <circle cx="80" cy="80" r="70" fill="none" strokeWidth="10" strokeLinecap="round" stroke="url(#rg-ring-grad)" className="rg-ring-bar" style={{ ["--len" as string]: RING, ["--off" as string]: RING * (1 - Math.max(0.001, rp.progress)) }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-bold tabular-nums leading-none">{points.toLocaleString(dl)}</span>
                  <span className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">{rp.canRedeem ? c.pts : c.of}</span>
                </div>
              </div>
              <div className="w-full min-w-0 text-center sm:text-left">
                <p className="text-lg font-semibold leading-snug">{rp.canRedeem ? c.ready(rp.rewards, rp.value) : c.need(rp.toNext)}</p>
                <p className="mt-1 text-sm text-muted">{c.redeemNote}</p>
                <form action={redeemAction} className="mt-5">
                  <RedeemButton label={c.redeem} pendingLabel={c.redeeming} disabled={!rp.canRedeem} hint={c.tip(rp.toNext)} />
                </form>
              </div>
            </div>

            <div className="mt-8 border-t border-line pt-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">
                  <span className="text-muted">{c.tierK}:</span> {tLabel}
                </p>
                <p className="text-sm text-muted">{nextLabel ? c.tierNext(tp.toNext, nextLabel) : c.tierTop}</p>
              </div>
              <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(tp.progress * 100)} aria-label={nextLabel ? c.tierNext(tp.toNext, nextLabel) : c.tierTop}>
                <div className="rg-bar-fill h-full rounded-full bg-[linear-gradient(90deg,#a3162b,#c9a227_60%,#f7e08a)]" style={{ width: `${Math.max(3, tp.progress * 100)}%` }} />
              </div>
              <p className="mt-3 text-xs text-muted">{c.tierNote}</p>
            </div>
          </section>

          <section className="rounded-[24px] bg-surface p-6 ring-1 ring-line sm:p-8" aria-labelledby="club-how">
            <h3 id="club-how" className="headline text-3xl">{c.howT}</h3>
            <ol className="mt-6 space-y-5">
              {rules.map(({ icon: Icon, t, b }, i) => (
                <li key={t} className="flex gap-4">
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-gold ring-1 ring-line">
                    <Icon className="h-5 w-5" aria-hidden />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-fg text-[10px] font-bold text-bg">{i + 1}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{t}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted">{b}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}

      {/* ---------------- HISTORY ---------------- */}
      {isMember && ledger.length > 0 && (
        <section className="rounded-[24px] bg-surface p-6 ring-1 ring-line sm:p-8" aria-labelledby="club-history">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-gold" aria-hidden />
            <p className="kicker text-accent">{c.histK}</p>
          </div>
          <h3 id="club-history" className="headline mt-2 text-3xl">{c.histT}</h3>
          <ul className="mt-5 divide-y divide-line">
            {ledger.map((r) => {
              const label = (c as unknown as Record<string, string | undefined>)[`r${r.reason}`];
              const pos = r.points >= 0;
              return (
                <li key={r.id} className="flex items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {label ?? r.reason}
                      {r.orderNumber ? <span className="text-muted"> · {c.order} #{r.orderNumber}</span> : null}
                    </p>
                    <p className="text-xs text-muted">{formatDate(r.date, dl)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold tabular-nums ${pos ? "bg-[#c9a227]/15 text-[#8a6a10] dark:text-[#f1d27a]" : "bg-surface-2 text-muted"}`}>
                    {pos ? "+" : "−"}
                    {Math.abs(r.points).toLocaleString(dl)} {c.pts}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ---------------- QUICK ACTIONS ---------------- */}
      <section aria-label={c.actionsK}>
        <div className="grid gap-4 sm:grid-cols-3">
          <ActionCard href="/account/orders" icon={<Package className="h-5 w-5" aria-hidden />} title={c.orders} meta={orders.count ? c.ordersCount(orders.count) : undefined}>
            {orders.last ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-muted">
                  {c.ordersLast} #{orders.last.number} · {formatDate(orders.last.date, dl)}
                </span>
                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] ring-1 ring-line">{orders.last.status}</span>
              </span>
            ) : (
              <span className="text-muted">{c.ordersNone}</span>
            )}
          </ActionCard>
          <ActionCard href="/account/profile" icon={<ShieldCheck className="h-5 w-5" aria-hidden />} title={c.profile}>
            <span className="text-muted">{c.profileB}</span>
          </ActionCard>
          <ActionCard href="/disena" icon={<Palette className="h-5 w-5" aria-hidden />} title={c.design}>
            <span className="text-muted">{c.designB}</span>
          </ActionCard>
        </div>
      </section>

      {/* ---------------- PERKS + TIERS ---------------- */}
      <section className="rounded-[24px] bg-surface-2/60 p-6 ring-1 ring-line sm:p-8" aria-labelledby="club-perks">
        <h3 id="club-perks" className="headline text-3xl">{c.perksT}</h3>
        <div className="mt-6">
          <PerksGrid locale={locale} />
        </div>
        {isMember && (
          <div className="mt-6">
            <TierLadder locale={locale} current={tp.tier.id} />
          </div>
        )}
      </section>
    </div>
  );
}

function ActionCard({ href, icon, title, meta, children }: { href: string; icon: React.ReactNode; title: string; meta?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rg-focus group relative flex min-h-[168px] flex-col overflow-hidden rounded-[22px] bg-surface p-6 ring-1 ring-line transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-30px_rgba(0,0,0,0.45)] hover:ring-[#c9a227]/60">
      <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(201,162,39,0.18),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-fg text-bg transition-colors duration-300 group-hover:bg-[#a3162b] group-hover:text-white">{icon}</span>
        <span className="flex items-center gap-2">
          {meta && <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold tabular-nums text-muted ring-1 ring-line">{meta}</span>}
          <ArrowUpRight className="h-5 w-5 text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden />
        </span>
      </div>
      <p className="headline mt-auto pt-6 text-[1.6rem]">{title}</p>
      <div className="mt-1.5 text-sm leading-snug">{children}</div>
    </Link>
  );
}
