/** Small, crisp 3:2 flag glyphs for the language selector (simplified, no coats of arms). */
import type { ReactElement } from "react";

const W = 30;
const H = 20;

function Spain() {
  return (
    <>
      <rect width={W} height={H} fill="#c60b1e" />
      <rect y={5} width={W} height={10} fill="#ffc400" />
    </>
  );
}

/** Senyera: Catalan / Valencian / Balearic shared stripes. */
function Senyera() {
  return (
    <>
      <rect width={W} height={H} fill="#fcdd09" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} y={(H / 9) * (1 + i * 2)} width={W} height={H / 9} fill="#da121a" />
      ))}
    </>
  );
}

/** Ikurriña. */
function Basque() {
  return (
    <>
      <rect width={W} height={H} fill="#d52b1e" />
      <path d={`M0 0 L${W} ${H} M${W} 0 L0 ${H}`} stroke="#009b48" strokeWidth={3.4} />
      <path d={`M${W / 2} 0 V${H} M0 ${H / 2} H${W}`} stroke="#fff" strokeWidth={2.6} />
    </>
  );
}

function Galicia() {
  return (
    <>
      <rect width={W} height={H} fill="#fff" />
      <path d={`M0 0 L${W} ${H}`} stroke="#0099cc" strokeWidth={5} />
    </>
  );
}

function UK() {
  return (
    <>
      <rect width={W} height={H} fill="#012169" />
      <path d={`M0 0 L${W} ${H} M${W} 0 L0 ${H}`} stroke="#fff" strokeWidth={4} />
      <path d={`M0 0 L${W} ${H} M${W} 0 L0 ${H}`} stroke="#c8102e" strokeWidth={1.6} />
      <path d={`M${W / 2} 0 V${H} M0 ${H / 2} H${W}`} stroke="#fff" strokeWidth={6} />
      <path d={`M${W / 2} 0 V${H} M0 ${H / 2} H${W}`} stroke="#c8102e" strokeWidth={3.4} />
    </>
  );
}

function Germany() {
  return (
    <>
      <rect width={W} height={H / 3} fill="#000" />
      <rect y={H / 3} width={W} height={H / 3} fill="#dd0000" />
      <rect y={(H / 3) * 2} width={W} height={H / 3} fill="#ffce00" />
    </>
  );
}

const FLAGS: Record<string, () => ReactElement> = { es: Spain, ca: Senyera, eu: Basque, gl: Galicia, en: UK, de: Germany };

export function Flag({ code, className = "h-4 w-6" }: { code: string; className?: string }) {
  const F = FLAGS[code] ?? Spain;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`shrink-0 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.12)] ${className}`} aria-hidden preserveAspectRatio="none">
      <F />
    </svg>
  );
}

export const LANGUAGES = [
  { code: "es", short: "ES", name: "Español", region: "España" },
  { code: "ca", short: "CA", name: "Català · Valencià", region: "Catalunya · C. Valenciana · Illes Balears" },
  { code: "eu", short: "EU", name: "Euskara", region: "Euskadi · Nafarroa" },
  { code: "gl", short: "GL", name: "Galego", region: "Galicia" },
  { code: "en", short: "EN", name: "English", region: "International" },
  { code: "de", short: "DE", name: "Deutsch", region: "Deutschland · Österreich" },
] as const;
