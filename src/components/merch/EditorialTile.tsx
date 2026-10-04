import Image from "next/image";
import type { CSSProperties } from "react";
import { TONES, type TextureKey, type ToneKey } from "@/lib/catalog/tones";
import { IconArrow } from "@/components/ui/Icons";
import { ParallaxLink } from "./ParallaxLink";

export type TileSize = "hero" | "wide" | "banner" | "tall" | "sq" | "card" | "stage";
export interface TileCard {
  url: string;
  alt: string;
}

/** Fan positions (translate in % of the card, rotation) for 1–3 cards; the middle card sits in front. */
const FAN: Record<number, { x: string; y: string; r: string; z: number }[]> = {
  1: [{ x: "0%", y: "0%", r: "-4deg", z: 3 }],
  2: [
    { x: "-30%", y: "4%", r: "-8deg", z: 2 },
    { x: "30%", y: "-2%", r: "6deg", z: 3 },
  ],
  3: [
    { x: "-60%", y: "8%", r: "-10deg", z: 2 },
    { x: "0%", y: "-4%", r: "0deg", z: 3 },
    { x: "60%", y: "10%", r: "9deg", z: 1 },
  ],
};

/** Layout per size: text block, fan container, type scale. */
const LAYOUT: Record<TileSize, { pad: string; title: string; word: string; fan: string; fanPhoto: string; text: string; tagline: string; cards: number; cta: boolean }> = {
  hero: {
    pad: "p-6 sm:p-9",
    title: "text-[3rem] sm:text-[5.2rem]",
    word: "text-[8rem] sm:text-[15rem] -right-4 top-2",
    fan: "right-[3%] top-[5%] w-[56%] sm:top-auto sm:bottom-[9%] sm:w-[54%]",
    fanPhoto: "right-[5%] top-[7%] w-[46%] sm:w-[38%]",
    text: "absolute bottom-0 left-0 right-0 sm:right-[54%]",
    tagline: "text-base sm:text-2xl max-w-md line-clamp-2 sm:line-clamp-none",
    cards: 3,
    cta: true,
  },
  wide: {
    pad: "p-6 sm:p-8",
    title: "text-[2.3rem] sm:text-[3.4rem]",
    word: "text-[6rem] sm:text-[10rem] -right-3 -top-2",
    fan: "right-[4%] top-1/2 -translate-y-[46%] w-[46%] sm:w-[40%]",
    fanPhoto: "right-[4%] top-1/2 -translate-y-[46%] w-[34%] sm:w-[28%]",
    text: "absolute bottom-0 left-0 w-[58%]",
    tagline: "hidden sm:block text-xl",
    cards: 3,
    cta: true,
  },
  tall: {
    pad: "p-5 sm:p-7",
    title: "text-[2.1rem] sm:text-[2.9rem]",
    word: "text-[5.5rem] sm:text-[8rem] -left-2 bottom-[34%] [writing-mode:vertical-rl] rotate-180",
    fan: "left-1/2 -translate-x-1/2 bottom-[8%] w-[80%]",
    fanPhoto: "right-[6%] bottom-[30%] w-[56%]",
    text: "absolute inset-x-0 top-0",
    tagline: "text-base sm:text-lg",
    cards: 3,
    cta: true,
  },
  sq: {
    pad: "p-4 sm:p-6",
    title: "text-[1.3rem] sm:text-[2.2rem]",
    word: "text-[4.5rem] sm:text-[7rem] -right-2 bottom-[-0.12em]",
    fan: "right-[-6%] bottom-[-10%] w-[78%] sm:w-[70%]",
    fanPhoto: "right-[-4%] bottom-[-8%] w-[58%] sm:w-[50%]",
    text: "absolute inset-x-0 top-0",
    tagline: "hidden sm:block text-sm",
    cards: 2,
    cta: false,
  },
  /** Full-width bento row (4 columns): text left, a compact fan right. */
  banner: {
    pad: "p-6 sm:p-8",
    title: "text-[2.3rem] sm:text-[3.4rem]",
    word: "text-[6rem] sm:text-[11rem] right-[30%] -top-3",
    fan: "right-[3%] top-1/2 -translate-y-[46%] w-[46%] sm:w-[34%] lg:w-[24%]",
    fanPhoto: "right-[3%] top-1/2 -translate-y-[46%] w-[34%] lg:w-[18%]",
    text: "absolute bottom-0 left-0 w-[58%]",
    tagline: "hidden sm:block text-xl",
    cards: 3,
    cta: true,
  },
  /** Page-hero visual: the fan centred and large, no type. */
  stage: {
    pad: "p-6",
    title: "text-[2.2rem]",
    word: "text-[9rem] xl:text-[12rem] left-1/2 -translate-x-1/2 top-[4%] whitespace-nowrap",
    fan: "left-1/2 top-[56%] -translate-x-1/2 -translate-y-1/2 w-[64%]",
    fanPhoto: "right-[5%] bottom-[8%] w-[40%]",
    text: "absolute inset-x-0 bottom-0",
    tagline: "text-base",
    cards: 3,
    cta: false,
  },
  card: {
    pad: "p-4 sm:p-6",
    title: "text-[1.3rem] sm:text-[2.1rem]",
    word: "text-[4rem] sm:text-[6rem] -right-2 top-[38%]",
    fan: "left-1/2 -translate-x-1/2 bottom-[6%] w-[92%]",
    fanPhoto: "right-[4%] bottom-[5%] w-[64%]",
    text: "absolute inset-x-0 top-0",
    tagline: "hidden sm:block text-sm",
    cards: 3,
    cta: false,
  },
};

