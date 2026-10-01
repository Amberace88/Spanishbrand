import Link from "next/link";
import Image from "next/image";
import { getT } from "@/lib/i18n/server";
import type { PublicCollection } from "@/lib/products/queries";
import { Mockup, type MockupKind } from "@/components/art/Mockup";
import { Reveal } from "@/components/ui/Reveal";
import { Container, SectionHead } from "@/components/ui/Section";
import { IconArrow, IconChat, IconLeaf, IconLock, IconPin, IconReturn, IconTruck } from "@/components/ui/Icons";
import { Newsletter } from "@/components/home/Newsletter";

export async function TrustBar() {
  const t = await getT();
  const items = [
    [IconTruck, t("trust.shipping.t"), t("trust.shipping.b"), "/shipping"],
    [IconReturn, t("trust.returns.t"), t("trust.returns.b"), "/returns"],
    [IconLock, t("trust.secure.t"), t("trust.secure.b"), "/terms"],
    [IconLeaf, t("trust.made.t"), t("trust.made.b"), "/about"],
  ] as const;
  return (
    <section className="border-y border-ink/[0.07] bg-white">
      <Container>
        <ul className="grid grid-cols-2 divide-ink/[0.07] lg:grid-cols-4 lg:divide-x">
          {items.map(([Icon, title, body, href]) => (
            <li key={title}>
              <Link href={href} className="group flex items-start gap-3 px-1 py-5 sm:gap-4 sm:px-6 sm:py-7">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-rojo transition-colors group-hover:bg-rojo group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold sm:text-[15px]">{title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-stone-2 sm:text-[13px]">{body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

const CATEGORY_TILES: { key: string; cat: string; kind: MockupKind; bg: string; color: string; slug: string }[] = [
  { key: "cats.TEES", cat: "APPAREL", kind: "tee", bg: "bg-rojo-50", color: "#fffcf7", slug: "espana" },
  { key: "cats.HOODIES", cat: "APPAREL", kind: "hoodie", bg: "bg-azul-50", color: "#1d3f7a", slug: "mediterraneo" },
  { key: "cats.HEADWEAR", cat: "HEADWEAR", kind: "cap", bg: "bg-oro-50", color: "#c8102e", slug: "espana" },
  { key: "cats.DRINKWARE", cat: "DRINKWARE", kind: "mug", bg: "bg-cream", color: "#fffcf7", slug: "heritage" },
  { key: "cats.WALL_ART", cat: "WALL_ART", kind: "poster", bg: "bg-terra-50", color: "#fffcf7", slug: "motor" },
  { key: "cats.BAGS", cat: "BAGS", kind: "tote", bg: "bg-oliva-50", color: "#efe4cf", slug: "mediterraneo" },
];

export async function CategoryGrid() {
  const t = await getT();
  return (
    <section className="bg-warm py-16 sm:py-24">
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
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-6">
          {CATEGORY_TILES.map((c, i) => (
            <Reveal key={c.key} delay={i * 0.05}>
              <Link href={`/shop?c=${c.cat}`} className={`group block overflow-hidden rounded-3xl ${c.bg} p-4 transition-shadow duration-300 hover:shadow-[0_18px_40px_-20px_rgba(28,23,18,0.35)] sm:p-5`}>
                <div className="transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-1.5 group-hover:scale-[1.03]">
                  <Mockup kind={c.kind} color={c.color} slug={c.slug} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[15px] font-bold leading-tight sm:text-base">{t(c.key as never)}</span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-ink transition-colors group-hover:bg-rojo group-hover:text-white">
                    <IconArrow className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

const KIND_BY_COLLECTION: Record<string, { kind: MockupKind; color: string; bg: string }> = {
  espana: { kind: "tee", color: "#fffcf7", bg: "bg-rojo-50" },
  heritage: { kind: "hoodie", color: "#efe4cf", bg: "bg-oro-50" },
  mediterraneo: { kind: "tote", color: "#fffcf7", bg: "bg-azul-50" },
  motor: { kind: "tee", color: "#2a231c", bg: "bg-cream" },
};

/** Honest pre-launch grid: collection previews (not products), each linking to its collection. */
export async function ComingSoonGrid({ collections }: { collections: PublicCollection[] }) {
  const t = await getT();
  return (
    <section className="bg-white py-16 sm:py-24">
      <Container>
        <SectionHead eyebrow={t("soon.eyebrow")} title={t("soon.title")} sub={t("soon.body")} />
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
          {collections.slice(0, 4).map((c, i) => {
            const k = KIND_BY_COLLECTION[c.slug] ?? { kind: "tee" as MockupKind, color: "#fffcf7", bg: "bg-cream" };
            return (
              <Reveal key={c.slug} delay={i * 0.06}>
                <Link href={`/collections/${c.slug}`} className="group block">
                  <div className={`relative overflow-hidden rounded-3xl ${k.bg} p-6 sm:p-8`}>
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-rojo shadow-sm">{t("soon.badge")}</span>
                    <div className="transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.05]">
                      <Mockup kind={k.kind} color={k.color} slug={c.slug} />
                    </div>
                  </div>
                  <p className="eyebrow mt-4 text-[0.65rem] text-stone">{c.name}</p>
                  <p className="mt-1 font-semibold leading-snug">{c.tagline}</p>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-rojo">
                    {t("cols.cta")} <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </p>
                </Link>
              </Reveal>
            );
          })}
        </div>
        <Reveal>
          <div className="mt-12 grid gap-6 rounded-3xl bg-cream p-6 sm:p-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <p className="headline text-2xl sm:text-3xl">{t("newsletter.title")}</p>
            <Newsletter source="coming-soon" />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export async function CollectionsLight({ collections, counts }: { collections: PublicCollection[]; counts: Record<string, number> }) {
  const t = await getT();
  const list = collections.slice(0, 4);
  const tones = ["bg-rojo text-white", "bg-oro-2 text-ink", "bg-azul text-white", "bg-ink text-white"];
  return (
    <section className="bg-warm py-16 sm:py-24">
      <Container>
        <SectionHead eyebrow={t("cols.eyebrow")} title={t("cols.title")} sub={t("home.collections.sub")} />
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          {list.map((c, i) => (
            <Reveal key={c.slug} delay={i * 0.06}>
              <Link href={`/collections/${c.slug}`} className={`group relative flex min-h-[300px] overflow-hidden rounded-[2rem] sm:min-h-[360px] ${tones[i % tones.length]}`}>
                <div className="relative z-10 flex max-w-[58%] flex-col justify-between p-7 sm:p-9">
                  <div>
                    <p className="eyebrow text-[0.65rem] opacity-75">{counts[c.slug] ? t("collections.pieces", { n: counts[c.slug] }) : t("collections.soon")}</p>
                    <h3 className="headline mt-3 text-4xl sm:text-5xl">{c.name}</h3>
                    {c.tagline && <p className="serif mt-3 text-xl italic leading-snug opacity-90 sm:text-2xl">{c.tagline}</p>}
                  </div>
                  <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-transform group-hover:translate-x-1">
                    {t("cols.cta")} <IconArrow className="h-4 w-4" />
                  </span>
                </div>
                <div className="absolute -right-6 bottom-0 top-0 w-[52%]">
                  {c.heroImage ? (
                    <Image src={c.heroImage} alt={c.name} fill sizes="(min-width:640px) 25vw, 50vw" className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-rotate-3 group-hover:scale-105">
                        <Mockup kind={(KIND_BY_COLLECTION[c.slug] ?? { kind: "tee" }).kind} color={c.slug === "motor" ? "#fffcf7" : "#fffcf7"} slug={c.slug} />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

export async function BrandPromise() {
  const t = await getT();
  const items = [
    [IconPin, t("promise.a.t"), t("promise.a.b")],
    [IconLeaf, t("promise.b.t"), t("promise.b.b")],
    [IconChat, t("promise.c.t"), t("promise.c.b")],
  ] as const;
  return (
    <section className="bg-white py-16 sm:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <Reveal className="relative aspect-[5/4] overflow-hidden rounded-[2rem]">
            <div className="azulejo absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center gap-4 p-[8%] sm:gap-6">
              <div className="flex aspect-square w-[44%] items-center rounded-3xl bg-white/95 p-3 shadow-[0_24px_48px_-24px_rgba(28,23,18,0.45)]">
                <Mockup kind="poster" slug="heritage" className="w-full" />
              </div>
              <div className="flex aspect-square w-[44%] translate-y-8 items-center rounded-3xl bg-white/95 p-3 shadow-[0_24px_48px_-24px_rgba(28,23,18,0.45)]">
                <Mockup kind="hoodie" color="#c8102e" slug="espana" className="w-full" />
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="eyebrow text-rojo">{t("promise.eyebrow")}</p>
            <h2 className="headline mt-3 text-[2.1rem] sm:text-5xl">{t("promise.title")}</h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-2">{t("promise.body")}</p>
            <ul className="mt-8 space-y-5">
              {items.map(([Icon, title, body]) => (
                <li key={title} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-oro-50 text-oro">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-bold">{title}</span>
                    <span className="mt-0.5 block text-[15px] leading-relaxed text-stone-2">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/about" className="btn btn-ink mt-9">
              {t("home.story.cta")} <IconArrow className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
