import Link from "next/link";
import Image from "next/image";
import { getT } from "@/lib/i18n/server";
import { getShowcase, type PublicCollection, type Showcase } from "@/lib/products/queries";
import { themeFor, upcomingFiestas } from "@/lib/themes";
import { Mockup, type MockupKind } from "@/components/art/Mockup";
import { JerseyBack } from "@/components/art/Jersey";
import { Reveal } from "@/components/ui/Reveal";
import { Container, SectionHead } from "@/components/ui/Section";
import { IconArrow, IconLeaf, IconLock, IconReturn, IconTruck } from "@/components/ui/Icons";
import { Newsletter } from "@/components/home/Newsletter";
import { listSiteImages } from "@/lib/site-images";
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

/* site: our own campaign photo (models in Spain wearing the house designs) preferred over the provider mockup */
const CATEGORY_TILES: { key: string; cat: string; kind: MockupKind; color: string; slug: string; print?: "art" | "logo"; site?: string; photo: (s: Showcase) => string | undefined }[] = [
  { key: "cats.TEES", cat: "APPAREL", kind: "tee", color: "#111111", slug: "espana", print: "logo", site: "look-toro-hombre", photo: (s) => s.byType.TSHIRT },
  { key: "cats.HOODIES", cat: "APPAREL", kind: "hoodie", color: "#111111", slug: "heritage", print: "logo", site: "look-quijote-hombre", photo: (s) => s.byType.HOODIE },
  { key: "cats.HEADWEAR", cat: "HEADWEAR", kind: "cap", color: "#111111", slug: "espana", print: "logo", site: "cat-gorras", photo: (s) => s.byType.CAP ?? s.byType.BEANIE },
  { key: "cats.DRINKWARE", cat: "DRINKWARE", kind: "mug", color: "#ffffff", slug: "tapas", site: "cat-tazas", photo: (s) => s.byCategory.DRINKWARE },
  { key: "cats.WALL_ART", cat: "WALL_ART", kind: "poster", color: "#ffffff", slug: "futbol", photo: (s) => s.byType.FRAMED_PRINT ?? s.byCategory.WALL_ART },
  { key: "cats.BAGS", cat: "BAGS", kind: "tote", color: "#111111", slug: "camino", print: "logo", site: "cat-bolsas", photo: (s) => s.byCategory.BAGS },
  { key: "cats.HOME_LIVING", cat: "HOME_LIVING", kind: "poster", color: "#ffffff", slug: "playa", photo: (s) => s.byType.BLANKET ?? s.byType.PILLOW ?? s.byCategory.HOME_LIVING },
  { key: "cats.EMBROIDERY", cat: "EMB", kind: "tee", color: "#111111", slug: "heritage", print: "logo", photo: (s) => s.byTag.bordado },
];

