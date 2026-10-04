import { siteArtSrc } from "@/lib/catalog/art-series";
import { listSiteImages } from "@/lib/site-images";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getCollections, getPublishedProducts, type PublicProduct } from "@/lib/products/queries";
import { getLocale, getT } from "@/lib/i18n/server";
import { ProductCard } from "@/components/product/ProductCard";
import { Container, SectionHead } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { IconArrow, IconClose } from "@/components/ui/Icons";
import { EditorialTile, type TileSize } from "@/components/merch/EditorialTile";
import { FilterDrawer, type FilterGroup } from "@/components/shop/FilterDrawer";
import { ChipRail } from "@/components/shop/ChipRail";
import { AUDIENCES, isAudience, isFor } from "@/lib/catalog/audience";
import { COLLECTION_THEMES, themeByKey } from "@/lib/catalog/themes";
import { merchandise, merchandiseUnique } from "@/lib/catalog/merch";
import { CATEGORY_LOOKS, lookFor } from "@/lib/catalog/tones";
import { tileCards, tileCount, tilePhoto, tileProducts } from "@/lib/catalog/tiles";
import { campaignPhoto } from "@/lib/campaign";

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
  ["WOMENS_TSHIRT", "Camisetas de mujer", "Women's T-shirts"],
  ["WOMENS_HOODIE", "Sudaderas cortas", "Crop hoodies"],
  ["WOMENS_SWEATSHIRT", "Sudaderas de mujer", "Women's sweatshirts"],
  ["KIDS_HOODIE", "Sudaderas infantiles", "Kids' hoodies"],
  ["TODDLER_TSHIRT", "Peques (2–5 años)", "Toddler (2–5)"],
  ["BABY_BODYSUIT", "Bodies de bebé", "Baby bodysuits"],
  ["CAP", "Gorras", "Caps"],
  ["BEANIE", "Gorros", "Beanies"],
  ["BUCKET_HAT", "Gorros de pescador", "Bucket hats"],
  ["SOCKS", "Calcetines", "Socks"],
  ["APRON", "Delantales", "Aprons"],
  ["BANDANA", "Bandanas", "Bandanas"],
  ["MUG", "Tazas", "Mugs"],
  ["GLASS", "Vasos", "Glasses"],
  ["TUMBLER", "Termos", "Tumblers"],
  ["WATER_BOTTLE", "Botellas", "Bottles"],
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

/** Editorial line under each category / type title (es, en). */
const COPY: Record<string, [string, string]> = {
  APPAREL: ["Algodón pesado, corte cómodo y el diseño a lo grande: el león, el arte de autor y el refranero.", "Heavy cotton, an easy fit and the design printed big: the lion, author art and Spanish sayings."],
  TSHIRT: ["La camiseta de la casa: algodón peinado, corte unisex y estampación a gran tamaño que aguanta lavado tras lavado.", "The house tee: combed cotton, unisex cut and a big print that lasts wash after wash."],
  HOODIE: ["Felpa cálida por dentro y el diseño a lo grande por fuera. Para las tardes de grada y las noches de terraza.", "Warm fleece inside, the design big outside. For match days and terrace nights."],
  SWEATSHIRT: ["Sudaderas de cuello redondo con el arte de la casa, suaves y de corte relajado.", "Crew-neck sweatshirts with the house art, soft with a relaxed fit."],
  WOMENS_TSHIRT: ["Corte entallado, algodón suave y los diseños de la casa pensados para ella.", "Fitted cut, soft cotton and the house designs made for her."],
  HEADWEAR: ["Gorras y gorros bordados en hilo de oro y rojo: el león de la casa, puntada a puntada.", "Caps and beanies embroidered in gold and red thread: the house lion, stitch by stitch."],
  KIDS: ["Para los pequeños leones: algodón suave, tintas al agua y diseños que crecen con ellos.", "For little lions: soft cotton, water-based inks and designs they grow into."],
  DRINKWARE: ["Tazas, vasos y termos para el café de la mañana y la sobremesa que se alarga.", "Mugs, glasses and tumblers for the morning coffee and the long lunch."],
  BAGS: ["Bolsas de algodón resistente para el mercado, la playa y el día a día.", "Sturdy cotton totes for the market, the beach and every day."],
  WALL_ART: ["Láminas, pósters y lienzos con ilustración de autor, impresos en papel de museo.", "Prints, posters and canvases of author illustration on museum paper."],
  HOME_LIVING: ["Cojines, mantas y toallas: España también se lleva en casa.", "Pillows, blankets and towels: Spain at home too."],
};

