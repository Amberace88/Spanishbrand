/**
 * One renderer for both the live preview (browser) and the print file (server, Satori → PNG),
 * so what the customer sees is what gets printed. Uses only Satori-compatible inline styles.
 * The browser loads the very same font files (print-fonts.css) and every position is computed here
 * in JS (sizes, line boxes, per-letter arcs) — never left to the browser's own text layout.
 */
import type { CSSProperties } from "react";
import type { AnyFontKey, FontKey, Layer, Personalization, TemplateKey, TextLayer } from "./types";
import metrics from "./font-metrics.json";

export type FontMap = Record<AnyFontKey, string>;

/** Browser font stacks: the print TTFs (subset to woff2), declared in print-fonts.css. */
export const BROWSER_FONTS: FontMap = {
  display: "RYG Print Display, Bricolage Grotesque Variable, sans-serif",
  serif: "RYG Print Serif, Cinzel Variable, Georgia, serif",
  sans: "RYG Print Sans, Inter Variable, sans-serif",
  script: "RYG Print Script, Pacifico, cursive",
  sport: "RYG Print Sport, Anton, Impact, sans-serif",
  varsity: "RYG Print Varsity, Georgia, serif",
  mono: "RYG Print Mono, ui-monospace, monospace",
  elegant: "RYG Print Elegant, Georgia, serif",
};

/** Satori font family names (registered in render.tsx). */
export const PRINT_FONTS: FontMap = { display: "Bricolage", serif: "Cinzel", sans: "Inter", script: "Pacifico", sport: "Anton", varsity: "Graduate", mono: "SpaceMono", elegant: "Playfair" };

/** Weight of the single face registered per family (the browser never synthesises bold). */
export const FONT_WEIGHT: Record<AnyFontKey, 400 | 700 | 800> = { display: 800, serif: 700, sans: 800, script: 400, sport: 400, varsity: 400, mono: 700, elegant: 700 };

const WIDTH_FACTOR: Record<AnyFontKey, number> = { display: 0.6, serif: 0.78, sans: 0.62, script: 0.62, sport: 0.47, varsity: 0.67, mono: 0.62, elegant: 0.62 };

/** Font size so that `text` spans roughly `targetWidth` px. Same formula for preview and print. */
export function fitFontSize(text: string, font: AnyFontKey, targetWidth: number) {
  const n = Math.max(1, [...text].length);
  return Math.max(1, targetWidth / (n * WIDTH_FACTOR[font]));
}

/* ───────── text layout (designer layers) ───────── */

const M = metrics as { chars: string; fonts: Record<string, { adv: number[]; asc: number; desc: number; cap: number }> };
const CHAR_INDEX = new Map([...M.chars].map((c, i) => [c, i] as const));

/** Advance width of one character in em (real font metrics; fallback = average width). */
export function advance(ch: string, font: AnyFontKey): number {
  const i = CHAR_INDEX.get(ch);
  const a = i == null ? 0 : (M.fonts[font]?.adv[i] ?? 0);
  return a > 0 ? a / 1000 : WIDTH_FACTOR[font];
}

export const MAX_LINES = 3;
export const linesOf = (text: string) => text.split("\n").slice(0, MAX_LINES);

export interface TextBox {
  lines: string[];
  size: number; // font size px
  width: number; // box px
  height: number; // box px
  lineHeight: number; // multiplier
  spacing: number; // letter spacing px
  arc: number; // degrees (0 = straight)
  /** Per-letter placement for curved text (centre x/y inside the box, rotation in degrees). */
  glyphs?: { ch: string; x: number; y: number; w: number; r: number }[];
}

/**
 * Size and box of a text layer inside a print area `width` px wide. Single-line straight text keeps
 * the original formula (font size from the width, box = 1.3 × size) so existing designs are unchanged.
 */
