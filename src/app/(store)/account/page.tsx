import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { getLocale } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n/pick";
import { getCurrentCustomer } from "@/lib/account";
import { joinClubAction, redeemPointsAction } from "@/app/actions/growth";
import { REDEEM_POINTS, REDEEM_VALUE } from "@/lib/club";
import { MemberCard } from "@/components/home/ShopSections";
import { IconArrow } from "@/components/ui/Icons";

export const dynamic = "force-dynamic";

export default async function AccountHome({ searchParams }: { searchParams: Promise<{ club?: string; redeem?: string }> }) {
  const [{ club, redeem }, brand, locale, { user, customer }] = await Promise.all([searchParams, getBrand(), getLocale(), getCurrentCustomer()]);
  const c = pick(locale, {
    es: { welcome: "¡Bienvenido al club!", code: "Tu código de descuento:", codeNote: "Úsalo en el checkout (un solo uso).", low: `Necesitas al menos ${REDEEM_POINTS} puntos.`, redeem: `Canjear ${REDEEM_POINTS} pts por ${REDEEM_VALUE} €`, joinT: "Hazte socio del club", joinB: "Carnet digital, puntos en cada compra y acceso anticipado a drops. Gratis.", join: "Hacerme socio", orders: "Mis pedidos", profile: "Perfil y privacidad", design: "Diseña tú mismo" },
    en: { welcome: "Welcome to the club!", code: "Your discount code:", codeNote: "Use it at checkout (single use).", low: `You need at least ${REDEEM_POINTS} points.`, redeem: `Redeem ${REDEEM_POINTS} pts for ${REDEEM_VALUE} €`, joinT: "Join the club", joinB: "Digital member card, points on every purchase and early access to drops. Free.", join: "Join now", orders: "My orders", profile: "Profile & privacy", design: "Design your own" },
    de: { welcome: "Willkommen im Club!", code: "Dein Rabattcode:", codeNote: "Im Checkout einlösen (einmalig).", low: `Du brauchst mindestens ${REDEEM_POINTS} Punkte.`, redeem: `${REDEEM_POINTS} Pkt. gegen ${REDEEM_VALUE} € einlösen`, joinT: "Werde Clubmitglied", joinB: "Digitaler Ausweis, Punkte bei jedem Einkauf und früher Zugang zu Drops. Kostenlos.", join: "Mitglied werden", orders: "Meine Bestellungen", profile: "Profil & Datenschutz", design: "Selbst gestalten" },
  });
  const isMember = Boolean(customer?.member_number);
  const points = Number(customer?.points ?? 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div>
        {club && <p className="mb-4 rounded-2xl bg-gold/15 p-4 font-semibold text-gold">{c.welcome}</p>}
        {redeem && redeem !== "insufficient" && (
          <div className="mb-4 rounded-2xl border border-gold p-5">
            <p className="text-sm text-muted">{c.code}</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-widest">{redeem}</p>
            <p className="mt-1 text-xs text-muted">{c.codeNote}</p>
          </div>
        )}
        {redeem === "insufficient" && <p className="mb-4 text-sm font-semibold text-accent">{c.low}</p>}
        {isMember ? (
          <>
            <MemberCard brandName={brand.name} number={String(customer!.member_number).padStart(6, "0")} name={(customer!.name as string) || user?.email || ""} since={new Date(customer!.member_since ?? Date.now()).getFullYear().toString()} points={points} />
            <form action={redeemPointsAction} className="mt-5">
              <button disabled={points < REDEEM_POINTS} className="btn btn-ink disabled:opacity-40">{c.redeem}</button>
            </form>
          </>
        ) : (
          <div className="rounded-3xl bg-[#0b0b0b] p-8 text-[#f5f1e8]">
            <p className="headline text-3xl">{c.joinT}</p>
            <p className="mt-2 text-[#f5f1e8]/70">{c.joinB}</p>
            <form action={joinClubAction} className="mt-6"><button className="btn bg-[#c8102e] text-white">{c.join} <IconArrow className="h-4 w-4" /></button></form>
          </div>
        )}
      </div>
      <div className="grid content-start gap-3">
        {[["/account/orders", c.orders], ["/account/profile", c.profile], ["/disena", c.design]].map(([href, label]) => (
          <Link key={href} href={href} className="group flex items-center justify-between rounded-2xl border border-line p-6 hover:border-fg">
            <span className="headline text-xl">{label}</span>
            <IconArrow className="h-5 w-5 -rotate-45 transition-transform group-hover:rotate-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
