import Image from "next/image";

/**
 * Official ROJO Y GUALDA artwork (supplied by the brand), transparent PNG/WebP in /public/brand.
 * variant: "full" = lion + lettering, "text" = lettering only, "lion" = icon only.
 */
const SRC = {
  full: { src: "/brand/logo-full.webp", w: 1484, h: 701 },
  text: { src: "/brand/logo-text.webp", w: 1368, h: 707 },
  lion: { src: "/brand/logo-lion.webp", w: 997, h: 1174 },
} as const;

/**
 * `sizes`: rendered width. The artwork is ~1400 px wide, so without it next/image serves the 1920 px rendition
 * (~100 KB) even for a 90 px header logo. The default covers every current slot (header, footer, cards, mockups).
 */
export function BrandLogo({ variant = "full", className = "", priority = false, alt = "ROJO Y GUALDA", sizes = "(min-width: 640px) 256px, 200px" }: { variant?: keyof typeof SRC; className?: string; priority?: boolean; alt?: string; sizes?: string }) {
  const s = SRC[variant];
  return <Image src={s.src} alt={alt} width={s.w} height={s.h} sizes={sizes} preload={priority} className={`h-full w-auto max-w-none object-contain select-none ${className}`} draggable={false} />;
}

/** Header/footer wordmark (kept for API compatibility: `name` is the alt text). */
export function Wordmark({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`inline-flex h-[2.9em] items-center ${className}`}>
      <BrandLogo variant="full" alt={name} priority sizes="(min-width: 640px) 160px, 128px" />
    </span>
  );
}
