import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getCollections, getPublishedProducts, type PublicProduct } from "@/lib/products/queries";
import { getLocale, getT } from "@/lib/i18n/server";
import { ProductCard } from "@/components/product/ProductCard";
import { Container, PageHero, SectionHead } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { IconArrow } from "@/components/ui/Icons";

export const metadata: Metadata = { title: "Tienda", description: "Camisetas, sudaderas, gorras, tazas, bolsas, láminas y regalos con diseños originales de identidad española. Fabricado bajo pedido en Europa.", alternates: { canonical: "/shop" } };
export const revalidate = 120;

const CATEGORIES = ["APPAREL", "HEADWEAR", "KIDS", "DRINKWARE", "BAGS", "WALL_ART", "HOME_LIVING", "TECH_ACCESSORIES", "STATIONERY", "PETS"] as const;
const SORTS = ["featured", "new", "priceAsc", "priceDesc"] as const;
type Sort = (typeof SORTS)[number];
const PAGE = 24;

/** Product types in display order, with shop labels (es / en). */
const TYPES: [string, string, string][] = [
  ["TSHIRT", "Camisetas", "T-shirts"],
  ["HOODIE", "Sudaderas con capucha", "Hoodies"],
  ["SWEATSHIRT", "Sudaderas", "Sweatshirts"],
  ["KIDS_TSHIRT", "Infantil", "Kids"],
  ["CAP", "Gorras", "Caps"],
  ["BEANIE", "Gorros", "Beanies"],
  ["APRON", "Delantales", "Aprons"],
  ["BANDANA", "Bandanas", "Bandanas"],
  ["MUG", "Tazas", "Mugs"],
  ["GLASS", "Vasos", "Glasses"],
  ["TUMBLER", "Termos", "Tumblers"],
  ["TOTE", "Bolsas", "Tote bags"],
  ["POSTER", "Pósters", "Posters"],
  ["FRAMED_PRINT", "Láminas enmarcadas", "Framed prints"],
  ["CANVAS", "Lienzos", "Canvas"],
  ["PILLOW", "Cojines", "Pillows"],
  ["BLANKET", "Mantas", "Blankets"],
  ["BEACH_TOWEL", "Toallas", "Towels"],
  ["FLAG", "Banderas", "Flags"],
  ["COASTER", "Posavasos", "Coasters"],
  ["PHONE_CASE", "Fundas", "Phone cases"],
  ["STICKER", "Pegatinas", "Stickers"],
  ["PATCH", "Parches", "Patches"],
  ["POSTCARD", "Postales", "Postcards"],
  ["CALENDAR", "Calendarios", "Calendars"],
];
const typeLabel = (code: string, en: boolean) => TYPES.find((x) => x[0] === code)?.[en ? 2 : 1] ?? code;

const minPrice = (p: PublicProduct) => Math.min(p.price, ...p.variants.map((v) => v.price));
const score = (p: PublicProduct) => (p.tags.includes("arte") ? 8 : 0) + (p.featured ? 6 : 0) + (p.tags.includes("lookbook") ? 5 : 0) + (p.tags.includes("bestseller") ? 3 : 0) + (p.categoryCode === "APPAREL" ? 1 : 0);

