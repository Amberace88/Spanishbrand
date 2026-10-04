import Link from "next/link";
import Image from "next/image";
import { getLocale, getT } from "@/lib/i18n/server";
import { getShowcase, type PublicCollection, type PublicProduct, type Showcase } from "@/lib/products/queries";
import { EditorialTile, type TileSize } from "@/components/merch/EditorialTile";
import { CATEGORY_LOOKS, lookFor } from "@/lib/catalog/tones";
import { tileCards, tileCount, tilePhoto } from "@/lib/catalog/tiles";
import { themeFor, upcomingFiestas } from "@/lib/themes";
import { Mockup, type MockupKind } from "@/components/art/Mockup";
import { JerseyBack } from "@/components/art/Jersey";
import { Reveal } from "@/components/ui/Reveal";
import { Container, SectionHead } from "@/components/ui/Section";
import { IconArrow, IconChat, IconLeaf, IconLock, IconReturn, IconTruck } from "@/components/ui/Icons";
import { Newsletter } from "@/components/home/Newsletter";
import { listSiteImages } from "@/lib/site-images";
import { campaignPhoto } from "@/lib/campaign";
import { BrandLogo } from "@/components/brand/Wordmark";

function ArrowDot({ className = "" }: { className?: string }) {
  return (
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border border-current/25 transition-transform duration-300 group-hover:-rotate-45 ${className}`}>
      <IconArrow className="h-4 w-4" />
    </span>
  );
}

export async function TrustBar() {
  const t = await getT();
  const items = [
    [IconTruck, t("trust.shipping.t"), t("trust.shipping.b"), "/shipping"],
    [IconReturn, t("trust.returns.t"), t("trust.returns.b"), "/returns"],
    [IconLock, t("trust.secure.t"), t("trust.secure.b"), "/terms"],
    [IconLeaf, t("trust.made.t"), t("trust.made.b"), "/about"],
  ] as const;
  return (
    <section className="bg-bg">
      <Container>
        <ul className="grid grid-cols-2 border-y border-line lg:grid-cols-4">
          {items.map(([Icon, title, body, href], i) => (
            <li key={title} className={`border-line ${i % 2 ? "border-l" : ""} ${i === 2 ? "lg:border-l" : ""} ${i > 1 ? "border-t lg:border-t-0" : ""}`}>
              <Link href={href} className="group flex items-center gap-3 px-2 py-5 sm:gap-4 sm:px-6">
                <Icon className="h-6 w-6 shrink-0 text-accent transition-transform group-hover:scale-110" />
                <span>
                  <span className="block text-[13px] font-bold uppercase tracking-wide sm:text-sm">{title}</span>
                  <span className="mt-0.5 hidden text-[13px] leading-snug text-muted sm:block">{body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/** Category tiles: what each covers in the listing, where it links and its editorial look. */
export const CATEGORY_TILES: { key: string; look: string; href: string; match: (p: PublicProduct) => boolean }[] = [
  { key: "cats.TEES", look: "TSHIRT", href: "/shop?c=APPAREL&t=TSHIRT", match: (p) => p.productType === "TSHIRT" },
  { key: "cats.HOODIES", look: "HOODIE", href: "/shop?c=APPAREL&t=HOODIE", match: (p) => p.productType === "HOODIE" },
  { key: "cats.HEADWEAR", look: "HEADWEAR", href: "/shop?c=HEADWEAR", match: (p) => p.categoryCode === "HEADWEAR" },
  { key: "cats.DRINKWARE", look: "DRINKWARE", href: "/shop?c=DRINKWARE", match: (p) => p.categoryCode === "DRINKWARE" },
  { key: "cats.WALL_ART", look: "WALL_ART", href: "/shop?c=WALL_ART", match: (p) => p.categoryCode === "WALL_ART" },
  { key: "cats.BAGS", look: "BAGS", href: "/shop?c=BAGS", match: (p) => p.categoryCode === "BAGS" },
  { key: "cats.HOME_LIVING", look: "HOME_LIVING", href: "/shop?c=HOME_LIVING", match: (p) => p.categoryCode === "HOME_LIVING" },
  { key: "cats.EMBROIDERY", look: "EMB", href: "/shop?tema=bordados", match: (p) => p.tags.includes("bordado") },
];

export async function CategoryGrid({ products }: { products: PublicProduct[] }) {
  const [t, site, locale] = await Promise.all([getT(), listSiteImages(), getLocale()]);
  const en = locale === "en";
  const tiles = CATEGORY_TILES.map((c) => ({ c, items: products.filter(c.match) })).filter((x) => x.items.length);
  if (!tiles.length) return null;
  return (
    <section className="bg-bg py-16 sm:py-24">
      <Container>
        <SectionHead
          eyebrow={t("cats.eyebrow")}
          title={t("cats.title")}
          action={
            <Link href="/shop" className="btn btn-ghost">
              {t("cats.shop")} <IconArrow className="h-4 w-4" />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {tiles.map(({ c, items }, i) => {
            const look = CATEGORY_LOOKS[c.look];
            return (
              <Reveal key={c.key} delay={(i % 4) * 0.05} className="aspect-[4/5]">
                <EditorialTile href={c.href} title={t(c.key as never)} kicker={en ? `${items.length} items` : `${items.length} piezas`} tone={look.tone} texture={look.texture} word={look.word} photo={tilePhoto(look, site)} cards={tileCards(items, 3)} size="card" />
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

/** Bento spans per tile size (mobile: 2 columns, desktop: 4). */
const SPAN: Record<string, string> = { hero: "col-span-2 row-span-2", tall: "row-span-2", sq: "", wide: "col-span-2", banner: "col-span-2 lg:col-span-4" };
/** Layout patterns that fill whole rows of the 4-column bento for 3–8 themes. */
const BENTO: Record<number, string[]> = {
  8: ["hero", "tall", "sq", "sq", "wide", "sq", "sq", "banner"],
  7: ["hero", "tall", "sq", "sq", "wide", "sq", "sq"],
  6: ["hero", "tall", "sq", "sq", "wide", "wide"],
  5: ["hero", "sq", "sq", "sq", "sq"],
  4: ["hero", "tall", "sq", "sq"],
  3: ["hero", "wide", "wide"],
};

/** "Lo que nos mueve": editorial bento of the themes — brand tones, texture, campaign photo or fanned product cards. */
export async function ThemesBento({ collections, products }: { collections: PublicCollection[]; products: PublicProduct[] }) {
  const [t, site, locale] = await Promise.all([getT(), listSiteImages(), getLocale()]);
  const en = locale === "en";
  const tiles = collections
    .map((c) => ({ c, items: products.filter((p) => p.collection?.slug === c.slug) }))
    .filter((x) => x.items.length || !products.length)
    .slice(0, 8);
  const pattern = BENTO[tiles.length] ?? tiles.map(() => "wide");
  return (
    <section className="bg-bg py-16 sm:py-24">
      <Container>
        <SectionHead eyebrow={t("themes.kicker")} title={t("themes.title")} sub={t("themes.sub")} />
        <div className="grid grid-flow-dense auto-rows-[190px] grid-cols-2 gap-3 sm:auto-rows-[250px] sm:gap-4 lg:auto-rows-[270px] lg:grid-cols-4">
          {tiles.map(({ c, items }, i) => {
            const look = lookFor(c.slug);
            const kind = pattern[i] ?? "sq";
            const size = kind as TileSize;
            return (
              <Reveal key={c.slug} delay={(i % 4) * 0.05} className={SPAN[kind]}>
                <EditorialTile
                  href={`/collections/${c.slug}`}
                  title={c.name}
                  kicker={items.length ? tileCount(items, en) : undefined}
                  tagline={c.tagline}
                  cta={en ? "See the collection" : "Ver colección"}
                  tone={look.tone}
                  texture={look.texture}
                  word={look.word}
                  photo={tilePhoto(look, site)}
                  cards={tileCards(items, 3)}
                  size={size}
                />
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

export async function FiestasCalendar() {
  const t = await getT();
  const list = upcomingFiestas(new Date(), 4);
  if (!list.length) return null;
  const [next, ...rest] = list;
  const photo = campaignPhoto("fiestas");
  const date = (d: Date) => d.toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "UTC" });
  return (
    <section className="bg-bg pb-16 sm:pb-24">
      <Container>
        <Reveal>
          <h2 className="headline text-[2.1rem] sm:text-5xl">{t("fiestas.title")}</h2>
        </Reveal>
        <div className="mt-8 grid gap-3 lg:grid-cols-[1.25fr_1fr]">
          <Reveal>
            <Link href={`/collections/${next.theme}`} className="group relative isolate flex min-h-[340px] flex-col justify-end overflow-hidden rounded-[1.75rem] bg-[#7a0a1c] p-6 text-white sm:min-h-[380px] sm:p-9">
              {photo && <Image src={photo} alt="" fill sizes="(min-width:1024px) 55vw, 100vw" className="-z-10 object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]" />}
              <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(60,4,14,.95)_0%,rgba(60,4,14,.6)_45%,rgba(60,4,14,.1)_100%)]" />
              <span className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full border border-white/40 transition-transform duration-200 ease-out group-hover:-rotate-45 sm:right-9 sm:top-9">
                <IconArrow className="h-4 w-4" />
              </span>
              <p className="text-sm font-medium text-white/80">{date(next.date)} · {next.place}</p>
              <p className="mega mt-2 text-[4.5rem] leading-none sm:text-8xl">{next.days === 0 ? "HOY" : next.days}</p>
              <p className="mt-1 text-sm font-semibold text-white/85">{next.days === 0 ? t("fiestas.today") : t("fiestas.days", { n: next.days })}</p>
              <p className="headline mt-5 text-2xl sm:text-3xl">{next.name}</p>
            </Link>
          </Reveal>
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-[1.75rem] bg-surface ring-1 ring-line">
            {rest.map((f, i) => (
              <Reveal key={f.key} delay={0.05 + i * 0.05} className="flex-1">
                <li className="h-full">
                  <Link href={`/collections/${f.theme}`} className="group flex h-full items-center gap-5 px-6 py-5 transition-colors hover:bg-surface-2 sm:px-8">
                    <span className="mega w-20 shrink-0 text-5xl tabular-nums leading-none">{f.days}</span>
                    <span className="min-w-0 flex-1">
                      <span className="headline block text-lg sm:text-xl">{f.name}</span>
                      <span className="block text-[13px] text-muted">{date(f.date)} · {f.place}</span>
                    </span>
                    <IconArrow className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 ease-out group-hover:translate-x-1" />
                  </Link>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

/**
 * Personalisation banner, in the same editorial language as the theme / category tiles: a campaign photo
 * under a deep wash, display type on the left and the live jersey (name + number) floating on the right.
 * Shared by the home page and /deportes.
 */
export async function PersoBanner({ title, body, href = "/personaliza", options, photoKey = "futbol" }: { title: string; body: string; href?: string; options?: string[]; photoKey?: string }) {
  const t = await getT();
  const photo = campaignPhoto(photoKey);
  return (
    <Link href={href} className="group relative isolate block overflow-hidden rounded-[1.75rem] bg-[#0b0b0b] text-white">
      {photo && (
        <div className="absolute inset-0">
          <Image src={photo} alt="" fill sizes="(min-width:1024px) 90vw, 100vw" className="object-cover object-[60%_30%] transition-transform duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#0b0b0b_0%,rgba(11,11,11,.92)_34%,rgba(11,11,11,.55)_62%,rgba(11,11,11,.25)_100%)] max-lg:bg-[linear-gradient(0deg,#0b0b0b_0%,rgba(11,11,11,.9)_45%,rgba(11,11,11,.35)_100%)]" />
        </div>
      )}
      <div className="grain-soft pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative grid min-h-[460px] items-end gap-8 p-6 sm:p-10 lg:min-h-[420px] lg:grid-cols-[1.15fr_1fr] lg:items-center lg:p-14">
        <div className="relative z-10 max-lg:order-2">
          <h2 className="mega text-[3.2rem] leading-[0.92] sm:text-7xl lg:text-8xl">{title}</h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-white/75">{body}</p>
          {options && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {options.map((o) => (
                <li key={o} className="rounded-full border border-white/20 bg-black/20 px-3.5 py-1.5 text-[13px] font-medium backdrop-blur-sm">
                  {o}
                </li>
              ))}
            </ul>
          )}
          <span className="btn btn-primary mt-8 w-fit px-7 py-4 text-[15px]">
            {t("perso.cta")} <IconArrow className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1" />
          </span>
        </div>
        <div className="pointer-events-none relative mx-auto w-[62%] max-w-[360px] max-lg:order-1 lg:w-[72%]" aria-hidden>
          <div className="floaty rotate-[-4deg] drop-shadow-[0_30px_40px_rgba(0,0,0,0.55)]">
            <JerseyBack name="TU NOMBRE" number="7" shirt="#f5f1e8" ink="#c8102e" trim="#c9a227" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export async function PersonalizeTeaser() {
  const t = await getT();
  return (
    <section className="bg-bg py-16 sm:py-24">
      <Container>
        <Reveal>
          <PersoBanner title={t("perso.title")} body={t("perso.body")} options={[t("perso.opt.jersey"), t("perso.opt.pueblo"), t("perso.opt.city"), t("perso.opt.year")]} />
        </Reveal>
      </Container>
    </section>
  );
}

export function MemberCard({ brandName, number, name, since, points }: { brandName: string; number: string; name: string; since: string; points?: number }) {
  return (
    <div className="group relative mx-auto aspect-[1.586] w-full max-w-[480px] [perspective:1200px]">
      <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-[#0d0d0d] p-6 text-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:[transform:rotateY(-8deg)_rotateX(6deg)] sm:p-8">
        <div className="flag-line absolute inset-x-0 top-0 h-2" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#e3051b]/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-[#ffc400]/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="block h-9 sm:h-11"><BrandLogo variant="text" alt={brandName} /></span>
              <p className="kicker mt-1 text-[#ffc400]">Club · Socio</p>
            </div>
            <span className="block h-14 sm:h-16"><BrandLogo variant="lion" alt="" /></span>
          </div>
          <div>
            <p className="font-mono text-2xl tracking-[0.18em] sm:text-3xl">Nº {number}</p>
            <div className="mt-3 flex items-end justify-between gap-3 text-[12px] uppercase tracking-[0.14em] text-white/60">
              <span className="truncate text-white">{name}</span>
              <span className="shrink-0">
                {points != null ? `${points} pts · ` : ""}Desde {since}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function ClubTeaser({ brandName }: { brandName: string }) {
  const t = await getT();
  return (
    <section className="bg-bg pb-16 sm:pb-24">
      <Container>
        <div className="grid items-center gap-10 rounded-[2rem] border border-line p-8 sm:p-14 lg:grid-cols-2">
          <Reveal>
            <h2 className="headline text-[2.4rem] sm:text-6xl">{t("club.title")}</h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">{t("club.body")}</p>
            <ul className="mt-6 grid gap-2 text-[15px]">
              {[t("club.b1"), t("club.b2"), t("club.b3"), t("club.b4")].map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <span className="h-2 w-2 rotate-45 bg-accent" /> {b}
                </li>
              ))}
            </ul>
            <Link href="/club" className="btn btn-ink mt-8 px-8 py-4 text-[15px]">
              {t("club.cta")} <IconArrow className="h-4 w-4" />
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <MemberCard brandName={brandName} number="000001" name="TU NOMBRE" since="2026" />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

const KIND_BY_COLLECTION: Record<string, { kind: MockupKind; color: string }> = {
  espana: { kind: "tee", color: "#ffffff" },
  heritage: { kind: "hoodie", color: "#f1e7d3" },
  mediterraneo: { kind: "tote", color: "#ffffff" },
  motor: { kind: "tee", color: "#0d0d0d" },
};

/** Honest pre-launch grid: collection previews (not products), each linking to its collection. */
export async function ComingSoonGrid({ collections }: { collections: PublicCollection[] }) {
  const t = await getT();
  return (
    <section className="bg-bg py-16 sm:py-24">
      <Container>
        <SectionHead eyebrow={t("soon.eyebrow")} title={t("soon.title")} sub={t("soon.body")} />
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 lg:grid-cols-4">
          {collections.slice(0, 4).map((c, i) => {
            const k = KIND_BY_COLLECTION[c.slug] ?? { kind: "tee" as MockupKind, color: "#ffffff" };
            return (
              <Reveal key={c.slug} delay={i * 0.05}>
                <Link href={`/collections/${c.slug}`} className="group block">
                  <div className="relative overflow-hidden rounded-3xl bg-surface-2 p-6 sm:p-8">
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-fg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-bg">{t("soon.badge")}</span>
                    <div className="transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]">
                      <Mockup kind={k.kind} color={k.color} slug={c.slug} />
                    </div>
                  </div>
                  <p className="kicker mt-4 text-muted">{c.name}</p>
                  <p className="mt-1 font-semibold leading-snug">{c.tagline}</p>
                </Link>
              </Reveal>
            );
          })}
        </div>
        <Reveal>
          <div className="mt-12 grid gap-6 rounded-3xl bg-surface-2 p-6 sm:p-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <p className="headline text-2xl sm:text-3xl">{t("newsletter.title")}</p>
            <Newsletter source="coming-soon" />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export async function CollectionsBento({ collections, counts, products = [] }: { collections: PublicCollection[]; counts: Record<string, number>; products?: PublicProduct[] }) {
  const [t, site, locale] = await Promise.all([getT(), listSiteImages(), getLocale()]);
  const en = locale === "en";
  const list = collections.slice(0, 3);
  return (
    <section className="bg-bg py-16 sm:py-24">
      <Container>
        <SectionHead title={t("cols.title")} sub={t("home.collections.sub")} />
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
          {list.map((c, i) => {
            const look = lookFor(c.slug);
            const items = products.filter((p) => p.collection?.slug === c.slug);
            return (
              <Reveal key={c.slug} delay={i * 0.06} className="aspect-[4/5] sm:aspect-[16/10] lg:aspect-[4/5]">
                <EditorialTile
                  href={`/collections/${c.slug}`}
                  title={c.name}
                  kicker={items.length ? tileCount(items, en) : counts[c.slug] ? t("collections.pieces", { n: counts[c.slug] }) : undefined}
                  tagline={c.tagline}
                  cta={en ? "See the collection" : "Ver colección"}
                  tone={look.tone}
                  texture={look.texture}
                  word={look.word}
                  photo={tilePhoto(look, site)}
                  cards={tileCards(items, 3)}
                  size="tall"
                />
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

export async function BrandPromise() {
  const t = await getT();
  const items = [
    [t("promise.a.t"), t("promise.a.b")],
    [t("promise.b.t"), t("promise.b.b")],
    [t("promise.c.t"), t("promise.c.b")],
  ] as const;
  return (
    <section className="bg-bg py-16 sm:py-24">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <h2 className="headline text-[2.4rem] sm:text-6xl">{t("promise.title")}</h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">{t("promise.body")}</p>
            <Link href="/about" className="btn btn-ghost mt-8">
              {t("home.story.cta")} <IconArrow className="h-4 w-4" />
            </Link>
          </Reveal>
          <div className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-3">
            {items.map(([title, body], i) => (
              <Reveal key={title} delay={i * 0.06} className="bg-bg p-7">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-accent/10 text-accent" aria-hidden>
                  {i === 0 ? <span className="flag-stripe h-3.5 w-5 rounded-[3px]" /> : i === 1 ? <IconLeaf className="h-5 w-5" /> : <IconChat className="h-5 w-5" />}
                </span>
                <p className="headline mt-5 text-xl">{title}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

/** Brand essentials: the ROJO Y GUALDA logo line (lookbook imagery supplied by the brand). */
export async function BrandEssentials() {
  const t = await getT();
  const tiles = [
    { src: "/brand/lookbook-embroidery.webp", label: t("ess.embroidery"), span: "col-span-2 row-span-2" },
    { src: "/brand/lookbook-cap.webp", label: t("cats.HEADWEAR"), span: "" },
    { src: "/brand/lookbook-tote.webp", label: t("cats.BAGS"), span: "" },
    { src: "/brand/lookbook-sticker.webp", label: t("ess.stickers"), span: "" },
    { src: "/brand/lookbook-patch.webp", label: t("ess.patches"), span: "" },
  ];
  return (
    <section className="bg-bg py-16 sm:py-24">
      <Container>
        <SectionHead
          eyebrow={t("ess.kicker")}
          title={t("ess.title")}
          sub={t("ess.sub")}
          action={
            <Link href="/collections/esenciales" className="btn btn-ink">
              {t("ess.cta")} <IconArrow className="h-4 w-4" />
            </Link>
          }
        />
        <div className="grid auto-rows-[180px] grid-cols-2 gap-3 sm:auto-rows-[240px] lg:grid-cols-4">
          {tiles.map((x, i) => (
            <Reveal key={x.src} delay={i * 0.05} className={x.span}>
              <Link href="/collections/esenciales" className="group relative block h-full overflow-hidden rounded-3xl bg-[#0b0b0b]">
                <Image src={x.src} alt={x.label} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 text-white sm:p-5">
                  <span className="headline text-lg uppercase sm:text-2xl">{x.label}</span>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 backdrop-blur transition-transform duration-300 group-hover:-rotate-45"><IconArrow className="h-4 w-4" /></span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
