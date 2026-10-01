/**
 * One renderer for both the live preview (browser) and the print file (server, Satori → PNG),
 * so what the customer sees is what gets printed. Uses only Satori-compatible inline styles.
 */
import type { CSSProperties } from "react";
import type { FontKey, Personalization, TemplateKey } from "./types";

export type FontMap = Record<FontKey, string>;

/** Browser font stacks (loaded via @fontsource in globals.css). */
export const BROWSER_FONTS: FontMap = {
  display: "Bricolage Grotesque Variable, Inter Variable, sans-serif",
  serif: "Cinzel Variable, Georgia, serif",
  sans: "Inter Variable, sans-serif",
  script: "Pacifico, cursive",
  sport: "Anton, Impact, sans-serif",
};

/** Satori font family names (registered in render.tsx). */
export const PRINT_FONTS: FontMap = { display: "Bricolage", serif: "Cinzel", sans: "Inter", script: "Pacifico", sport: "Anton" };

const WIDTH_FACTOR: Record<FontKey, number> = { display: 0.6, serif: 0.78, sans: 0.62, script: 0.62, sport: 0.47 };

/** Font size so that `text` spans roughly `targetWidth` px. Same formula for preview and print. */
export function fitFontSize(text: string, font: FontKey, targetWidth: number) {
  const n = Math.max(1, [...text].length);
  return Math.max(1, targetWidth / (n * WIDTH_FACTOR[font]));
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
        value.layers.map((l) => {
          const w = l.w * width;
          if (l.type === "image") {
            const h = w * l.aspect;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={l.id} src={imageSrc ? imageSrc(l.path, l.url) : l.url} alt="" width={w} height={h} style={{ position: "absolute", left: l.x * width - w / 2, top: l.y * height - h / 2, width: w, height: h, transform: `rotate(${l.rotation}deg)`, objectFit: "contain" }} />
            );
          }
          const size = fitFontSize(l.text, l.font, w);
          const h = size * 1.3;
          return (
            <div key={l.id} style={abs({ left: l.x * width - w / 2, top: l.y * height - h / 2, width: w, height: h, alignItems: "center", justifyContent: "center", transform: `rotate(${l.rotation}deg)` })}>
              <span style={{ fontFamily: fonts[l.font], fontSize: size, color: l.color, lineHeight: 1, whiteSpace: "nowrap" }}>{l.text}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
