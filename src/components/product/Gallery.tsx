"use client";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn } from "lucide-react";
import { useT } from "@/components/providers/I18nProvider";

const Lightbox = dynamic(() => import("./Lightbox").then((m) => m.Lightbox), { ssr: false });

export type GalleryImage = { url: string; alt: string | null; kind?: string; color?: string | null };

const ZOOM = 2.4;
/** Desktop stage width: 58% of the 1440px container minus the thumbnail rail. */
const STAGE_SIZES = "(min-width: 1440px) 760px, (min-width: 1024px) 52vw, 100vw";
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function useMedia(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

/**
 * Product gallery.
 * - lg+: vertical thumbnail rail + large square stage (object-contain, crossfade), hover pan-zoom, arrows, counter.
 * - below lg: full-bleed scroll-snap carousel with dots / progress.
 * - click / tap / Enter opens the fullscreen Lightbox.
 * One DOM for every breakpoint, so each photo is only downloaded once.
 */
export function Gallery({ images, name, overlay, initialIndex = 0, onIndexChange }: { images: GalleryImage[]; name: string; overlay?: ReactNode; initialIndex?: number; onIndexChange?: (i: number) => void }) {
  const t = useT();
  const n = images.length;
  const start = Math.min(Math.max(0, initialIndex), Math.max(0, n - 1));
  const [index, setIndex] = useState(start);
  const [seen, setSeen] = useState(() => new Set([start]));
  const [lightbox, setLightbox] = useState(false);
  const [zooming, setZooming] = useState(false);
  const [zoomUsed, setZoomUsed] = useState(false);
  const desktop = useMedia("(min-width: 1024px)");
  const fineHover = useMedia("(hover: hover) and (pointer: fine)");
  const trackRef = useRef<HTMLDivElement>(null);
  const zoomImgRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const select = useCallback(
    (i: number) => {
      setIndex(i);
      setSeen((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
      onIndexChange?.(i);
    },
    [onIndexChange],
  );

  /** select + bring the slide into view (mobile scroller) */
  const go = useCallback(
    (i: number, behavior: ScrollBehavior = "smooth") => {
      if (!n) return;
      const next = (i + n) % n;
      select(next);
      const el = trackRef.current;
      if (el && !desktop) el.scrollTo({ left: next * el.clientWidth, behavior });
    },
    [n, select, desktop],
  );

  // align the scroller with the active slide on mount and when crossing the lg breakpoint
  useIsoLayoutEffect(() => {
    const el = trackRef.current;
    if (el && !desktop) el.scrollLeft = index * el.clientWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop]);

  // keep the active thumbnail visible in the rail
  useEffect(() => {
    const rail = railRef.current;
    const thumb = rail?.children[index] as HTMLElement | undefined;
    if (!rail || !thumb) return;
    const top = thumb.offsetTop;
    if (top < rail.scrollTop || top + thumb.offsetHeight > rail.scrollTop + rail.clientHeight) rail.scrollTo({ top: top - rail.clientHeight / 2 + thumb.offsetHeight / 2, behavior: "smooth" });
  }, [index]);

  function onScroll() {
    const el = trackRef.current;
    if (!el || desktop) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index && i >= 0 && i < n) select(i);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setLightbox(true);
    }
  }

  // hover pan-zoom (desktop mouse only): moves the zoomed layer's origin with the cursor, no re-render per move
  const zoomEnabled = desktop && fineHover;
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!zoomEnabled || e.pointerType !== "mouse") return;
    const overControl = (e.target as HTMLElement).closest("button");
    if (overControl) {
      if (zooming) setZooming(false);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    if (zoomImgRef.current) zoomImgRef.current.style.transformOrigin = `${x}% ${y}%`;
    if (!zooming) setZooming(true);
    if (!zoomUsed) setZoomUsed(true);
  }

  if (!n) return null;
  const multi = n > 1;
  const current = images[index];
  const ctrl =
    "grid h-11 w-11 place-items-center rounded-full border border-line bg-bg/85 text-fg shadow-sm backdrop-blur transition hover:bg-bg focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

  return (
    <div className={multi ? "lg:grid lg:grid-cols-[72px_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[84px_minmax(0,1fr)]" : ""}>
      {/* thumbnail rail (lg+) — absolutely sized so it never grows taller than the stage */}
      {multi && (
        <div className="relative hidden lg:block">
          <div ref={railRef} className="no-scrollbar absolute -inset-1 flex flex-col gap-2.5 overflow-y-auto p-1">
            {images.map((img, i) => (
              <button
                key={img.url + i}
                type="button"
                onClick={() => go(i)}
                onMouseEnter={() => i !== index && select(i)}
                aria-label={t("gallery.show", { n: i + 1 })}
                aria-current={i === index ? "true" : undefined}
                className={`relative aspect-square w-full shrink-0 overflow-hidden rounded-xl bg-surface-2 transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  i === index ? "opacity-100 ring-2 ring-fg ring-offset-2 ring-offset-bg" : "opacity-55 hover:opacity-100"
                }`}
              >
                <Image src={img.url} alt="" fill sizes="84px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        {/* stage */}
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label={t("gallery.label", { name })}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="group @container relative -mx-4 overflow-hidden bg-surface-2 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:mx-0 sm:rounded-2xl"
        >
          {/* soft studio light behind transparent / contained mockups */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_35%,rgba(255,255,255,0.07),transparent_70%)]" />

          <div
            ref={trackRef}
            onScroll={onScroll}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setZooming(false)}
            onClick={() => setLightbox(true)}
            className={`no-scrollbar relative flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain lg:grid lg:overflow-hidden ${zoomEnabled ? "cursor-zoom-in" : "cursor-pointer"}`}
          >
            {images.map((img, i) => {
              const active = i === index;
              const mounted = seen.has(i) || Math.abs(i - index) <= 1;
              return (
                <div
                  key={img.url + i}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={t("gallery.position", { n: i + 1, total: n })}
                  aria-hidden={!active}
                  className={`relative aspect-square w-full shrink-0 snap-center snap-always lg:aspect-auto lg:h-[min(100cqw,calc(100dvh-9rem))] lg:min-h-[420px] lg:[grid-area:1/1] lg:transition-opacity lg:duration-500 lg:ease-out ${active ? "lg:opacity-100" : "lg:pointer-events-none lg:opacity-0"}`}
                >
                  {mounted && (
                    <Image
                      src={img.url}
                      alt={img.alt ?? name}
                      fill
                      sizes={STAGE_SIZES}
                      preload={i === 0 && start === 0}
                      loading={i === 0 && start === 0 ? undefined : "eager"}
                      draggable={false}
                      className={`select-none object-contain transition-transform duration-700 ease-out ${active && zooming ? "lg:scale-[1.02]" : ""}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* hover zoom layer (hi-res, loaded on first hover) */}
          {zoomEnabled && zoomUsed && current && (
            <div aria-hidden className={`pointer-events-none absolute inset-0 z-10 bg-surface-2 transition-opacity duration-200 ${zooming ? "opacity-100" : "opacity-0"}`}>
              <div ref={zoomImgRef} className="absolute inset-0" style={{ transform: `scale(${ZOOM})` }}>
                <Image key={current.url} src={current.url} alt="" fill sizes="1600px" className="object-contain" />
              </div>
            </div>
          )}

          {/* badges */}
          {overlay && <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-col items-start gap-2 sm:left-4 sm:top-4">{overlay}</div>}

          {/* fullscreen */}
          <button type="button" onClick={() => setLightbox(true)} aria-label={t("gallery.open")} className={`${ctrl} absolute right-3 top-3 z-20 h-10 w-10 sm:right-4 sm:top-4 lg:opacity-0 lg:group-hover:opacity-100`}>
            <Maximize2 className="h-4 w-4" />
          </button>

          {multi && (
            <>
              <button type="button" onClick={() => go(index - 1)} aria-label={t("gallery.prev")} className={`${ctrl} absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 opacity-0 group-hover:opacity-100 lg:grid`}>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => go(index + 1)} aria-label={t("gallery.next")} className={`${ctrl} absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 opacity-0 group-hover:opacity-100 lg:grid`}>
                <ChevronRight className="h-5 w-5" />
              </button>
              <p className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-full border border-line bg-bg/80 px-3 py-1 text-xs font-medium tabular-nums text-fg backdrop-blur sm:bottom-4 sm:left-4" aria-live="polite">
                <span className="sr-only">{t("gallery.position", { n: index + 1, total: n })}</span>
                <span aria-hidden>
                  {index + 1} <span className="text-muted">/ {n}</span>
                </span>
              </p>
            </>
          )}

          <p
            aria-hidden
            className={`pointer-events-none absolute bottom-4 right-4 z-20 hidden items-center gap-1.5 rounded-full border border-line bg-bg/80 px-3 py-1 text-xs text-muted backdrop-blur transition-opacity duration-300 ${zoomEnabled ? "lg:flex" : ""} ${zooming ? "opacity-0" : "opacity-0 group-hover:opacity-100"}`}
          >
            <ZoomIn className="h-3.5 w-3.5" /> {t("gallery.zoomHint")}
          </p>
        </div>

        {/* mobile indicators */}
        {multi && (
          <div className="mt-3 flex items-center justify-center gap-3 lg:hidden">
            {n <= 8 ? (
              <div className="flex items-center">
                {images.map((img, i) => (
                  <button key={img.url + i} type="button" onClick={() => go(i)} aria-label={t("gallery.show", { n: i + 1 })} aria-current={i === index ? "true" : undefined} className="grid h-6 place-items-center px-1">
                    <span className={`block h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-6 bg-fg" : "w-1.5 bg-fg/25"}`} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-[3px] w-40 overflow-hidden rounded-full bg-fg/15" aria-hidden>
                <div className="h-full rounded-full bg-fg transition-all duration-300" style={{ width: `${((index + 1) / n) * 100}%` }} />
              </div>
            )}
          </div>
        )}
      </div>

      {lightbox && <Lightbox images={images} name={name} start={index} onClose={() => setLightbox(false)} onIndexChange={(i) => go(i, "instant")} />}
    </div>
  );
}
