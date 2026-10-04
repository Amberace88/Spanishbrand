"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { JerseyBack } from "@/components/art/Jersey";
import { IconArrow } from "@/components/ui/Icons";
import { Artwork, BROWSER_FONTS, FONT_WEIGHT } from "@/lib/personalization/artwork";
import { FONT_LABEL, type AnyFontKey, type Layer } from "@/lib/personalization/types";
import { KINDS } from "@/lib/personalization/kinds";
import { Silhouette } from "@/components/designer/Silhouette";
import { TEMPLATES, paletteFor, stackLayers } from "@/components/designer/templates";
import { fitPrintBox, usePrintBox, type PrintBox } from "./teeGeometry";

/* Homepage hero side tiles: a quick, live edit right in the tile; the full editor is one click away. */

const tileShell = "group relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] p-5 sm:p-7 lg:p-6";
const tileBase = `${tileShell} min-h-[300px] sm:min-h-[320px] lg:min-h-0`;
// square that always covers the tile, so overlay coordinates stay glued to the photo at any tile ratio
// the size container has no padding, so 100cqw/100cqh are the full tile
const coverBox = "pointer-events-none absolute inset-0 overflow-hidden [container-type:size]";
const coverStyle = { width: "max(100cqw, 100cqh)", height: "max(100cqw, 100cqh)" } as const;

