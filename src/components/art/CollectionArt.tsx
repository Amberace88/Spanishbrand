/**
 * Original generative artwork per collection (pure SVG, no external assets).
 * Used until real editorial photography exists — never presented as product imagery.
 */
import type { CSSProperties } from "react";

interface Props {
  slug: string;
  className?: string;
  style?: CSSProperties;
  animated?: boolean;
}

function Sun({ animated }: { animated?: boolean }) {
  const rays = Array.from({ length: 36 });
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <radialGradient id="sun-g" cx="50%" cy="58%" r="60%">
          <stop offset="0%" stopColor="#e2b765" />
          <stop offset="38%" stopColor="#c7412f" />
          <stop offset="100%" stopColor="#5e0a18" />
        </radialGradient>
      </defs>
      <rect width="400" height="500" fill="url(#sun-g)" />
      <g transform="translate(200 300)" className={animated ? "origin-center animate-spin-slow" : undefined} style={{ transformBox: "fill-box" }}>
        {rays.map((_, i) => (
          <rect key={i} x="-1" y="-420" width="2" height="300" fill="#f4efe6" opacity={i % 3 === 0 ? 0.35 : 0.12} transform={`rotate(${i * 10})`} />
        ))}
      </g>
      <circle cx="200" cy="300" r="92" fill="#f4efe6" opacity="0.92" />
      <circle cx="200" cy="300" r="92" fill="none" stroke="#0b0b0c" strokeOpacity=".15" strokeWidth="1" />
      <rect y="360" width="400" height="140" fill="#0b0b0c" opacity=".9" />
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x={60 + i * 4} y={370 + i * 14} width={280 - i * 8} height="1.5" fill="#e2b765" opacity={0.5 - i * 0.05} />
      ))}
    </svg>
  );
}

function Azulejo() {
  const tiles = [];
  for (let y = 0; y < 6; y++) for (let x = 0; x < 5; x++) tiles.push([x, y]);
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <pattern id="az" width="80" height="80" patternUnits="userSpaceOnUse">
          <rect width="80" height="80" fill="#f4efe6" />
          <path d="M40 4 L52 28 L76 40 L52 52 L40 76 L28 52 L4 40 L28 28 Z" fill="#1b2a4a" />
          <circle cx="40" cy="40" r="9" fill="#f4efe6" />
          <circle cx="40" cy="40" r="4" fill="#a8894f" />
          <path d="M0 0 Q20 20 0 40 M80 0 Q60 20 80 40 M0 80 Q20 60 0 40 M80 80 Q60 60 80 40" stroke="#1b2a4a" strokeWidth="2.5" fill="none" />
          <rect width="80" height="80" fill="none" stroke="#a8894f" strokeOpacity=".4" />
        </pattern>
      </defs>
      <rect width="400" height="500" fill="url(#az)" />
      <rect width="400" height="500" fill="#0b0b0c" opacity=".08" />
      <rect x="40" y="170" width="320" height="160" fill="#0b0b0c" />
      <rect x="48" y="178" width="304" height="144" fill="none" stroke="#a8894f" strokeWidth="1" />
      <text x="200" y="262" textAnchor="middle" fill="#c9ad76" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="44">Heritage</text>
    </svg>
  );
}

function Waves() {
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <linearGradient id="med-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4efe6" />
          <stop offset="1" stopColor="#e7d8bf" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill="url(#med-sky)" />
      <circle cx="300" cy="140" r="54" fill="#c7412f" opacity=".88" />
      {Array.from({ length: 16 }).map((_, i) => {
        const y = 250 + i * 16;
        return (
          <path
            key={i}
            d={`M-20 ${y} Q 30 ${y - 12} 80 ${y} T 180 ${y} T 280 ${y} T 380 ${y} T 480 ${y} V 520 H -20 Z`}
            fill={i % 2 ? "#1b2a4a" : "#233a66"}
            opacity={0.35 + i * 0.04}
          />
        );
      })}
      <path d="M40 240 L 130 240 L 110 150 Z" fill="#f4efe6" stroke="#1b2a4a" strokeWidth="2" />
      <path d="M85 240 L 85 130" stroke="#1b2a4a" strokeWidth="2" />
    </svg>
  );
}

function Motor() {
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <rect width="400" height="500" fill="#0b0b0c" />
      <path d="M-40 520 C 60 360, 120 300, 220 280 S 380 180, 440 40" stroke="#232326" strokeWidth="120" fill="none" />
      <path d="M-40 520 C 60 360, 120 300, 220 280 S 380 180, 440 40" stroke="#f4efe6" strokeWidth="2" strokeDasharray="18 16" fill="none" opacity=".7" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={250 + i * 26} y="-40" width="14" height="600" fill={i === 1 ? "#f4efe6" : "#b3122e"} transform="rotate(18 250 250)" opacity={i === 1 ? 0.9 : 1} />
      ))}
      <g transform="translate(40 60)">
        {Array.from({ length: 5 }).map((_, r) =>
          Array.from({ length: 5 }).map((__, c) => <rect key={`${r}${c}`} x={c * 12} y={r * 12} width="12" height="12" fill={(r + c) % 2 ? "#f4efe6" : "#0b0b0c"} />),
        )}
      </g>
      <text x="40" y="460" fill="#f4efe6" fontFamily="Archivo Variable, sans-serif" fontWeight="800" fontSize="64" style={{ fontVariationSettings: '"wdth" 62' }} opacity=".95">
        N-340
      </text>
    </svg>
  );
}

function Compass() {
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <rect width="400" height="500" fill="#e9dfcc" />
      {Array.from({ length: 32 }).map((_, i) => (
        <line key={i} x1="200" y1="250" x2={200 + 400 * Math.cos((i * Math.PI) / 16)} y2={250 + 400 * Math.sin((i * Math.PI) / 16)} stroke="#6b645a" strokeOpacity=".25" />
      ))}
      <circle cx="200" cy="250" r="120" fill="none" stroke="#1b2a4a" strokeWidth="2" />
      <circle cx="200" cy="250" r="100" fill="none" stroke="#a8894f" strokeWidth="1" />
      <path d="M200 110 L215 250 L200 390 L185 250 Z" fill="#1b2a4a" />
      <path d="M60 250 L200 235 L340 250 L200 265 Z" fill="#b3122e" />
      <text x="200" y="470" textAnchor="middle" fill="#1b2a4a" fontFamily="Instrument Serif, serif" fontSize="40">MCDXCII</text>
    </svg>
  );
}

function City({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <rect width="400" height="500" fill="#f4efe6" />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x={i * 34} y={260 - ((i * 53) % 140)} width="30" height={240 + ((i * 53) % 140)} fill={i % 3 === 0 ? accent : "#0b0b0c"} opacity={i % 3 === 0 ? 0.9 : 0.85} />
      ))}
      <circle cx="310" cy="110" r="40" fill={accent} opacity=".85" />
    </svg>
  );
}

export function CollectionArt({ slug, className, style, animated }: Props) {
  let art;
  switch (slug) {
    case "espana":
      art = <Sun animated={animated} />;
      break;
    case "heritage":
    case "founders":
      art = <Azulejo />;
      break;
    case "mediterraneo":
    case "alicante":
    case "valencia":
      art = <Waves />;
      break;
    case "motor":
      art = <Motor />;
      break;
    case "1492":
      art = <Compass />;
      break;
    default:
      art = <City accent={slug === "madrid" ? "#b3122e" : "#a8894f"} />;
  }
  return (
    <div className={className} style={style} aria-hidden="true">
      {art}
    </div>
  );
}