export function layoutText(l: Pick<TextLayer, "text" | "font" | "w" | "spacing" | "lineHeight" | "arc">, width: number): TextBox {
  const lines = linesOf(l.text);
  const n = Math.max(1, ...lines.map((x) => [...x].length));
  const em = l.spacing ?? 0;
  const boxW = l.w * width;
  const size = Math.max(1, boxW / (n * WIDTH_FACTOR[l.font] + Math.max(0, n - 1) * em));
  const lh = l.lineHeight ?? 1;
  const spacing = em * size;
  const arc = lines.length === 1 ? Math.max(-300, Math.min(300, l.arc ?? 0)) : 0;
  let height = size * (0.3 + lines.length * lh);
  let glyphs: TextBox["glyphs"];
  if (Math.abs(arc) >= 4 && lines[0].length > 1) {
    const chars = [...lines[0]];
    const adv = chars.map((c) => advance(c, l.font) * size + spacing);
    const L = adv.reduce((a, b) => a + b, 0) - spacing;
    const theta = (Math.abs(arc) * Math.PI) / 180;
    const R = L / theta;
    const sag = R * (1 - Math.cos(Math.min(theta / 2, Math.PI)));
    height = size * 1.3 + sag;
    const up = arc > 0;
    let s = 0;
    glyphs = chars.map((ch, i) => {
      const w = adv[i] - spacing;
      const c = s + w / 2;
      s += adv[i];
      const phi = (c - L / 2) / R;
      const drop = R * (1 - Math.cos(phi));
      return { ch, w, x: boxW / 2 + R * Math.sin(phi), y: size * 0.65 + (up ? drop : sag - drop), r: ((up ? phi : -phi) * 180) / Math.PI };
    });
  }
  return { lines, size, width: boxW, height, lineHeight: lh, spacing, arc, glyphs };
}

export function layerHeight(l: Layer, width: number) {
  return l.type === "image" ? l.w * width * l.aspect : layoutText(l, width).height;
}

/** Inline text effects (outline, shadow) — identical CSS in the browser and in Satori. */
export function textEffects(l: Pick<TextLayer, "stroke" | "shadow">, size: number): CSSProperties {
  const st: CSSProperties = {};
  if (l.stroke && l.stroke.width > 0) st.WebkitTextStroke = `${+(l.stroke.width * size).toFixed(2)}px ${l.stroke.color}`;
  if (l.shadow) st.textShadow = `${+(l.shadow.x * size).toFixed(2)}px ${+(l.shadow.y * size).toFixed(2)}px ${+(l.shadow.blur * size).toFixed(2)}px ${l.shadow.color}`;
  return st;
}

/** The text of a layer laid out in its box (absolute children only — no browser text flow). */
export function TextContent({ l, box, fonts }: { l: TextLayer; box: TextBox; fonts: FontMap }) {
  const base: CSSProperties = { fontFamily: fonts[l.font], fontWeight: FONT_WEIGHT[l.font], fontSize: box.size, color: l.color, lineHeight: 1, whiteSpace: "pre", ...textEffects(l, box.size) };
  if (box.glyphs) {
    return (
      <>
        {box.glyphs.map((g, i) => (
          <div key={i} style={{ position: "absolute", display: "flex", left: g.x - g.w / 2 - box.size, top: g.y - box.size * 0.65, width: g.w + box.size * 2, height: box.size * 1.3, alignItems: "center", justifyContent: "center", transform: `rotate(${g.r.toFixed(2)}deg)` }}>
            <span style={base}>{g.ch}</span>
          </div>
        ))}
      </>
    );
  }
  const align = l.align ?? "center";
  const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
  const lineH = box.size * box.lineHeight;
  const top0 = (box.height - lineH * box.lines.length) / 2;
  return (
    <>
      {box.lines.map((line, i) => (
        <div key={i} style={{ position: "absolute", display: "flex", left: 0, top: top0 + i * lineH, width: box.width, height: lineH, alignItems: "center", justifyContent: justify }}>
          <span style={box.spacing ? { ...base, letterSpacing: +box.spacing.toFixed(2) } : base}>{line || " "}</span>
        </div>
      ))}
    </>
  );
}

const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", display: "flex", ...s });

function Centered({ children, top, height, width }: { children: React.ReactNode; top: number; height: number; width: number }) {
  return <div style={abs({ left: 0, top, width, height, alignItems: "center", justifyContent: "center" })}>{children}</div>;
}

