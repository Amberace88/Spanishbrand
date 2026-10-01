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


const VB = { viewBox: "0 0 400 500", preserveAspectRatio: "xMidYMid slice", className: "h-full w-full" } as const;
const FONT = "Bricolage Grotesque Variable, Inter Variable, sans-serif";

/** Retro terrace-style football print: pitch lines, ball, "AFICIÓN". No club marks. */
function Futbol() {
  return (
    <svg {...VB}>
      <rect width="400" height="500" fill="#0f7a3d" />
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i} x="0" y={i * 50} width="400" height="25" fill="#0c6a34" />
      ))}
      <g fill="none" stroke="#fff" strokeWidth="4" opacity=".85">
        <rect x="30" y="30" width="340" height="440" />
        <line x1="30" y1="250" x2="370" y2="250" />
        <circle cx="200" cy="250" r="62" />
        <rect x="110" y="30" width="180" height="80" />
        <rect x="110" y="390" width="180" height="80" />
      </g>
      <g transform="translate(200 250)">
        <circle r="38" fill="#fff" />
        <path d="M0 -16 L15 -5 L9 13 L-9 13 L-15 -5 Z" fill="#0d0d0d" />
        <path d="M0 -38 L0 -16 M15 -5 L35 -12 M9 13 L22 31 M-9 13 L-22 31 M-15 -5 L-35 -12" stroke="#0d0d0d" strokeWidth="3" />
      </g>
      <text x="200" y="185" textAnchor="middle" fill="#ffc400" fontFamily={FONT} fontWeight="800" fontSize="54" letterSpacing="-2">AFICIÓN</text>
      <text x="200" y="345" textAnchor="middle" fill="#fff" fontFamily={FONT} fontWeight="800" fontSize="22" letterSpacing="6">DESDE SIEMPRE</text>
    </svg>
  );
}

function Padel() {
  return (
    <svg {...VB}>
      <rect width="400" height="500" fill="#1d4ed8" />
      <g stroke="#fff" strokeWidth="4" fill="none" opacity=".9">
        <rect x="40" y="40" width="320" height="420" />
        <line x1="40" y1="250" x2="360" y2="250" strokeDasharray="10 8" />
        <line x1="200" y1="110" x2="200" y2="390" />
        <line x1="40" y1="110" x2="360" y2="110" />
        <line x1="40" y1="390" x2="360" y2="390" />
      </g>
      <g transform="translate(200 250) rotate(-30)">
        <rect x="-16" y="40" width="32" height="90" rx="10" fill="#0d0d0d" />
        <ellipse rx="78" ry="92" fill="#c6f432" />
        {Array.from({ length: 5 }).map((_, r) => Array.from({ length: 4 }).map((_, c) => <circle key={`${r}${c}`} cx={-36 + c * 24} cy={-48 + r * 24} r="5" fill="#1d4ed8" opacity=".55" />))}
      </g>
      <circle cx="300" cy="120" r="26" fill="#ffc400" />
      <path d="M278 112 Q300 126 322 112 M278 128 Q300 114 322 128" stroke="#fff" strokeWidth="3" fill="none" />
    </svg>
  );
}

function Ciclismo() {
  return (
    <svg {...VB}>
      <rect width="400" height="500" fill="#ff5a1f" />
      <path d="M0 380 L80 250 L150 320 L240 160 L320 280 L400 210 L400 500 L0 500 Z" fill="#c2410c" />
      <path d="M0 420 L90 330 L170 380 L260 270 L340 340 L400 300 L400 500 L0 500 Z" fill="#7c2d12" />
      <circle cx="300" cy="110" r="44" fill="#ffc400" />
      <g transform="translate(200 300)" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round">
        <circle cx="-62" cy="30" r="42" />
        <circle cx="62" cy="30" r="42" />
        <path d="M-62 30 L-14 -30 L36 -30 L62 30 M-14 -30 L4 30 L36 -30 M-24 -44 L-4 -44 M36 -30 L30 -52 L48 -52" />
      </g>
      <text x="200" y="465" textAnchor="middle" fill="#fff" fontFamily={FONT} fontWeight="800" fontSize="34" letterSpacing="4">PUERTO DE MONTAÑA</text>
    </svg>
  );
}