/** Real product photo (provider mockup) in a rounded frame. */
function Photo({ src, alt, className = "", sizes = "(min-width:1024px) 16vw, 45vw" }: { src: string; alt: string; className?: string; sizes?: string }) {
  return (
    <div className={`relative aspect-square overflow-hidden rounded-2xl bg-[#f3f1ee] ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]" />
    </div>
  );
}

export async function CategoryGrid() {
  const [t, show, site] = await Promise.all([getT(), getShowcase(), listSiteImages()]);
  const photoOf = (c: (typeof CATEGORY_TILES)[number]) => (c.site && site[c.site]) || c.photo(show);
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {CATEGORY_TILES.map((c, i) => (
            <Reveal key={c.key} delay={i * 0.04}>
              <Link href={c.cat === "EMB" ? "/collections/esenciales" : `/shop?c=${c.cat}`} className="group relative block overflow-hidden rounded-3xl bg-surface-2 p-4 transition-colors duration-500 hover:bg-fg hover:text-bg sm:p-5">
                <span className="text-[11px] font-bold tabular-nums text-muted group-hover:text-bg/60">{String(i + 1).padStart(2, "0")}</span>
                {photoOf(c) ? (
                  <Photo src={photoOf(c)!} alt={t(c.key as never)} className="my-3" />
                ) : (
                  <div className="px-2 transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-1 group-hover:scale-[1.06]">
                    <Mockup kind={c.kind} color={c.color} slug={c.slug} print={c.print} />
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="headline text-lg uppercase sm:text-xl">{t(c.key as never)}</span>
                  <IconArrow className="h-4 w-4 -rotate-45 transition-transform duration-300 group-hover:rotate-0" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/** "Lo que nos mueve": bento of what matters in Spain — football, pueblo, fiesta, sea, tapas, Camino. */
export async function ThemesBento({ collections }: { collections: PublicCollection[] }) {
  const [t, show] = await Promise.all([getT(), getShowcase()]);
  const spans: Record<string, string> = {
    futbol: "col-span-2 row-span-2",
    "mi-pueblo": "col-span-2 row-span-2",
    camino: "col-span-2",
  };
  return (
    <section className="bg-bg py-16 sm:py-24">
      <Container>
        <SectionHead eyebrow={t("themes.kicker")} title={t("themes.title")} sub={t("themes.sub")} />
        <div className="grid grid-flow-dense auto-rows-[210px] grid-cols-2 gap-3 sm:auto-rows-[250px] lg:grid-cols-4">
          {collections.map((c, i) => {
            const th = themeFor(c.slug);
            const big = c.slug === "futbol" || c.slug === "mi-pueblo";
            return (
              <Reveal key={c.slug} delay={(i % 4) * 0.05} className={spans[c.slug] ?? ""}>
                <Link href={`/collections/${c.slug}`} className={`group relative flex h-full flex-col overflow-hidden rounded-3xl p-5 sm:p-6 ${th.tile}`}>
                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div>
                      <h3 className={`headline uppercase ${big ? "text-4xl sm:text-6xl" : "text-2xl sm:text-3xl"}`}>{c.name}</h3>
                      {c.tagline && <p className={`mt-1.5 max-w-[15rem] text-[13px] leading-snug opacity-80 ${big ? "sm:text-base" : ""}`}>{c.tagline}</p>}
                    </div>
                    <ArrowDot />
                  </div>
                  <div className={`pointer-events-none absolute transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-2 group-hover:rotate-[-4deg] group-hover:scale-105 ${big ? "-bottom-[6%] -right-[4%] w-[78%] sm:w-[70%]" : "-bottom-[16%] -right-[10%] w-[62%] sm:w-[58%]"}`}>
                    {show.byCollection[c.slug]?.[0] ? (
                      <div className="relative aspect-square overflow-hidden rounded-[1.4rem] shadow-[0_30px_60px_-25px_rgba(0,0,0,0.55)] ring-1 ring-black/5 rotate-[-5deg]">
                        <Image src={show.byCollection[c.slug][0]} alt={c.name} fill sizes="(min-width:1024px) 22vw, 50vw" className="object-cover" />
                      </div>
                    ) : c.slug === "futbol" ? (
                      <JerseyBack name="AFICIÓN" number="10" shirt="#ffffff" ink="#0f7a3d" trim="#e3051b" />
                    ) : (
                      <Mockup kind={th.kind} color={th.garment} slug={th.art} />
                    )}
                  </div>
                </Link>
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
  return (
    <section className="bg-bg pb-16 sm:pb-24">
      <Container>
        <Reveal>
          <p className="kicker text-accent">{t("fiestas.kicker")}</p>
          <h2 className="headline mt-3 text-[2.1rem] sm:text-5xl">{t("fiestas.title")}</h2>
        </Reveal>
        <div className="no-scrollbar -mx-4 mt-8 flex snap-x gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
          {list.map((f, i) => (
            <Reveal key={f.key} delay={i * 0.05} className="w-[78vw] shrink-0 snap-start sm:w-auto">
              <Link href={`/collections/${f.theme}`} className={`group flex h-full flex-col justify-between rounded-3xl border p-6 transition-colors ${i === 0 ? "border-accent bg-accent text-white" : "border-line hover:border-fg"}`}>
                <div className="flex items-start justify-between">
                  <p className={`kicker ${i === 0 ? "text-white/80" : "text-muted"}`}>{f.date.toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "UTC" })}</p>
                  <IconArrow className="h-4 w-4 -rotate-45 transition-transform group-hover:rotate-0" />
                </div>
                <p className="mega mt-8 text-7xl">{f.days === 0 ? "HOY" : f.days}</p>
                <p className={`text-sm font-semibold ${i === 0 ? "text-white/85" : "text-muted"}`}>{f.days === 0 ? t("fiestas.today") : t("fiestas.days", { n: f.days })}</p>
                <div className={`mt-6 border-t pt-4 ${i === 0 ? "border-white/25" : "border-line"}`}>
                  <p className="headline text-xl">{f.name}</p>
                  <p className={`text-[13px] ${i === 0 ? "text-white/75" : "text-muted"}`}>{f.place}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

export async function PersonalizeTeaser() {
  const [t, show, site] = await Promise.all([getT(), getShowcase(), listSiteImages()]);
  const photo = site["campaign-garcia"];
  const pueblo = show.byCollection["mi-pueblo"]?.[0] ?? show.byType.POSTER ?? null;
  return (
    <section className="bg-bg pb-16 sm:pb-24">
      <Container>
        <Reveal>
          <div className="relative grid overflow-hidden rounded-[2rem] bg-fg text-bg lg:grid-cols-2">
            <div className="relative z-10 flex flex-col justify-center p-8 sm:p-14">
              <p className="kicker text-gold">{t("perso.kicker")}</p>
              <h2 className="mega mt-4 text-6xl sm:text-8xl">{t("perso.title")}</h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-bg/75">{t("perso.body")}</p>
              <div className="mt-8 flex flex-wrap gap-2">
                {[t("perso.opt.jersey"), t("perso.opt.pueblo"), t("perso.opt.city"), t("perso.opt.year")].map((o) => (
                  <span key={o} className="rounded-full border border-bg/20 px-3.5 py-1.5 text-[13px] font-medium">
                    {o}
                  </span>
                ))}
              </div>
              <Link href="/personaliza" className="btn btn-primary mt-9 w-fit px-8 py-4 text-[15px]">
                {t("perso.cta")} <IconArrow className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative flex min-h-[380px] items-center justify-center bg-accent p-8">
              {photo && <Image src={photo} alt={t("perso.title")} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />}
              <div className="grain-soft absolute inset-0" />
              <div className={`floaty relative w-[78%] max-w-[440px] ${photo ? "hidden" : ""}`}>
                {show.jersey ? (
                  <div className="relative aspect-square overflow-hidden rounded-[1.6rem] shadow-2xl">
                    <Image src={show.jersey} alt={t("perso.title")} fill sizes="(min-width:1024px) 30vw, 70vw" className="object-cover" />
                  </div>
                ) : (
                  <JerseyBack name="TU NOMBRE" number="7" shirt="#ffffff" ink="#e3051b" trim="#ffc400" />
                )}
              </div>
              <div className="floaty-slow absolute bottom-6 left-6 w-[30%] max-w-[170px] rotate-[-8deg] rounded-2xl bg-white p-2 shadow-2xl">
                {pueblo ? (
                  <div className="relative aspect-square overflow-hidden rounded-xl">
                    <Image src={pueblo} alt="" fill sizes="170px" className="object-cover" />
                  </div>
                ) : (
                  <Mockup kind="poster" slug="mi-pueblo" />
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/** Digital membership card (also used in /club and the account page). */
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
            <p className="kicker text-accent">{t("club.kicker")}</p>
            <h2 className="headline mt-3 text-[2.4rem] sm:text-6xl">{t("club.title")}</h2>
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

export async function CollectionsBento({ collections, counts }: { collections: PublicCollection[]; counts: Record<string, number> }) {
  const [t, show] = await Promise.all([getT(), getShowcase()]);
  const list = collections.slice(0, 3);
  return (
    <section className="bg-bg py-16 sm:py-24">
      <Container>
        <SectionHead eyebrow={t("cols.eyebrow")} title={t("cols.title")} sub={t("home.collections.sub")} />
        <div className="grid gap-3 lg:grid-cols-3">
          {list.map((c, i) => {
            const th = themeFor(c.slug);
            return (
              <Reveal key={c.slug} delay={i * 0.06}>
                <Link href={`/collections/${c.slug}`} className={`group relative flex min-h-[480px] flex-col overflow-hidden rounded-[2rem] p-7 sm:p-9 ${th.tile}`}>
                  <div className="relative z-10 flex items-start justify-between">
                    <p className="kicker opacity-75">{counts[c.slug] ? t("collections.pieces", { n: counts[c.slug] }) : t("collections.soon")}</p>
                    <ArrowDot />
                  </div>
                  <h3 className="mega relative z-10 mt-4 text-6xl sm:text-7xl">{c.name}</h3>
                  {c.tagline && <p className="relative z-10 mt-3 max-w-xs text-[15px] opacity-85">{c.tagline}</p>}
                  <div className="pointer-events-none absolute -bottom-[8%] left-1/2 w-[78%] -translate-x-1/2 transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-3 group-hover:scale-105">
                    {c.heroImage || show.byCollection[c.slug]?.[0] ? (
                      <div className="relative aspect-square overflow-hidden rounded-[1.6rem] shadow-[0_30px_60px_-25px_rgba(0,0,0,0.55)]">
                        <Image src={(c.heroImage || show.byCollection[c.slug][0])!} alt={c.name} fill sizes="(min-width:1024px) 26vw, 80vw" className="object-cover" />
                      </div>
                    ) : (
                      <Mockup kind={th.kind} color={th.garment} slug={th.art} />
                    )}
                  </div>
                </Link>
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
            <p className="kicker text-accent">{t("promise.eyebrow")}</p>
            <h2 className="headline mt-3 text-[2.4rem] sm:text-6xl">{t("promise.title")}</h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">{t("promise.body")}</p>
            <Link href="/about" className="btn btn-ghost mt-8">
              {t("home.story.cta")} <IconArrow className="h-4 w-4" />
            </Link>
          </Reveal>
          <div className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-3">
            {items.map(([title, body], i) => (
              <Reveal key={title} delay={i * 0.06} className="bg-bg p-7">
                <p className="mega text-7xl text-accent">{String(i + 1).padStart(2, "0")}</p>
                <p className="headline mt-6 text-xl">{title}</p>
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
                <Image src={x.src} alt={x.label} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105" />
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
