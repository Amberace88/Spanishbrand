import "./cart.css";

const Spark = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <path className="ct-spark" d={`M${x} ${y - 9 * s} L${x + 2.2 * s} ${y - 2.2 * s} L${x + 9 * s} ${y} L${x + 2.2 * s} ${y + 2.2 * s} L${x} ${y + 9 * s} L${x - 2.2 * s} ${y + 2.2 * s} L${x - 9 * s} ${y} L${x - 2.2 * s} ${y - 2.2 * s} Z`} fill="#f1d27a" />
);

/**
 * Empty-cart illustration: the house's crowned lion peeking out of an empty ROJO Y GUALDA shopping bag,
 * over rojo-y-gualda brush strokes. Three stacked layers share one 400×400 coordinate space
 * (back of the bag → lion → front of the bag) so the lion disappears behind the rim. Pure SVG/CSS,
 * decorative, static on prefers-reduced-motion.
 */
export function EmptyBagArt({ className = "" }: { className?: string }) {
  return (
    <div className={`ct-stage aspect-square ${className}`} aria-hidden>
      <div className="ct-art">
        {/* back layer */}
        <svg viewBox="0 0 400 400">
          <defs>
            <linearGradient id="ct-inside" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3a2a1c" />
              <stop offset="1" stopColor="#1a120c" />
            </linearGradient>
          </defs>
          <ellipse className="ct-shadow" cx="200" cy="352" rx="104" ry="11" fill="#000" opacity=".55" />
          <path className="ct-brush" d="M34 292 C 110 236, 250 330, 372 246" fill="none" stroke="#c8102e" strokeWidth="34" strokeLinecap="round" opacity=".92" />
          <path className="ct-brush ct-brush-2" d="M28 342 C 140 296, 250 372, 378 300" fill="none" stroke="#f1bf00" strokeWidth="24" strokeLinecap="round" opacity=".9" />
          <Spark x={86} y={118} s={1.1} />
          <Spark x={322} y={104} s={0.8} />
          <Spark x={336} y={198} s={0.6} />
          <g className="ct-sway">
            {/* back handle */}
            <path d="M172 196 C 170 128, 230 128, 228 196" fill="none" stroke="#9a7222" strokeWidth="7" strokeLinecap="round" />
            {/* back panel + inside of the bag */}
            <path d="M126 205 L134 186 L266 186 L274 205 Z" fill="#d9ccb1" />
            <path d="M134 189 L266 189 L272 205 L128 205 Z" fill="url(#ct-inside)" />
          </g>
        </svg>

        {/* lion layer (clipped to the bag) */}
        <div className="ct-sway">
          <div className="ct-peek-clip">
            {/* eslint-disable-next-line @next/next/no-img-element -- small decorative brand mark inside an SVG composition */}
            <img src="/_next/image?url=%2Fbrand%2Flogo-lion.webp&w=256&q=75" alt="" width={764} height={900} className="ct-peek h-auto" draggable={false} />
          </div>
        </div>

        {/* front layer */}
        <svg viewBox="0 0 400 400">
          <defs>
            <linearGradient id="ct-paper" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f7efdf" />
              <stop offset=".6" stopColor="#f3ead7" />
              <stop offset="1" stopColor="#e2d4b8" />
            </linearGradient>
            <linearGradient id="ct-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f7e08a" />
              <stop offset=".5" stopColor="#d9a93a" />
              <stop offset="1" stopColor="#a37a22" />
            </linearGradient>
          </defs>
          <g className="ct-sway">
            {/* front panel */}
            <path d="M120 205 L280 205 L292 345 L108 345 Z" fill="url(#ct-paper)" />
            <path d="M120 205 L280 205 L281.6 224 L118.4 224 Z" fill="#e6d9be" />
            <path d="M138 224 L132 345 M262 224 L268 345" stroke="#d8c9aa" strokeWidth="1.6" />
            {/* label band */}
            <rect x="128" y="262" width="144" height="40" rx="3" fill="#a3162b" />
            <rect x="128" y="302" width="48" height="4" fill="#c8102e" />
            <rect x="176" y="302" width="48" height="4" fill="#f1bf00" />
            <rect x="224" y="302" width="48" height="4" fill="#c8102e" />
            <text x="200" y="287.5" textAnchor="middle" fontFamily="var(--font-logo), Georgia, serif" fontWeight="700" fontSize="12" letterSpacing="1.6" fill="#f7e08a">
              ROJO Y GUALDA
            </text>
            <path d="M190 246 l4 -8 l6 5 l6 -5 l4 8 Z" fill="url(#ct-gold)" />
            {/* front handle */}
            <path d="M160 206 C 156 112, 244 112, 240 206" fill="none" stroke="url(#ct-gold)" strokeWidth="7.5" strokeLinecap="round" />
            <circle cx="160" cy="210" r="4.5" fill="#7a5a1a" />
            <circle cx="240" cy="210" r="4.5" fill="#7a5a1a" />
            {/* hanging tag: zero pieces */}
            <g className="ct-tag">
              <path d="M240 210 C 262 214, 282 222, 292 232" fill="none" stroke="#c9a227" strokeWidth="1.8" />
              <g transform="translate(46 -8) rotate(-18 268 252)">
                <path d="M248 240 h36 a4 4 0 0 1 4 4 v20 a4 4 0 0 1 -4 4 h-36 l-10 -14 Z" fill="url(#ct-gold)" stroke="#7a5a1a" strokeWidth="1" />
                <circle cx="250" cy="254" r="2.6" fill="#1a120c" />
                <text x="270" y="261" textAnchor="middle" fontFamily="var(--font-display), system-ui, sans-serif" fontWeight="800" fontSize="17" fill="#1a1206">
                  0
                </text>
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
