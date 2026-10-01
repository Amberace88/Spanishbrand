/**
 * Football-style shirt back with a name and number. Generic design — no club, league or federation marks.
 * Also used as the live personalization preview.
 */
export function JerseyBack({
  name = "GARCÍA",
  number = "10",
  shirt = "#e3051b",
  ink = "#ffc400",
  trim = "#ffc400",
  className = "",
}: {
  name?: string;
  number?: string;
  shirt?: string;
  ink?: string;
  trim?: string;
  className?: string;
}) {
  const n = (name || " ").toUpperCase().slice(0, 14);
  const fontSize = n.length > 10 ? 26 : n.length > 7 ? 32 : 38;
  return (
    <svg viewBox="0 0 400 400" className={`drop-shadow-[0_18px_24px_rgba(0,0,0,0.18)] ${className}`} aria-label={`${n} ${number}`} role="img">
      <path d="M140 56 L98 70 L34 120 L68 186 L110 166 L110 352 Q110 364 122 364 L278 364 Q290 364 290 352 L290 166 L332 186 L366 120 L302 70 L260 56 Q250 70 200 70 Q150 70 140 56 Z" fill={shirt} />
      <path d="M140 56 Q150 70 200 70 Q250 70 260 56" stroke={trim} strokeWidth="6" fill="none" />
      <path d="M34 120 L68 186 M366 120 L332 186" stroke={trim} strokeWidth="6" />
      <text x="200" y="128" textAnchor="middle" fill={ink} fontFamily="Bricolage Grotesque Variable, Inter Variable, sans-serif" fontWeight="800" fontSize={fontSize} letterSpacing="2">
        {n}
      </text>
      <text x="200" y="278" textAnchor="middle" fill={ink} fontFamily="Bricolage Grotesque Variable, Inter Variable, sans-serif" fontWeight="800" fontSize="150" letterSpacing="-6">
        {(number || "").slice(0, 2)}
      </text>
    </svg>
  );
}