const minPrice = (p: PublicProduct) => Math.min(p.price, ...p.variants.map((v) => v.price));

function sortProducts(list: PublicProduct[], sort: Sort) {
  const l = [...list];
  if (sort === "priceAsc") return l.sort((a, b) => minPrice(a) - minPrice(b));
  if (sort === "priceDesc") return l.sort((a, b) => minPrice(b) - minPrice(a));
  if (sort === "new") return l.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  // "featured": the merchandising engine (quality × diversity × hero colour) — lib/catalog/merch.ts
  return merchandise(l);
}

/** Category grid columns by tile count, so the last row is never a lone tile. */
const CAT_COLS: Record<number, string> = { 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6", 7: "lg:grid-cols-4", 8: "lg:grid-cols-4", 9: "lg:grid-cols-5", 10: "lg:grid-cols-5" };
const SPAN: Record<string, string> = { hero: "col-span-2 row-span-2", tall: "row-span-2", sq: "", wide: "col-span-2", banner: "col-span-2 lg:col-span-4" };
const BENTO: Record<number, string[]> = {
  8: ["hero", "tall", "sq", "sq", "wide", "sq", "sq", "banner"],
  7: ["hero", "tall", "sq", "sq", "wide", "sq", "sq"],
  6: ["hero", "tall", "sq", "sq", "wide", "wide"],
  5: ["hero", "sq", "sq", "sq", "sq"],
  4: ["hero", "tall", "sq", "sq"],
  3: ["hero", "wide", "wide"],
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ c?: string; q?: string; col?: string; sort?: string; p?: string; t?: string; page?: string; all?: string; a?: string; tema?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80).toLowerCase();
  const [t, locale, all, collections, site] = await Promise.all([getT(), getLocale(), getPublishedProducts({ limit: 5000 }), getCollections(), listSiteImages()]);
  const en = locale === "en";
  const category = CATEGORIES.find((code) => code === sp.c);
  const sort: Sort = SORTS.find((s) => s === sp.sort) ?? "featured";
  const onlyPerso = sp.p === "1";
  const colSlug = sp.col && collections.some((c) => c.slug === sp.col) ? sp.col : undefined;
  const type = TYPES.some((x) => x[0] === sp.t) ? sp.t : undefined;
  const audience = isAudience(sp.a) ? sp.a : undefined;
  const theme = themeByKey(sp.tema);
  const lx = (l: { es: string; en: string; de: string }) => (locale === "en" ? l.en : locale === "de" ? l.de : l.es);
  const page = Math.max(1, Math.min(50, Number(sp.page) || 1));
  const filtered = Boolean(category || colSlug || q || onlyPerso || type || audience || theme);
  const labels = { madeToOrder: t("product.madeToOrder"), from: t("common.from"), limited: t("product.limitedTime") };
  const present = new Set(all.map((p) => p.categoryCode));

  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { c: category, col: colSlug, t: type, sort: sort === "featured" ? undefined : sort, q: sp.q, p: onlyPerso ? "1" : undefined, all: sp.all, a: audience, tema: theme?.key, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/shop?${s}` : "/shop";
  };
  const chip = (active: boolean) => `shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${active ? "border-fg bg-fg text-bg" : "border-line bg-surface hover:border-fg/40"}`;
  const categoryChips = (
    <>
      <Link href="/shop" className={chip(!category && !onlyPerso && !theme)} aria-current={!category && !onlyPerso && !theme ? "page" : undefined}>
        {t("shop.all")}
      </Link>
      {CATEGORIES.filter((code) => present.has(code) || code === category).map((code) => (
        <Link key={code} href={`/shop?c=${code}`} className={chip(category === code)} aria-current={category === code ? "page" : undefined}>
          {t(`shop.cat.${code}` as never)}
        </Link>
      ))}
      <Link href="/shop?p=1" className={chip(onlyPerso)}>
        ✦ {t("shop.personalize")}
      </Link>
    </>
  );

  /* ───────────── landing: themes, categories, audiences, highlights — not hundreds of cards at once ───────────── */
  if (!filtered && !sp.all) {
    const cats = CATEGORIES.map((code) => {
      const items = all.filter((p) => p.categoryCode === code);
      const types = [...new Set(items.map((p) => p.productType))].sort((a, b) => TYPES.findIndex((x) => x[0] === a) - TYPES.findIndex((x) => x[0] === b));
      return { code, items, types };
    }).filter((c) => c.items.length);
    const AUDIENCE_COVER: Record<string, string> = { mujer: "look-leon-mujer", hombre: "look-toro-hombre", ninos: "look-barca-nino" };
    const AUDIENCE_LOCAL: Record<string, string> = { ninos: "/lifestyle/kids-1.webp", bebes: "/lifestyle/kids-2.webp", abuelos: "/lifestyle/kids-4.webp" };
    const usedCovers = new Set<string>();
    const audienceTiles = AUDIENCES.map((x) => {
      const items = all.filter((p) => isFor(p, x));
      // fallback: the best product photo not already used by another audience tile
      const fallback = tileProducts(items, 4).map((p) => p.images[0]?.url).find((u) => u && !usedCovers.has(u)) ?? null;
      const cover = campaignPhoto(x) || (AUDIENCE_COVER[x] && site[AUDIENCE_COVER[x]]) || AUDIENCE_LOCAL[x] || fallback;
      if (cover) usedCovers.add(cover);
      return { a: x, count: items.length, cover };
    });
    // the house's curated lines as an editorial bento (only those with products)
    const themeTiles = COLLECTION_THEMES.map((th) => ({ th, items: all.filter(th.match) })).filter((x) => x.items.length > 0);
    const pattern = BENTO[themeTiles.length] ?? themeTiles.map(() => "wide");
    const picks = merchandiseUnique(all, 8);
    const cols = collections
      .map((c) => ({ c, items: all.filter((p) => p.collection?.slug === c.slug) }))
      .filter((x) => x.items.length)
      .sort((a, b) => b.items.length - a.items.length);

    return (
      <>
        <ShopHero eyebrow={t("shop.count", { n: all.length })} title={t("shop.title")} sub={en ? "Choose a line, a category or who it is for — everything is made to order in Europe." : "Elige una línea, una categoría o para quién: todo se fabrica bajo pedido en Europa."} />
        <section className="bg-bg pb-24">
          <StickyBar>{categoryChips}</StickyBar>
          <Container className="pt-10 sm:pt-14">
            {themeTiles.length > 0 && (
              <div>
                <SectionHead eyebrow={en ? "Collections" : "Colecciones"} title={en ? "The house lines" : "Las líneas de la casa"} />
                <div className="grid grid-flow-dense auto-rows-[190px] grid-cols-2 gap-3 sm:auto-rows-[240px] sm:gap-4 lg:auto-rows-[260px] lg:grid-cols-4">
                  {themeTiles.map(({ th, items }, i) => {
                    const look = lookFor(th.key);
                    const kind = pattern[i] ?? "sq";
                    return (
                      <Reveal key={th.key} delay={(i % 4) * 0.05} className={SPAN[kind]}>
                        <EditorialTile href={th.href} title={lx(th.label)} kicker={tileCount(items, en)} tagline={lx(th.sub)} cta={en ? "Explore" : "Descubrir"} tone={look.tone} texture={look.texture} word={look.word} photo={tilePhoto(look, site)} cards={tileCards(items, 3)} size={kind as TileSize} priority={i === 0} />
                      </Reveal>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-16 sm:mt-20">
              <SectionHead eyebrow={en ? "Categories" : "Categorías"} title={en ? "Find your piece" : "Encuentra tu pieza"} />
              <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 ${CAT_COLS[cats.length] ?? "lg:grid-cols-5"}`}>
                {cats.map((c, i) => {
                  const look = CATEGORY_LOOKS[c.code] ?? lookFor(c.code);
                  return (
                    <Reveal key={c.code} delay={(i % 5) * 0.04} className="aspect-[4/5]">
                      <EditorialTile href={`/shop?c=${c.code}`} title={t(`shop.cat.${c.code}` as never)} kicker={en ? `${c.items.length} items` : `${c.items.length} piezas`} tagline={c.types.slice(0, 3).map((x) => typeLabel(x, en)).join(" · ")} tone={look.tone} texture={look.texture} word={look.word} photo={tilePhoto(look, site)} cards={tileCards(c.items, 3)} size="card" sizes="(min-width:1024px) 20vw, 50vw" />
                    </Reveal>
                  );
                })}
              </div>
            </div>

            <div className="mt-16 sm:mt-20">
              <SectionHead eyebrow={t("audience.title")} title={en ? "For everyone at home" : "Para toda la casa"} />
              <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-4 sm:overflow-visible sm:px-0">
                {audienceTiles.map((x, i) => (
                  <Reveal key={x.a} delay={i * 0.04} className="w-[42vw] shrink-0 snap-start sm:w-auto">
                    <Link href={`/para/${x.a}`} className="group relative block aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-[#17130f] text-white">
                      {x.cover ? (
                        <Image src={x.cover} alt={t(`audience.${x.a}`)} fill sizes="(min-width:640px) 20vw, 42vw" className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src="/catalog/art/lion-crowned.png" alt="" className="absolute inset-0 m-auto h-1/2 w-1/2 object-contain opacity-80 transition-transform duration-700 group-hover:scale-110" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                        {x.count > 0 && <p className="kicker text-[#e0b84a]">{t("audience.count", { n: x.count })}</p>}
                        <p className="mega mt-1.5 flex items-center justify-between gap-2 text-2xl sm:text-3xl">
                          {t(`audience.${x.a}`)} <IconArrow className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
                        </p>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>

            <Link href="/arte" className="group mt-16 grid overflow-hidden rounded-[1.75rem] bg-[#f3ead7] text-[#1c1a17] sm:mt-20 sm:grid-cols-[1.1fr_1fr]">
              <div className="flex flex-col justify-center p-6 sm:p-10">
                <p className="kicker text-[#a3162b]">{en ? "New · Author illustration" : "Nuevo · Ilustración de autor"}</p>
                <p className="mega mt-3 text-[2.4rem] sm:text-6xl">{en ? "Wearable art" : "Arte que se lleva"}</p>
                <p className="serif mt-3 max-w-md text-lg italic text-[#1c1a17]/70 sm:text-xl">{en ? "Illustrations of Spain in five series, printed as large as the garment allows." : "Ilustraciones de España en cinco series, impresas tan grandes como permite la prenda."}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#a3162b]">
                  {en ? "See the series" : "Ver las series"} <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-4 sm:p-6" aria-hidden>
                {["toro", "flamenca", "faro", "paella", "fallas", "quijote"].map((k) => (
                  <Image key={k} src={siteArtSrc(`art-${k}`)} alt="" width={256} height={256} sizes="(min-width:1024px) 10vw, 30vw" className="aspect-square w-full object-contain transition-transform duration-700 group-hover:scale-105" />
                ))}
              </div>
            </Link>

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
                <ProductGrid products={picks} labels={labels} />
              </div>
            )}

            {cols.length > 0 && (
              <div className="mt-20">
                <SectionHead eyebrow={en ? "Themes" : "Temas"} title={en ? "Shop by theme" : "Compra por tema"} />
                <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
                  {cols.map(({ c, items }) => {
                    const look = lookFor(c.slug);
                    return (
                      <div key={c.slug} className="aspect-[4/5] w-[62vw] shrink-0 snap-start sm:w-auto">
                        <EditorialTile href={`/collections/${c.slug}`} title={c.name} kicker={tileCount(items, en)} tagline={c.tagline} tone={look.tone} texture={look.texture} word={look.word} photo={tilePhoto(look, site)} cards={tileCards(items, 3)} size="card" sizes="(min-width:1024px) 25vw, 62vw" />
                      </div>
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

  /* ───────────── listing: filtered, curated (merch engine), paginated ───────────── */
  let products = all;
  if (category) products = products.filter((p) => p.categoryCode === category);
  if (colSlug) products = products.filter((p) => p.collection?.slug === colSlug);
  if (onlyPerso) products = products.filter((p) => p.personalization);
  if (audience) products = products.filter((p) => isFor(p, audience));
  if (theme) products = products.filter(theme.match);
  if (q) products = products.filter((p) => [p.name, p.shortDescription, p.collection?.name, ...p.tags].filter(Boolean).join(" ").toLowerCase().includes(q));
  const beforeType = products;
  const typesHere = [...new Set(beforeType.map((p) => p.productType))].sort((a, b) => TYPES.findIndex((x) => x[0] === a) - TYPES.findIndex((x) => x[0] === b));
  if (type) products = products.filter((p) => p.productType === type);
  products = sortProducts(products, sort);
  const shown = products.slice(0, page * PAGE);
  const presentCols = collections.filter((c) => all.some((p) => p.collection?.slug === c.slug && (!category || p.categoryCode === category)));
  const title = q ? `“${sp.q?.trim()}”` : theme ? lx(theme.label) : type ? typeLabel(type, en) : category ? t(`shop.cat.${category}` as never) : onlyPerso ? t("shop.personalize") : audience ? t(`audience.${audience}.title`) : t("shop.title");
  const copyKey = type && COPY[type] ? type : category;
  const line = theme ? lx(theme.sub) : copyKey && COPY[copyKey] ? COPY[copyKey][en ? 1 : 0] : q ? (en ? "Search results across the whole shop." : "Resultados en toda la tienda.") : undefined;
  const lookKey = type === "HOODIE" || type === "SWEATSHIRT" ? "HOODIE" : type === "TSHIRT" || type === "WOMENS_TSHIRT" ? "TSHIRT" : category;
  const look = theme ? lookFor(theme.key) : (lookKey && CATEGORY_LOOKS[lookKey]) || lookFor("espana");

  // filter drawer: Para quién · tipo · colección · orden (all links, combinable)
  const groups: FilterGroup[] = [
    { title: t("audience.title"), options: [{ label: t("audience.all"), href: href({ a: undefined, page: undefined }), active: !audience }, ...AUDIENCES.map((x) => ({ label: t(`audience.${x}`), href: href({ a: x, page: undefined }), active: audience === x, count: beforeType.filter((p) => isFor(p, x)).length })).filter((o) => o.count || o.active)] },
    { title: en ? "Type" : "Tipo", options: [{ label: en ? "All types" : "Todos los tipos", href: href({ t: undefined, page: undefined }), active: !type }, ...typesHere.map((x) => ({ label: typeLabel(x, en), href: href({ t: x, page: undefined }), active: type === x, count: beforeType.filter((p) => p.productType === x).length }))] },
    { title: t("shop.filter.collection"), options: [{ label: t("shop.filter.all"), href: href({ col: undefined, page: undefined }), active: !colSlug }, ...presentCols.map((c) => ({ label: c.name, href: href({ col: c.slug, page: undefined }), active: colSlug === c.slug }))] },
    { title: t("shop.sort"), options: SORTS.map((s) => ({ label: t(`shop.sort.${s}` as never), href: href({ sort: s === "featured" ? undefined : s, page: undefined }), active: sort === s })) },
  ];
  // active filters as removable pills (the category itself lives in the chip row)
  const pills = [
    type && { label: typeLabel(type, en), href: href({ t: undefined, page: undefined }) },
    audience && { label: t(`audience.${audience}`), href: href({ a: undefined, page: undefined }) },
    colSlug && { label: collections.find((c) => c.slug === colSlug)?.name ?? colSlug, href: href({ col: undefined, page: undefined }) },
    theme && { label: lx(theme.label), href: href({ tema: undefined, page: undefined }) },
    q && { label: `“${sp.q?.trim()}”`, href: href({ q: undefined, page: undefined }) },
    sort !== "featured" && { label: t(`shop.sort.${sort}` as never), href: href({ sort: undefined, page: undefined }) },
  ].filter(Boolean) as { label: string; href: string }[];
  const drawerActive = [type, audience, colSlug, sort !== "featured" ? sort : undefined].filter(Boolean).length;
  const countLabel = t("shop.count", { n: products.length });
  const heroCards = tileCards(products, 3);
  const heroPhoto = tilePhoto(look, site);

  return (
    <>
      {/* category hero: editorial line + the line's imagery */}
      <section className="relative overflow-hidden border-b border-line bg-bg">
        <div className="azulejo-line pointer-events-none absolute inset-y-0 left-0 hidden w-[38%] opacity-[0.35] [mask-image:linear-gradient(to_right,black,transparent)] md:block" aria-hidden />
        <Container className="relative grid items-center gap-8 py-8 sm:py-12 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <Reveal>
            <nav className="text-sm text-muted" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-fg">{t("nav.home")}</Link> <span className="mx-1.5">/</span>
              <Link href="/shop" className="hover:text-fg">{t("nav.shop")}</Link>
              {category && (type || colSlug || audience) && (
                <>
                  <span className="mx-1.5">/</span>
                  <Link href={`/shop?c=${category}`} className="hover:text-fg">{t(`shop.cat.${category}` as never)}</Link>
                </>
              )}
            </nav>
            <p className="kicker mt-6 flex items-center gap-2 text-gold">
              <span className="flag-line inline-block h-[3px] w-6 rounded-full" />
              {countLabel}
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-logo)] text-[11vw] font-bold leading-[1] tracking-[0.01em] sm:text-7xl lg:text-[5.5rem]">{title}</h1>
            {line && <p className="serif mt-4 max-w-xl text-xl italic leading-snug text-muted sm:text-2xl">{line}</p>}
          </Reveal>
          {(heroCards.length > 0 || heroPhoto) && (
            <Reveal delay={0.08} className="hidden aspect-[16/10] w-full lg:block">
              <EditorialTile title="" tone={look.tone} texture={look.texture} word={look.word} photo={heroPhoto} cards={heroCards} size="stage" priority sizes="(min-width:1024px) 45vw, 100vw" />
            </Reveal>
          )}
        </Container>
      </section>

      <section id="productos" className="scroll-mt-24 bg-bg pb-24">
        <StickyBar
          end={
            <FilterDrawer
              groups={groups}
              label={en ? "Filters" : "Filtros"}
              title={en ? "Filter & sort" : "Filtrar y ordenar"}
              activeCount={drawerActive}
              resultLabel={en ? `Show ${products.length}` : `Ver ${products.length}`}
              clearHref={drawerActive ? href({ t: undefined, a: undefined, col: undefined, sort: undefined, page: undefined }) : undefined}
              clearLabel={t("shop.clear")}
            />
          }
        >
          {categoryChips}
        </StickyBar>
        <Container className="pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-2 text-sm font-semibold tabular-nums text-muted">{countLabel}</p>
            {pills.map((x) => (
              <Link key={x.href} href={x.href} scroll={false} className="group inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1.5 pl-3.5 pr-2 text-[13px] font-semibold hover:bg-line" aria-label={`${en ? "Remove" : "Quitar"} ${x.label}`}>
                {x.label}
                <span className="grid h-5 w-5 place-items-center rounded-full bg-bg/70 transition-colors group-hover:bg-fg group-hover:text-bg">
                  <IconClose className="h-3 w-3" />
                </span>
              </Link>
            ))}
            {pills.length > 1 && (
              <Link href={category ? `/shop?c=${category}` : "/shop"} className="ml-1 text-[13px] font-semibold text-accent underline-offset-4 hover:underline">
                {t("shop.clear")}
              </Link>
            )}
          </div>
          {/* quick type switch on the page itself when the category has several (the drawer holds the rest) */}
          {typesHere.length > 1 && (
            <nav className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={en ? "Type" : "Tipo"}>
              {typesHere.map((x) => (
                <Link key={x} href={href({ t: type === x ? undefined : x, page: undefined })} scroll={false} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${type === x ? "bg-accent text-white" : "bg-surface-2 hover:bg-line"}`} aria-current={type === x ? "true" : undefined}>
                  {typeLabel(x, en)}
                </Link>
              ))}
            </nav>
          )}
        </Container>
        <Container className="pt-8">
          {shown.length ? (
            <>
              <ProductGrid products={shown} labels={labels} />
              <div className="mt-14 flex flex-col items-center gap-4">
                <div className="h-1 w-48 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <div className="h-full rounded-full bg-fg" style={{ width: `${Math.round((shown.length / products.length) * 100)}%` }} />
                </div>
                <p className="text-sm text-muted">{en ? `Showing ${shown.length} of ${products.length}` : `Mostrando ${shown.length} de ${products.length}`}</p>
                {shown.length < products.length && (
                  <Link href={href({ page: String(page + 1) })} scroll={false} className="btn btn-ink px-8">
                    {en ? "Show more" : "Ver más"}
                  </Link>
                )}
              </div>
            </>
          ) : (
            <EmptyState en={en} title={t("shop.noResults")} clear={category ? `/shop?c=${category}` : "/shop"} clearLabel={t("shop.clear")} suggestions={merchandiseUnique(category ? all.filter((p) => p.categoryCode === category) : all, 4)} labels={labels} />
          )}
        </Container>
      </section>
    </>
  );
}

/** Shop landing header (same rhythm as PageHero, with the brand pattern). */
function ShopHero({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-bg">
      <div className="azulejo-line pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] opacity-[0.5] [mask-image:linear-gradient(to_left,black,transparent)] md:block" aria-hidden />
      <Container className="relative py-10 sm:py-16">
        <Reveal>
          <p className="kicker flex items-center gap-2 text-gold">
            <span className="flag-line inline-block h-[3px] w-6 rounded-full" />
            {eyebrow}
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-logo)] text-[13vw] font-bold leading-[1] tracking-[0.01em] sm:text-7xl lg:text-[6rem]">{title}</h1>
          <p className="serif mt-4 max-w-2xl text-xl italic leading-snug text-muted sm:text-2xl">{sub}</p>
        </Reveal>
      </Container>
    </section>
  );
}

/** Compact sticky filter row under the header: category chips (scrolling) + an end slot (Filtros). */
function StickyBar({ children, end }: { children: React.ReactNode; end?: React.ReactNode }) {
  return (
    <div className="sticky top-[calc(env(safe-area-inset-top)+64px)] z-30 border-b border-line bg-bg/85 backdrop-blur-xl">
      <Container>
        <div className="flex items-center gap-3 py-2.5">
          <ChipRail className="no-scrollbar -ml-1 flex min-w-0 flex-1 gap-2 overflow-x-auto py-0.5 pl-1 [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)]">{children}</ChipRail>
          {end}
        </div>
      </Container>
    </div>
  );
}

function ProductGrid({ products, labels }: { products: PublicProduct[]; labels: { madeToOrder: string; from: string; limited: string } }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-4">
      {products.map((p, i) => (
        <Reveal key={p.id} delay={(i % 4) * 0.05}>
          <ProductCard p={p} labels={labels} priority={i < 4} />
        </Reveal>
      ))}
    </div>
  );
}

function EmptyState({ en, title, clear, clearLabel, suggestions, labels }: { en: boolean; title: string; clear: string; clearLabel: string; suggestions: PublicProduct[]; labels: { madeToOrder: string; from: string; limited: string } }) {
  return (
    <div>
      <div className="relative overflow-hidden rounded-[1.75rem] bg-surface-2 p-8 sm:p-12">
        <div className="azulejo-line pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-40 [mask-image:linear-gradient(to_left,black,transparent)]" aria-hidden />
        <p className="kicker text-accent">{en ? "Nothing here yet" : "Nada por aquí todavía"}</p>
        <p className="headline mt-3 max-w-xl text-3xl sm:text-4xl">{title}</p>
        <p className="mt-3 max-w-lg text-muted">{en ? "Try removing a filter, or design your own piece in a minute." : "Prueba a quitar algún filtro o diseña tu propia pieza en un minuto."}</p>
        <div className="relative mt-7 flex flex-wrap gap-3">
          <Link href={clear} className="btn btn-ink">
            {clearLabel}
          </Link>
          <Link href="/disena" className="btn btn-ghost">
            {en ? "Design your own" : "Diseña la tuya"} <IconArrow className="h-4 w-4" />
          </Link>
        </div>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-14">
          <p className="kicker text-muted">{en ? "You might like" : "Quizá te guste"}</p>
          <div className="mt-5">
            <ProductGrid products={suggestions} labels={labels} />
          </div>
        </div>
      )}
    </div>
  );
}
