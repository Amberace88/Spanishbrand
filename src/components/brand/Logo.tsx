/**
 * ROJO Y GUALDA logo — classic serif lettering + brush-stroke flag swash. No crown, coat of arms or
 * other state symbol is part of the mark (keeps it registrable). `Crown` is a separate, generic
 * decorative print element only. Replace with the final logo artwork when supplied.
 */

export function Crown({ className = "", color = "#d4a62a", gem = "#c8102e" }: { className?: string; color?: string; gem?: string }) {
  return (
    <svg viewBox="0 0 64 44" className={className} aria-hidden>
      <path d="M6 34 L4 12 L18 24 L32 6 L46 24 L60 12 L58 34 Z" fill={color} />
      <rect x="5" y="34" width="54" height="7" rx="1.5" fill={color} />
      <path d="M8 37.5 H56" stroke="#000" strokeOpacity=".25" strokeWidth="1" />
      <circle cx="4" cy="11" r="3" fill={color} />
      <circle cx="32" cy="5" r="3.4" fill={color} />
      <circle cx="60" cy="11" r="3" fill={color} />
      <circle cx="18" cy="23" r="2.2" fill={color} />
      <circle cx="46" cy="23" r="2.2" fill={color} />
      <circle cx="32" cy="37.5" r="2.4" fill={gem} />
      <circle cx="18" cy="37.5" r="1.8" fill={gem} />
      <circle cx="46" cy="37.5" r="1.8" fill={gem} />
    </svg>
  );
}

/** Brush-stroke flag swash (rojo · gualda). */
export function Swash({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 40" className={className} preserveAspectRatio="none" aria-hidden>
      <path d="M8 16 C 70 6, 170 2, 296 6 L 290 13 C 190 11, 100 15, 14 24 Z" fill="#c8102e" />
      <path d="M30 26 C 110 17, 200 14, 292 15 L 284 22 C 200 23, 120 27, 40 35 Z" fill="#ffc400" />
      <path d="M60 14 L 250 7 M 90 30 L 270 19" stroke="#000" strokeOpacity=".12" strokeWidth="1.2" />
    </svg>
  );
}

/** Full stacked logo. `tone` controls the "ROJO Y" line colour. */
export function Logo({ className = "", tone = "light", crown = false }: { className?: string; tone?: "light" | "dark" | "current"; crown?: boolean }) {
  const top = tone === "light" ? "#f5f1e8" : tone === "dark" ? "#0d0d0d" : "currentColor";
  return (
    <div className={`inline-flex flex-col items-center leading-none ${className}`} aria-label="Rojo y Gualda" role="img">
      {crown && <Crown className="h-[0.9em] w-auto" />}
      <span className="mt-[0.12em] font-[family-name:var(--font-logo)] text-[1em] font-semibold tracking-[0.04em]" style={{ color: top }}>
        ROJO Y
      </span>
      <span className="font-[family-name:var(--font-logo)] text-[1.32em] font-bold tracking-[0.03em] text-[#d4a62a]">GUALDA</span>
      <Swash className="-mt-[0.08em] h-[0.42em] w-[115%]" />
    </div>
  );
}
