import "./auth.css";
import "@/components/club/club.css";
import Image from "next/image";
import { MemberCard3D } from "@/components/club/MemberCard3D";

/** Deterministic gold particles (no Math.random → no hydration mismatch). */
const PARTICLES = Array.from({ length: 22 }, (_, i) => {
  const r = (n: number) => (Math.sin(i * 71.7 + n * 19.3) + 1) / 2;
  return {
    x: `${(r(1) * 100).toFixed(2)}%`,
    s: `${(2 + r(2) * 3).toFixed(1)}px`,
    d: `${(12 + r(3) * 12).toFixed(1)}s`,
    delay: `${(-r(4) * 20).toFixed(1)}s`,
    drift: `${((r(5) - 0.5) * 110).toFixed(0)}px`,
    o: (0.35 + r(6) * 0.55).toFixed(2),
  };
});

export interface AuthVisualCopy {
  kicker: string;
  title: [string, string];
  body: string;
  perks: { badge: string; text: string }[];
  card: { club: string; since: string; points: string; name: string; tier: string; aria: string };
}

/**
 * Cinematic left panel of the sign-in screen: a campaign photo on a slow Ken-Burns drift, gold particles
 * and a light band, the crowned lion lit by a sweeping highlight and the member card floating in 3D.
 * Phones get a short header band (photo + title + perks), the card is desktop-only.
 */
export function AuthVisual({ photo, copy, year }: { photo: string; copy: AuthVisualCopy; year: string }) {
  return (
    <div className="au-visual lg:min-h-full">
      {/* photo, slow Ken Burns */}
      <div className="au-kb" aria-hidden>
        <Image src={photo} alt="" fill priority sizes="(min-width:1024px) 52vw, 100vw" className="object-cover object-[50%_30%]" />
      </div>
      <div className="au-scrim" aria-hidden />
      <div className="rg-sweep-band" aria-hidden />
      <div className="rg-particles" aria-hidden>
        {PARTICLES.map((p, i) => (
          <i key={i} style={{ ["--x" as string]: p.x, ["--s" as string]: p.s, ["--d" as string]: p.d, ["--delay" as string]: p.delay, ["--drift" as string]: p.drift, ["--o" as string]: p.o }} />
        ))}
      </div>
      <div className="au-vignette" aria-hidden />
      <div className="grain-soft pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 flex h-full flex-col justify-between gap-5 px-4 py-5 sm:p-8 lg:gap-6 lg:p-12 xl:p-14">
        {/* top: lion mark + kicker */}
        <div className="flex items-center gap-3">
          <span className="au-lion-mark block h-10 w-[34px] shrink-0 sm:h-12 sm:w-[41px]" aria-hidden />
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-logo)] text-[13px] font-bold tracking-[0.18em] text-[#f5f1e8] sm:text-sm">ROJO Y GUALDA</p>
            <p className="kicker mt-0.5 flex items-center gap-2 text-[10px] text-[#e0b84a] sm:text-[11px]">
              <span className="flag-line inline-block h-[2px] w-4 rounded-full" aria-hidden />
              {copy.kicker}
            </p>
          </div>
        </div>

        {/* card — desktop */}
        <div className="pointer-events-auto relative mx-auto hidden w-full max-w-[400px] lg:block xl:max-w-[430px]">
          <div className="au-float">
            <MemberCard3D number="000000" name={copy.card.name} since={year} tier="SOCIO" tierLabel={copy.card.tier} labels={{ club: copy.card.club, since: copy.card.since, points: copy.card.points }} ariaLabel={copy.card.aria} />
          </div>
          <div className="mx-auto mt-6 h-6 w-3/4 rounded-[50%] bg-black/60 blur-xl" aria-hidden />
        </div>

        {/* bottom: title + perks */}
        <div>
          <h2 className="font-[family-name:var(--font-logo)] text-[clamp(1.9rem,7.2vw,2.6rem)] font-bold leading-[1.02] tracking-[0.01em] lg:text-[clamp(2.6rem,3.6vw,3.6rem)]">
            <span className="text-red-metal">{copy.title[0]} </span>
            <span className="text-gold-metal">{copy.title[1]}</span>
          </h2>
          <p className="mt-3 hidden max-w-md text-[15px] leading-relaxed text-white/75 sm:block lg:text-base">{copy.body}</p>
          <p className="mt-2.5 text-[13px] font-semibold text-[#f1d27a] sm:hidden">{copy.perks.slice(0, 2).map((p) => `${p.badge} ${p.text}`).join(" · ")}</p>
          <ul className="mt-6 hidden flex-wrap gap-2 sm:flex">
            {copy.perks.map((p) => (
              <li key={p.text} className="au-chip">
                <b>{p.badge}</b>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
