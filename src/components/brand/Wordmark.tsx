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

export function BrandLogo({ variant = "full", className = "", priority = false, alt = "ROJO Y GUALDA" }: { variant?: keyof typeof SRC; className?: string; priority?: boolean; alt?: string }) {
  const s = SRC[variant];
  return <Image src={s.src} alt={alt} width={s.w} height={s.h} priority={priority} className={`h-full w-auto select-none ${className}`} draggable={false} />;
}

/** Header/footer wordmark (kept for API compatibility: `name` is the alt text). */
export function Wordmark({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`inline-flex h-[2.9em] items-center ${className}`}>
      <BrandLogo variant="full" alt={name} priority />
    </span>
  );
}