function TemplateArt({ template, values, W, H, fonts, ink, font }: { template: TemplateKey; values: Record<string, string>; W: number; H: number; fonts: FontMap; ink: string; font: FontKey }) {
  if (template === "jersey") {
    const name = values.name ?? "";
    const number = values.number ?? "";
    return (
      <>
        {name && (
          <Centered top={H * 0.06} height={H * 0.16} width={W}>
            <span style={{ fontFamily: fonts.sport, fontSize: Math.min(H * 0.12, fitFontSize(name, "sport", W * 0.8)), color: ink, letterSpacing: W * 0.004, lineHeight: 1 }}>{name}</span>
          </Centered>
        )}
        {number && (
          <Centered top={H * 0.22} height={H * 0.56} width={W}>
            <span style={{ fontFamily: fonts.sport, fontSize: H * 0.5, color: ink, lineHeight: 1 }}>{number}</span>
          </Centered>
        )}
      </>
    );
  }
  if (template === "pueblo") {
    const pueblo = values.pueblo ?? values.name ?? "";
    const sub = values.sub ?? "DE TODA LA VIDA";
    return (
      <>
        <Centered top={H * 0.18} height={H * 0.06} width={W}>
          <span style={{ fontFamily: fonts.sans, fontSize: H * 0.035, color: ink, letterSpacing: W * 0.012 }}>ORGULLO DE</span>
        </Centered>
        <Centered top={H * 0.25} height={H * 0.22} width={W}>
          <span style={{ fontFamily: fonts[font], fontSize: Math.min(H * 0.2, fitFontSize(pueblo, font, W * 0.86)), color: ink, lineHeight: 1 }}>{pueblo}</span>
        </Centered>
        <div style={abs({ left: W * 0.12, top: H * 0.5, width: W * 0.76, height: H * 0.025, background: "#c8102e", borderRadius: H })} />
        <div style={abs({ left: W * 0.2, top: H * 0.535, width: W * 0.68, height: H * 0.02, background: "#ffc400", borderRadius: H })} />
        <Centered top={H * 0.57} height={H * 0.06} width={W}>
          <span style={{ fontFamily: fonts.sans, fontSize: H * 0.032, color: ink, letterSpacing: W * 0.01 }}>{sub}</span>
        </Centered>
      </>
    );
  }
  if (template === "year") {
    const year = values.year ?? "";
    const name = values.name ?? "";
    return (
      <>
        <Centered top={H * 0.2} height={H * 0.07} width={W}>
          <span style={{ fontFamily: fonts.serif, fontSize: H * 0.05, color: ink, letterSpacing: W * 0.02 }}>DESDE</span>
        </Centered>
        <Centered top={H * 0.28} height={H * 0.26} width={W}>
          <span style={{ fontFamily: fonts.serif, fontSize: H * 0.22, color: ink, lineHeight: 1 }}>{year}</span>
        </Centered>
        {name && (
          <Centered top={H * 0.56} height={H * 0.08} width={W}>
            <span style={{ fontFamily: fonts.sans, fontSize: Math.min(H * 0.05, fitFontSize(name, "sans", W * 0.7)), color: ink, letterSpacing: W * 0.008 }}>{name}</span>
          </Centered>
        )}
      </>
    );
  }
  // text
  const text = values.text ?? values.name ?? "";
  return (
    <Centered top={H * 0.3} height={H * 0.3} width={W}>
      <span style={{ fontFamily: fonts[font], fontSize: Math.min(H * 0.2, fitFontSize(text, font, W * 0.86)), color: ink, lineHeight: 1.05 }}>{text}</span>
    </Centered>
  );
}

export function Artwork({
  value,
  width,
  height,
  fonts,
  ink = "#0d0d0d",
  font = "display",
  imageSrc,
}: {
  value: Personalization;
  width: number;
  height: number;
  fonts: FontMap;
  ink?: string;
  font?: FontKey;
  /** Optional override for image sources (server passes data URIs). */
  imageSrc?: (path: string, url: string) => string;
}) {
  return (
    <div style={{ position: "relative", display: "flex", width, height, overflow: "hidden" }}>
      {value.mode === "fields" ? (
        <TemplateArt template={value.template} values={value.values} W={width} H={height} fonts={fonts} ink={ink} font={font} />
      ) : (
        <>
          {value.background && <div style={abs({ left: 0, top: 0, width, height, background: value.background })} />}
          {value.layers.map((l) => (
            <LayerView key={l.id} l={l} width={width} height={height} fonts={fonts} imageSrc={imageSrc} />
          ))}
        </>
      )}
    </div>
  );
}

/** One designer layer at its place in a `width` × `height` print area. */
export function LayerView({ l, width, height, fonts, imageSrc }: { l: Layer; width: number; height: number; fonts: FontMap; imageSrc?: (path: string, url: string) => string }) {
  const w = l.w * width;
  if (l.type === "image") {
    const h = w * l.aspect;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageSrc ? imageSrc(l.path, l.url) : l.url} alt="" width={w} height={h} style={{ position: "absolute", left: l.x * width - w / 2, top: l.y * height - h / 2, width: w, height: h, transform: `rotate(${l.rotation}deg)`, objectFit: "contain" }} />
    );
  }
  const box = layoutText(l, width);
  return (
    <div style={abs({ left: l.x * width - box.width / 2, top: l.y * height - box.height / 2, width: box.width, height: box.height, transform: `rotate(${l.rotation}deg)` })}>
      <TextContent l={l} box={box} fonts={fonts} />
    </div>
  );
}