function Head({ href, badge, badgeCls, ring }: { href: string; badge: string; badgeCls: string; ring: string }) {
  return (
    <div className="relative z-10 flex items-start justify-between">
      <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${badgeCls}`}>{badge}</span>
      <Link href={href} aria-label={badge} className={`grid h-10 w-10 place-items-center rounded-full border transition-all duration-300 hover:rotate-[-45deg] ${ring}`}>
        <IconArrow className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function JerseyTile({ photo, badge, title, labels }: { photo: string | null; badge: string; title: string; labels: { name: string; number: string; go: string } }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [num, setNum] = useState("");
  const shownName = (name.trim() || "TU NOMBRE").toUpperCase().slice(0, 12);
  const shownNum = num || "10";
  const go = () => router.push(`/personaliza?t=jersey${name.trim() ? `&nombre=${encodeURIComponent(name.trim())}` : ""}${num ? `&numero=${num}` : ""}`);
  const nameSize = Math.min(6.2, 52 / Math.max(6, shownName.length)); // % of the square
  // lettering block (name 41.5 % → number bottom ≈ 61 %): the photo rises on short tiles so it never sits under the title
  const { setTileEl, setCtrlEl, fit } = useBoxFit(photo ? JERSEY_LETTERING : null);

  return (
    <div ref={setTileEl} data-tile="jersey" className={`${tileBase} ${photo ? "bg-[#0b0b0b] text-white" : "bg-surface-2"}`}>
      {photo ? (
        <div className={coverBox}><div className="absolute left-1/2 top-1/2" style={{ ...coverStyle, transform: `translate(-50%, calc(-50% + ${fit.dy}px))` }}>
          <Image src={photo} alt="" fill sizes="(min-width:1024px) 34vw, 100vw" className="object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]" />
          {/* live lettering printed on the jersey back */}
          <div className="absolute inset-x-0 text-center font-[family-name:var(--font-display)] font-bold uppercase leading-none text-[#e0b84a]" style={{ top: "41.5%", fontSize: `${nameSize}cqmax`, letterSpacing: "0.04em", textShadow: "0 1px 0 rgba(0,0,0,.35)", opacity: 0.94 }}>
            {shownName}
          </div>
          <div className="absolute inset-x-0 text-center font-[family-name:var(--font-display)] font-bold leading-none text-[#e0b84a]" style={{ top: "47%", fontSize: "14cqmax", textShadow: "0 2px 0 rgba(0,0,0,.35)", opacity: 0.94 }}>
            {shownNum}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />
        </div></div>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 top-14 bottom-28 flex items-center justify-center">
          <div className="aspect-square h-full max-w-full">
            <JerseyBack name={shownName} number={shownNum} shirt="#0d0d0d" ink="#e0b84a" trim="#c8102e" />
          </div>
        </div>
      )}
      <Head href="/personaliza" badge={badge} badgeCls="bg-fg text-bg" ring={photo ? "border-white/40 bg-black/20 backdrop-blur hover:bg-white hover:text-[#0d0d0d]" : "border-line hover:bg-fg hover:text-bg"} />
      <div ref={setCtrlEl} className="relative z-10">
        <p className="headline text-2xl uppercase leading-[1.05] sm:text-3xl">{title}</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 12))} placeholder={labels.name} aria-label={labels.name} className="min-w-0 flex-1 rounded-full border border-white/25 bg-black/40 px-4 py-2.5 text-sm uppercase text-white placeholder:normal-case placeholder:text-white/60 backdrop-blur focus:border-[#e0b84a] focus:outline-none" />
          <input value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="10" aria-label={labels.number} inputMode="numeric" className="w-14 rounded-full border border-white/25 bg-black/40 px-3 py-2.5 text-center text-sm text-white placeholder:text-white/60 backdrop-blur focus:border-[#e0b84a] focus:outline-none" />
          <button aria-label={labels.go} className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-[#e0b84a] text-[#0d0d0d] transition hover:scale-105">
            <IconArrow className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}


/* ───────── "Diseña tú mismo" tile: live text on the tee in the designer's own fonts ───────── */

const INKS = [
  { hex: "#c8102e", label: "Rojo" },
  { hex: "#c9a227", label: "Oro" },
  { hex: "#111111", label: "Negro" },
  { hex: "#14213d", label: "Marino" },
];
const TILE_FONTS: AnyFontKey[] = ["serif", "sport", "script", "varsity"];
const TILE_TPLS: { key: string; label: string }[] = [
  { key: "dorsal", label: "Nombre + nº" },
  { key: "familia", label: "Familia" },
  { key: "pena", label: "Peña" },
  { key: "fecha", label: "Fecha" },
];
/** Used while a photo cannot be measured: chest box of a centred folded tee. */
// measured on the campaign photo (folded tee): centred on the chest, just under the ribbed collar
const FALLBACK_BOX: PrintBox = { left: 39.5, top: 32, width: 25, height: 30 };
/** Jersey back lettering (name + number), % of the cover square. */
const JERSEY_LETTERING: PrintBox = { left: 30, top: 41.5, width: 40, height: 19.5 };
/** Never shrink the print area below this share of the measured chest box. */
const MIN_SCALE = 0.62;

/** Width of an element that may mount later (callback ref → the observer follows the element). */
function useWidth<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, w] as const;
}

/**
 * Observes a photo tile and its bottom controls block and fits `box` (in % of the cover square) above the controls.
 * `foldRow` > 0 enables a compact control set (saving that many px) when the box would otherwise shrink below ~80 %.
 */
function useBoxFit(box: PrintBox | null, foldRow = 0) {
  const [tileEl, setTileEl] = useState<HTMLDivElement | null>(null);
  const [ctrlEl, setCtrlEl] = useState<HTMLDivElement | null>(null);
  const [fit, setFit] = useState<{ dy: number; scale: number }>({ dy: 0, scale: 1 });
  const [ctrlH, setCtrlH] = useState(0);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (!tileEl || !ctrlEl || !box) return;
    const run = () => {
      const t = tileEl.getBoundingClientRect();
      const c = ctrlEl.getBoundingClientRect();
      if (!t.width || !t.height) return;
      const ctrl = t.bottom - c.top;
      const r = fitPrintBox(t.width, t.height, ctrl, box);
      // switch to compact when the box would get small, back only when the full set fits comfortably again
      if (foldRow) setCompact((was) => (was ? fitPrintBox(t.width, t.height, ctrl + foldRow, box).scale < 0.9 : r.scale < 0.82));
      setFit({ dy: Math.round(r.dy), scale: Math.max(MIN_SCALE, r.scale) });
      setCtrlH(Math.round(c.height));
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(tileEl);
    ro.observe(ctrlEl);
    return () => ro.disconnect();
  }, [tileEl, ctrlEl, box, foldRow]);
  return { setTileEl, setCtrlEl, ctrlH, fit, compact };
}

export function DesignTile({ photo, badge, title, labels }: { photo: string | null; badge: string; title: string; labels: { text: string; go: string; font?: string; tpl?: string } }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [ink, setInk] = useState(INKS[0].hex);
  const [font, setFont] = useState<AnyFontKey>("serif");
  const [tpl, setTpl] = useState<string | null>(null);
  const detected = usePrintBox(photo);
  void detected; // automatic detection mis-read the collar on the real photo: use the measured box
  const measured = photo ? FALLBACK_BOX : null;
  const template = tpl ? TEMPLATES.find((x) => x.key === tpl) ?? null : null;
  const [ref, bw] = useWidth<HTMLDivElement>();

  // geometry: the photo moves by transform only (no layout shift); one control row folds away on short tiles
  const { setTileEl, setCtrlEl, ctrlH, fit, compact } = useBoxFit(measured, 34);
  const [toolTab, setToolTab] = useState<"style" | "tpl">("style");

  const box = measured
    ? { left: measured.left + (measured.width * (1 - fit.scale)) / 2, top: measured.top, width: measured.width * fit.scale, height: measured.height * fit.scale }
    : null;
  const aspect = box ? box.height / box.width : 4 / 3;

  const layers = useMemo<Layer[]>(() => {
    const pal = { ...paletteFor(false), ink, accent: ink === "#111111" ? "#a3162b" : ink };
    if (template) return stackLayers(template.build(text.trim() || template.sample), aspect, pal, { top: true });
    const shown = text.trim() || "Aa";
    return [{ id: "t", type: "text", text: shown, font, color: ink, x: 0.5, y: 0.3, w: Math.min(0.92, 0.16 * Math.max(3, [...shown].length)), rotation: 0 }];
  }, [template, text, aspect, ink, font]);

  const go = () => {
    const q = new URLSearchParams({ p: "camiseta-personalizada" });
    if (text.trim()) q.set("texto", text.trim());
    q.set("tinta", ink);
    q.set("font", font);
    if (tpl) q.set("tpl", tpl);
    router.push(`/disena?${q.toString()}`);
  };

  const print = (
    <div ref={ref} className="absolute" style={box ? { left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` } : undefined}>
      <div className="absolute -inset-[3%] rounded-[4px] border-2 border-dashed border-[#c8102e]/60" />
      {bw > 0 && (
        <div className="absolute inset-0" style={{ mixBlendMode: photo ? "multiply" : undefined }}>
          <Artwork value={{ mode: "designer", placement: "front", layers }} width={bw} height={bw * aspect} fonts={BROWSER_FONTS} />
        </div>
      )}
    </div>
  );
  const spec = KINDS.tee;
  const chip = (on: boolean) => `shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${on ? "border-white bg-white text-[#c8102e]" : "border-white/30 bg-black/20 backdrop-blur hover:border-white/70"}`;

  const fonts = (
    <div className="flex shrink-0 gap-1" role="group" aria-label={labels.font ?? "Tipografía"}>
      {TILE_FONTS.map((f) => (
        <button key={f} type="button" onClick={() => (setFont(f), setTpl(null))} aria-pressed={!tpl && font === f} title={FONT_LABEL[f]} className={`grid h-8 ${compact ? "w-8" : "w-9"} place-items-center rounded-lg border text-[15px] leading-none transition ${!tpl && font === f ? "border-white bg-white text-[#c8102e]" : "border-white/30 bg-black/20 backdrop-blur hover:border-white/70"}`} style={{ fontFamily: BROWSER_FONTS[f], fontWeight: FONT_WEIGHT[f] }}>
          Aa
        </button>
      ))}
    </div>
  );
  const inks = (
    <div className="flex shrink-0 gap-1">
      {INKS.map((c) => (
        <button key={c.hex} type="button" aria-label={c.label} aria-pressed={ink === c.hex} onClick={() => setInk(c.hex)} className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${ink === c.hex ? "border-white" : "border-white/30"}`} style={{ background: c.hex }} />
      ))}
    </div>
  );
  const tpls = (
    <div className="no-scrollbar flex min-w-0 gap-1.5 overflow-x-auto" role="group" aria-label={labels.tpl ?? "Plantillas"}>
      {TILE_TPLS.map((x) => (
        <button key={x.key} type="button" onClick={() => setTpl(tpl === x.key ? null : x.key)} aria-pressed={tpl === x.key} className={chip(tpl === x.key)}>
          {x.label}
        </button>
      ))}
    </div>
  );

  return (
    <div ref={setTileEl} data-tile="design" className={`${photo ? `${tileShell} min-h-[400px] lg:min-h-0` : tileBase} bg-[#c8102e] text-white`}>
      {photo ? (
        <div className={coverBox}>
          <div className="absolute left-1/2 top-1/2" style={{ ...coverStyle, transform: `translate(-50%, calc(-50% + ${fit.dy}px))` }}>
            <Image src={photo} alt="" fill sizes="(min-width:1024px) 34vw, 100vw" className="object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]" />
            {/* print area measured on the photo: centred on the chest, under the collar; shrinks to fit short tiles */}
            {box && <div className="absolute inset-0">{print}</div>}
            <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/30 to-transparent" />
          </div>
          {/* legibility wash sized to the controls block, not to the photo */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#7d0a1d] from-35% via-[#7d0a1d]/70 via-70% to-transparent" style={{ height: ctrlH ? `calc(${ctrlH}px + 3.5rem)` : "55%" }} />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 top-12 bottom-[11.5rem] flex items-center justify-center">
          <div className="relative aspect-square h-full max-w-full">
            <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full drop-shadow-[0_18px_24px_rgba(0,0,0,0.3)]">
              <Silhouette spec={spec} color="#f7f4ee" />
            </svg>
            <div className="absolute" style={{ left: `${spec.zone.left}%`, top: `${spec.zone.top}%`, width: `${spec.zone.width}%`, aspectRatio: `1 / ${spec.aspect}` }}>
              <div ref={ref} className="absolute inset-0">
                {bw > 0 && <Artwork value={{ mode: "designer", placement: "front", layers }} width={bw} height={bw * spec.aspect} fonts={BROWSER_FONTS} />}
              </div>
              <div className="absolute -inset-[3%] rounded-[4px] border-2 border-dashed border-[#c8102e]/50" />
            </div>
          </div>
        </div>
      )}
      <Head href="/disena" badge={badge} badgeCls="bg-white text-[#c8102e]" ring="border-white/40 bg-black/10 backdrop-blur hover:bg-white hover:text-[#c8102e]" />
      <div ref={setCtrlEl} className="relative z-10">
        <p className={`headline uppercase leading-[1.05] ${compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}>{title}</p>
        {compact ? (
          /* short tiles: one tool row, switched between style (font + ink) and templates */
          <div className="mt-2 flex h-8 items-center gap-1">
            <button
              type="button"
              onClick={() => setToolTab(toolTab === "style" ? "tpl" : "style")}
              aria-pressed={toolTab === "tpl"}
              aria-label={labels.tpl ?? "Plantillas"}
              title={labels.tpl ?? "Plantillas"}
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border backdrop-blur transition ${toolTab === "tpl" ? "border-white bg-white text-[#c8102e]" : "border-white/30 bg-black/25 hover:border-white/70"}`}
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
                <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
                <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <rect x="9" y="9" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
              </svg>
            </button>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-white/30" aria-hidden />
            {toolTab === "style" ? (
              <div className="no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto">
                {fonts}
                <span className="h-5 w-px shrink-0 bg-white/30" aria-hidden />
                {inks}
              </div>
            ) : (
              tpls
            )}
          </div>
        ) : (
          <>
            <div className="mt-2.5 flex items-center gap-1.5">
              {fonts}
              <span className="mx-1 h-5 w-px bg-white/30" aria-hidden />
              {inks}
            </div>
            <div className="mt-2">{tpls}</div>
          </>
        )}
        <form
          className={`${compact ? "mt-2" : "mt-2.5"} flex items-center gap-2`}
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value.slice(0, 24))} placeholder={template ? template.field : labels.text} aria-label={labels.text} className="min-w-0 flex-1 rounded-full border border-white/30 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/70 backdrop-blur focus:border-white focus:outline-none" />
          <button aria-label={labels.go} className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-white text-[#c8102e] transition hover:scale-105">
            <IconArrow className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