/**
 * Editorial, magazine-like tile: brand-tone ground with a subtle texture, a giant outlined word, the
 * campaign photo when there is one, 1–3 product cards fanned (they spread on hover) and big display
 * type with the count. Layers drift with the pointer (ParallaxLink).
 */
export function EditorialTile({
  href,
  title,
  kicker,
  tagline,
  cta,
  tone,
  texture,
  word,
  photo,
  cards,
  size,
  priority = false,
  sizes,
  className = "",
}: {
  /** Omit for a static visual (no link). */
  href?: string;
  title: string;
  kicker?: string;
  tagline?: string | null;
  cta?: string;
  tone: ToneKey;
  texture: TextureKey;
  word?: string;
  photo?: string | null;
  cards: TileCard[];
  size: TileSize;
  priority?: boolean;
  /** `sizes` of the tile itself (the photo); cards derive theirs from it. */
  sizes?: string;
  className?: string;
}) {
  const T = TONES[tone];
  const L = LAYOUT[size];
  const compact = size !== "hero" && size !== "stage";
  const shown = cards.slice(0, photo ? Math.min(2, L.cards) : L.cards);
  const fan = FAN[shown.length] ?? [];
  const tileSizes = sizes ?? (size === "hero" || size === "wide" || size === "banner" ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw");
  const cardSizes = size === "hero" || size === "wide" || size === "banner" || size === "stage" ? "(min-width:1024px) 14vw, 30vw" : "(min-width:1024px) 10vw, 24vw";
  const style = { background: `radial-gradient(120% 90% at 85% 10%, ${T.bg} 0%, ${T.deep} 100%)`, color: T.fg } as CSSProperties;

  const body = (
    <>
      {/* photo layer */}
      {photo && (
        <div className="plx absolute -inset-4" style={{ "--d": "-10px" } as CSSProperties}>
          <Image src={photo} alt="" fill loading={priority ? "eager" : undefined} fetchPriority={priority ? "high" : undefined} sizes={tileSizes} className="object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${T.deep} 4%, ${T.deep}d9 28%, ${T.deep}33 62%, transparent 85%)` }} />
          <div className="absolute inset-0 mix-blend-multiply" style={{ background: `${T.bg}40` }} />
        </div>
      )}
      {/* texture + giant word */}
      {!photo && <div className={`tex tex-${texture} tex-fade ${T.dark ? "" : "tex-ink"}`} aria-hidden />}
      {word && (
        <span aria-hidden className={`plx tile-word mega pointer-events-none absolute select-none leading-none opacity-[0.16] ${L.word}`} style={{ "--d": "-6px" } as CSSProperties}>
          {word}
        </span>
      )}
      <div className="grain-soft pointer-events-none absolute inset-0" aria-hidden />

      {/* fanned product cards */}
      {shown.length > 0 && (
        <div className={`absolute ${photo ? L.fanPhoto : L.fan}`} aria-hidden>
          <div className="plx relative aspect-[1.25]" style={{ "--d": "14px" } as CSSProperties}>
            {shown.map((c, i) => (
              <div
                key={c.url}
                className="fan-card absolute left-1/2 top-1/2 -ml-[24%] -mt-[30%] w-[48%] rounded-[14px] bg-white p-[4px] shadow-[0_26px_44px_-20px_rgba(0,0,0,0.6)] ring-1 ring-black/5 sm:p-[5px]"
                style={{ "--x": fan[i].x, "--y": fan[i].y, "--r": fan[i].r, zIndex: fan[i].z } as CSSProperties}
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-[10px] bg-[#efece6]">
                  <Image src={c.url} alt={c.alt} fill sizes={cardSizes} loading={priority ? "eager" : undefined} className="object-cover" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* type */}
      <div className={`${L.text} ${L.pad} z-10`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {kicker && (
              <p className="kicker flex min-w-0 items-center gap-2" style={{ color: T.accent }}>
                <span className={`inline-block h-[2px] w-5 shrink-0 rounded-full ${compact ? "max-sm:hidden" : ""}`} style={{ background: T.accent }} />
                {/* small tiles on phones: the first part only ("120 diseños") */}
                <span className={`truncate whitespace-nowrap ${compact ? "max-sm:hidden" : ""}`}>{kicker}</span>
                {compact && <span className="truncate whitespace-nowrap sm:hidden">{kicker.split(" · ")[0]}</span>}
              </p>
            )}
            {title && <h3 className={`mega mt-2 break-words ${L.title}`}>{title}</h3>}
            {tagline && <p className={`serif mt-2 italic leading-snug opacity-85 ${L.tagline}`}>{tagline}</p>}
            {L.cta && cta && (
              <span className="mt-4 inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[12px] font-semibold sm:mt-5 sm:px-5 sm:py-2.5 sm:text-[13px] transition-transform duration-300 group-hover:translate-x-1" style={{ background: T.accent, color: T.onAccent }}>
                {cta} <IconArrow className="h-4 w-4" />
              </span>
            )}
          </div>
          {!L.cta && href && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-transform duration-300 group-hover:-rotate-45 sm:h-10 sm:w-10" style={{ borderColor: `${T.fg}40` }}>
              <IconArrow className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
    </>
  );
  const cls = `group relative isolate block h-full overflow-hidden rounded-[1.75rem] ${className}`;
  // without a link (page heroes) the tile is a static visual
  if (!href)
    return (
      <div className={cls} style={style}>
        {body}
      </div>
    );
  return (
    <ParallaxLink href={href} label={`${title}${kicker ? ` · ${kicker}` : ""}`} className={cls} style={style}>
      {body}
    </ParallaxLink>
  );
}