function sortProducts(list: PublicProduct[], sort: Sort) {
  const l = [...list];
  if (sort === "priceAsc") return l.sort((a, b) => minPrice(a) - minPrice(b));
  if (sort === "priceDesc") return l.sort((a, b) => minPrice(b) - minPrice(a));
  if (sort === "new") return l.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  return l.sort((a, b) => score(b) - score(a) || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

/** Spread designs out: never two pieces of the same design next to each other on the first pages. */
function interleave(list: PublicProduct[]) {
  const groups = new Map<string, PublicProduct[]>();
  for (const p of list) {
    const k = p.design ?? p.id;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(p);
  }
  const out: PublicProduct[] = [];
  const queues = [...groups.values()];
  for (let round = 0; out.length < list.length; round++) for (const q of queues) if (q[round]) out.push(q[round]);
  return out;
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ c?: string; q?: string; col?: string; sort?: string; p?: string; t?: string; page?: string; all?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80).toLowerCase();
  const [t, locale, all, collections] = await Promise.all([getT(), getLocale(), getPublishedProducts({ limit: 1500 }), getCollections()]);
  const en = locale === "en";
  const category = CATEGORIES.find((code) => code === sp.c);
  const sort: Sort = SORTS.find((s) => s === sp.sort) ?? "featured";
  const onlyPerso = sp.p === "1";
  const colSlug = sp.col && collections.some((c) => c.slug === sp.col) ? sp.col : undefined;
  const type = TYPES.some((x) => x[0] === sp.t) ? sp.t : undefined;
  const page = Math.max(1, Math.min(50, Number(sp.page) || 1));
  const filtered = Boolean(category || colSlug || q || onlyPerso || type);
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  const present = new Set(all.map((p) => p.categoryCode));

  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { c: category, col: colSlug, t: type, sort: sort === "featured" ? undefined : sort, q: sp.q, p: onlyPerso ? "1" : undefined, all: sp.all, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/shop?${s}` : "/shop";
  };
  const chip = (active: boolean) => `shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${active ? "border-fg bg-fg text-bg" : "border-line bg-surface hover:border-fg/40"}`;

  const CategoryNav = (
    <div className="sticky top-[calc(env(safe-area-inset-top)+64px)] z-20 border-b border-line bg-surface/90 backdrop-blur-xl">
      <Container>
        <nav className="no-scrollbar flex gap-2 overflow-x-auto py-3">
          <Link href="/shop" className={chip(!category && !onlyPerso)}>
            {t("shop.all")}
          </Link>
          {CATEGORIES.filter((code) => present.has(code) || code === category).map((code) => (
            <Link key={code} href={`/shop?c=${code}`} className={chip(category === code)}>
              {t(`shop.cat.${code}` as never)}
            </Link>
          ))}
          <Link href="/shop?p=1" className={chip(onlyPerso)}>
            ✦ {t("shop.personalize")}
          </Link>
        </nav>
      </Container>
    </div>
  );

  /* ───────────── landing: categories, highlights, collections — not hundreds of cards at once ───────────── */
  if (!filtered && !sp.all) {
    const cats = CATEGORIES.map((code) => {
      const items = all.filter((p) => p.categoryCode === code);
      const cover = sortProducts(items, "featured").find((p) => p.images[0])?.images[0]?.url ?? null;
      const types = [...new Set(items.map((p) => p.productType))].sort((a, b) => TYPES.findIndex((x) => x[0] === a) - TYPES.findIndex((x) => x[0] === b));
      return { code, count: items.length, cover, types };
    }).filter((c) => c.count);
    const picks = interleave(sortProducts(all, "featured")).filter((p, i, arr) => arr.findIndex((x) => x.design === p.design) === i).slice(0, 8);
    const cols = collections
      .map((c) => ({ c, items: all.filter((p) => p.collection?.slug === c.slug) }))
      .filter((x) => x.items.length)
      .sort((a, b) => b.items.length - a.items.length);

    return (
      <>
        <PageHero eyebrow={t("shop.count", { n: all.length })} title={t("shop.title")} sub={en ? "Choose a category or a collection — everything is made to order in Europe." : "Elige una categoría o una colección: todo se fabrica bajo pedido en Europa."} />
        <section className="bg-bg pb-24">
          {CategoryNav}
          <Container className="pt-10">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {cats.map((c, i) => (
                <Reveal key={c.code} delay={(i % 5) * 0.04}>
                  <Link href={`/shop?c=${c.code}`} className="group block overflow-hidden rounded-[1.6rem] border border-line bg-surface transition-shadow hover:shadow-[0_22px_44px_-24px_rgba(0,0,0,0.45)]">
                    <div className="relative aspect-square overflow-hidden bg-[#f3f1ee]">
                      {c.cover && <Image src={c.cover} alt={t(`shop.cat.${c.code}` as never)} fill sizes="(min-width:1024px) 20vw, 50vw" className="object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105" />}
                      <span className="absolute left-3 top-3 rounded-full bg-bg/90 px-2.5 py-1 text-[11px] font-bold text-accent">{c.count}</span>
                    </div>
                    <div className="p-4">
                      <p className="headline text-xl leading-tight">{t(`shop.cat.${c.code}` as never)}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-muted">{c.types.map((x) => typeLabel(x, en)).join(" · ")}</p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>

            {picks.length > 0 && (
              <div className="mt-20">
                <SectionHead
                  eyebrow={en ? "Selection" : "Selección"}
                  title={en ? "Our favourites" : "Nuestros favoritos"}
                  action={
                    <Link href="/shop?all=1" className="btn btn-ghost">
                      {en ? `See all ${all.length}` : `Ver los ${all.length}`} <IconArrow className="h-4 w-4" />
                    </Link>
                  }
                />
                <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
                  {picks.map((p, i) => (
                    <Reveal key={p.id} delay={(i % 4) * 0.05}>
                      <ProductCard p={p} labels={labels} />
                    </Reveal>
                  ))}
                </div>
              </div>
            )}

            {cols.length > 0 && (
              <div className="mt-20">
                <SectionHead eyebrow={t("nav.collections")} title={en ? "Shop by collection" : "Compra por colección"} />
                <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
                  {cols.map(({ c, items }) => {
                    const cover = sortProducts(items, "featured").find((p) => p.images[0])?.images[0]?.url;
                    return (
                      <Link key={c.slug} href={`/collections/${c.slug}`} className="group relative block aspect-[4/5] w-[62vw] shrink-0 snap-start overflow-hidden rounded-[1.6rem] bg-[#0b0b0b] text-white sm:w-auto">
                        {cover && <Image src={cover} alt={c.name} fill sizes="(min-width:1024px) 25vw, 60vw" className="object-cover opacity-90 transition-transform duration-700 group-hover:scale-105" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#e0b84a]">{items.length} {en ? "items" : "piezas"}</p>
                          <p className="headline mt-1 text-2xl uppercase">{c.name}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </Container>
        </section>
      </>
    );
  }

  /* ───────────── listing: filtered, design-interleaved, paginated ───────────── */
  let products = all;
  if (category) products = products.filter((p) => p.categoryCode === category);
  if (colSlug) products = products.filter((p) => p.collection?.slug === colSlug);
  if (onlyPerso) products = products.filter((p) => p.personalization);
  if (q) products = products.filter((p) => [p.name, p.shortDescription, p.collection?.name, ...p.tags].filter(Boolean).join(" ").toLowerCase().includes(q));
  const typesHere = [...new Set(products.map((p) => p.productType))].sort((a, b) => TYPES.findIndex((x) => x[0] === a) - TYPES.findIndex((x) => x[0] === b));
  if (type) products = products.filter((p) => p.productType === type);
  products = sortProducts(products, sort);
  if (sort === "featured") products = interleave(products);
  const shown = products.slice(0, page * PAGE);
  const presentCols = collections.filter((c) => all.some((p) => p.collection?.slug === c.slug && (!category || p.categoryCode === category)));
  const title = q ? `“${sp.q?.trim()}”` : type ? typeLabel(type, en) : category ? t(`shop.cat.${category}` as never) : onlyPerso ? t("shop.personalize") : t("shop.title");

  return (
    <>
      <PageHero eyebrow={t("shop.count", { n: products.length })} title={title} />
      <section className="bg-bg pb-24">
        {CategoryNav}
        <Container className="pt-6">
          {typesHere.length > 1 && (
            <nav className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              <Link href={href({ t: undefined, page: undefined })} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${!type ? "bg-accent text-white" : "bg-surface-2 hover:bg-line"}`}>
                {en ? "All types" : "Todos los tipos"}
              </Link>
              {typesHere.map((x) => (
                <Link key={x} href={href({ t: x, page: undefined })} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${type === x ? "bg-accent text-white" : "bg-surface-2 hover:bg-line"}`}>
                  {typeLabel(x, en)}
                </Link>
              ))}
            </nav>
          )}
          <form action="/shop" className="flex flex-wrap items-center gap-3">
            {category && <input type="hidden" name="c" value={category} />}
            {type && <input type="hidden" name="t" value={type} />}
            {onlyPerso && <input type="hidden" name="p" value="1" />}
            {sp.q && <input type="hidden" name="q" value={sp.q} />}
            {sp.all && <input type="hidden" name="all" value="1" />}
            <label className="flex items-center gap-2 text-sm text-muted">
              {t("shop.filter.collection")}
              <select name="col" defaultValue={colSlug ?? ""} className="field !w-auto !py-2 text-sm text-fg">
                <option value="">{t("shop.filter.all")}</option>
                {presentCols.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              {t("shop.sort")}
              <select name="sort" defaultValue={sort} className="field !w-auto !py-2 text-sm text-fg">
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {t(`shop.sort.${s}` as never)}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-ink !px-5 !py-2 text-sm">OK</button>
            {filtered && (
              <Link href="/shop" className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
                {t("shop.clear")}
              </Link>
            )}
          </form>
        </Container>
        <Container className="pt-8">
          {shown.length ? (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 lg:grid-cols-4">
                {shown.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 4) * 0.05}>
                    <ProductCard p={p} labels={labels} />
                  </Reveal>
                ))}
              </div>
              <div className="mt-14 flex flex-col items-center gap-3">
                <p className="text-sm text-muted">
                  {en ? `Showing ${shown.length} of ${products.length}` : `Mostrando ${shown.length} de ${products.length}`}
                </p>
                {shown.length < products.length && (
                  <Link href={href({ page: String(page + 1) })} scroll={false} className="btn btn-ink px-8">
                    {en ? "Show more" : "Ver más"}
                  </Link>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-3xl bg-surface p-6 sm:p-10">
              <p className="headline text-3xl">{t("shop.noResults")}</p>
              <Link href="/shop" className="btn btn-primary mt-8">
                {t("shop.clear")}
              </Link>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