function MiPueblo() {
  return (
    <svg {...VB}>
      <rect width="400" height="500" fill="#fff4cc" />
      <circle cx="200" cy="170" r="88" fill="#ffc400" />
      <path d="M40 330 L40 260 L90 230 L140 260 L140 330 Z M150 330 L150 210 L180 190 L180 150 L200 130 L220 150 L220 190 L250 210 L250 330 Z M260 330 L260 270 L310 240 L360 270 L360 330 Z" fill="#fffcf7" stroke="#0d0d0d" strokeWidth="3" />
      <path d="M192 330 L192 290 Q200 280 208 290 L208 330 Z M75 300 h20 v18 h-20Z M295 300 h20 v18 h-20Z M190 205 h20 v24 h-20Z" fill="#0d0d0d" />
      <path d="M180 150 L200 110 L220 150 Z" fill="#e3051b" />
      <rect x="0" y="330" width="400" height="170" fill="#e3051b" />
      <text x="200" y="405" textAnchor="middle" fill="#fff" fontFamily={FONT} fontWeight="800" fontSize="58" letterSpacing="-2">MI PUEBLO</text>
      <text x="200" y="450" textAnchor="middle" fill="#ffc400" fontFamily={FONT} fontWeight="700" fontSize="20" letterSpacing="6">DE AQUÍ, DE TODA LA VIDA</text>
    </svg>
  );
}

function Fiestas() {
  const colors = ["#e3051b", "#ffc400", "#1f4fd1", "#0f7a3d", "#ff3d8b"];
  return (
    <svg {...VB}>
      <rect width="400" height="500" fill="#0d0d0d" />
      {[60, 130, 200].map((y, row) => (
        <g key={y}>
          <path d={`M-10 ${y} Q200 ${y + 50} 410 ${y}`} stroke="#fff" strokeOpacity=".5" fill="none" strokeWidth="2" />
          {Array.from({ length: 9 }).map((_, i) => {
            const x = 10 + i * 48;
            const t = (x + 10) / 420;
            const yy = y + 50 * 2 * t * (1 - t);
            return <path key={i} d={`M${x - 14} ${yy} L${x + 14} ${yy} L${x} ${yy + 30} Z`} fill={colors[(i + row) % colors.length]} />;
          })}
        </g>
      ))}
      <text x="200" y="380" textAnchor="middle" fill="#fff" fontFamily={FONT} fontWeight="800" fontSize="92" letterSpacing="-4">FIESTA</text>
      <text x="200" y="430" textAnchor="middle" fill="#ffc400" fontFamily={FONT} fontWeight="700" fontSize="20" letterSpacing="7">HASTA QUE SALGA EL SOL</text>
    </svg>
  );
}

function Tapas() {
  return (
    <svg {...VB}>
      <rect width="400" height="500" fill="#7a1f2b" />
      <circle cx="200" cy="230" r="120" fill="#f6efe3" />
      <circle cx="200" cy="230" r="98" fill="none" stroke="#7a1f2b" strokeWidth="3" strokeDasharray="4 8" />
      <g>
        <ellipse cx="165" cy="215" rx="34" ry="22" fill="#e9b949" />
        <ellipse cx="235" cy="205" rx="28" ry="20" fill="#c2410c" />
        <circle cx="210" cy="262" r="16" fill="#6b7a2a" />
        <circle cx="185" cy="268" r="12" fill="#6b7a2a" />
        <path d="M150 200 L180 230" stroke="#7a1f2b" strokeWidth="3" />
      </g>
      <text x="200" y="420" textAnchor="middle" fill="#fff" fontFamily={FONT} fontWeight="800" fontSize="70" letterSpacing="-3">VERMUT</text>
      <text x="200" y="462" textAnchor="middle" fill="#f2d16b" fontFamily={FONT} fontWeight="700" fontSize="20" letterSpacing="6">Y UNAS TAPAS</text>
    </svg>
  );
}

function Camino() {
  return (
    <svg {...VB}>
      <rect width="400" height="500" fill="#1f4fd1" />
      <g transform="translate(200 220)">
        {Array.from({ length: 9 }).map((_, i) => (
          <path key={i} d="M0 70 L0 -110" stroke="#ffc400" strokeWidth="9" strokeLinecap="round" transform={`rotate(${-64 + i * 16} 0 70)`} />
        ))}
        <circle cx="0" cy="70" r="16" fill="#ffc400" />
      </g>
      <text x="200" y="405" textAnchor="middle" fill="#fff" fontFamily={FONT} fontWeight="800" fontSize="56" letterSpacing="-2">BUEN CAMINO</text>
      <text x="200" y="448" textAnchor="middle" fill="#ffc400" fontFamily={FONT} fontWeight="700" fontSize="20" letterSpacing="6">KM 0 · SANTIAGO</text>
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
    case "futbol":
      art = <Futbol />;
      break;
    case "padel":
      art = <Padel />;
      break;
    case "ciclismo":
      art = <Ciclismo />;
      break;
    case "mi-pueblo":
      art = <MiPueblo />;
      break;
    case "fiestas":
      art = <Fiestas />;
      break;
    case "tapas":
      art = <Tapas />;
      break;
    case "camino":
      art = <Camino />;
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
