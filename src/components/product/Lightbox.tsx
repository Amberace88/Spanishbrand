"use client";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { useT } from "@/components/providers/I18nProvider";
import type { GalleryImage } from "./Gallery";

const MAX_SCALE = 4;
const TAP_SCALE = 2.5;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Zoom = { s: number; x: number; y: number };
const NO_ZOOM: Zoom = { s: 1, x: 0, y: 0 };

/**
 * Fullscreen viewer: swipe / arrows / keyboard between images, tap or click to zoom at a point,
 * pinch and wheel zoom, drag to pan. No dependencies beyond React.
 */
export function Lightbox({ images, name, start, onClose, onIndexChange }: { images: GalleryImage[]; name: string; start: number; onClose: () => void; onIndexChange?: (i: number) => void }) {
  const t = useT();
  const n = images.length;
  const [index, setIndex] = useState(start);
  const [seen, setSeen] = useState(() => new Set([start]));
  const [zoom, setZoomState] = useState<Zoom>(NO_ZOOM);
  const [dragging, setDragging] = useState(false);
  const [shown, setShown] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<Zoom>(NO_ZOOM);
  /** state for rendering + ref for gesture maths between renders */
  const setZoom = useCallback((z: Zoom | ((prev: Zoom) => Zoom)) => {
    const next = typeof z === "function" ? z(zoomRef.current) : z;
    zoomRef.current = next;
    setZoomState(next);
  }, []);

  const select = useCallback(
    (i: number) => {
      setIndex(i);
      setSeen((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
      setZoom(NO_ZOOM);
      onIndexChange?.(i);
    },
    [onIndexChange, setZoom],
  );

  const go = useCallback(
    (i: number) => {
      const next = (i + n) % n;
      select(next);
      const el = trackRef.current;
      if (el) el.scrollTo({ left: next * el.clientWidth, behavior: Math.abs(next - index) > 1 ? "instant" : "smooth" });
    },
    [n, index, select],
  );

  // open: jump to the starting slide, lock page scroll, focus the close button, fade in
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (el) el.scrollLeft = start * el.clientWidth;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    const raf = requestAnimationFrame(() => setShown(true));
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.style.overflow = prevOverflow;
      prevFocus?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keyboard: Esc, arrows, +/-; Tab stays inside the dialog
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "+" || e.key === "=") {
        setZoom((z) => ({ ...z, s: clamp(z.s * 1.5, 1, MAX_SCALE) }));
      } else if (e.key === "-") {
        setZoom((z) => (z.s / 1.5 <= 1.05 ? NO_ZOOM : { ...z, s: z.s / 1.5 }));
      } else if (e.key === "Tab" && dialogRef.current) {
        const f = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, onClose, setZoom]);

  // keep the active slide aligned when the window is resized / rotated
  useEffect(() => {
    const onResize = () => {
      const el = trackRef.current;
      if (el) el.scrollLeft = index * el.clientWidth;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [index]);

  function onScroll() {
    const el = trackRef.current;
    if (!el || zoomRef.current.s > 1) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index && i >= 0 && i < n) select(i);
  }

  // ---- zoom & pan (active slide only) ----------------------------------------------------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; pinchDist: number; pinchScale: number; downX: number; downY: number }>({ moved: false, pinchDist: 0, pinchScale: 1, downX: 0, downY: 0 });

  const bounds = useCallback((z: Zoom): Zoom => {
    const el = stageRef.current;
    if (!el || z.s <= 1) return NO_ZOOM;
    const mx = (el.clientWidth * (z.s - 1)) / 2;
    const my = (el.clientHeight * (z.s - 1)) / 2;
    return { s: z.s, x: clamp(z.x, -mx, mx), y: clamp(z.y, -my, my) };
  }, []);

  /** point relative to the stage centre, in px */
  const rel = (clientX: number, clientY: number) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { px: clientX - r.left - r.width / 2, py: clientY - r.top - r.height / 2 };
  };

  /** zoom to scale `s`, keeping the content under (clientX, clientY) fixed */
  const zoomAt = useCallback(
    (s: number, clientX: number, clientY: number) => {
      const cur = zoomRef.current;
      const { px, py } = rel(clientX, clientY);
      const ns = clamp(s, 1, MAX_SCALE);
      const k = ns / cur.s;
      setZoom(bounds({ s: ns, x: px - (px - cur.x) * k, y: py - (py - cur.y) * k }));
    },
    [bounds, setZoom],
  );

  // wheel zoom needs a non-passive listener
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!stageRef.current?.contains(e.target as Node)) return;
      // horizontal trackpad swipes keep navigating while not zoomed
      if (zoomRef.current.s === 1 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      zoomAt(zoomRef.current.s * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (pointers.current.size === 1) {
      g.moved = false;
      g.downX = e.clientX;
      g.downY = e.clientY;
    }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      g.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      g.pinchScale = zoomRef.current.s;
      g.moved = true;
    }
    if (zoomRef.current.s > 1 || pointers.current.size === 2) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const g = gesture.current;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (Math.hypot(e.clientX - g.downX, e.clientY - g.downY) > 6) g.moved = true;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.pinchDist > 0) zoomAt(g.pinchScale * (dist / g.pinchDist), (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    const z = zoomRef.current;
    if (z.s > 1) setZoom(bounds({ s: z.s, x: z.x + (e.clientX - prev.x), y: z.y + (e.clientY - prev.y) }));
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const wasTap = pointers.current.size === 1 && !gesture.current.moved && e.type === "pointerup";
    pointers.current.delete(e.pointerId);
    if (!pointers.current.size) setDragging(false);
    if (!wasTap) return;
    if (zoomRef.current.s > 1) setZoom(NO_ZOOM);
    else zoomAt(TAP_SCALE, e.clientX, e.clientY);
  }

  const zoomed = zoom.s > 1;
  const btn = "grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("gallery.label", { name })}
      className={`fixed inset-0 z-[200] flex flex-col bg-[#0b0a09] text-white transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
    >
      {/* top bar */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+12px)] sm:px-6">
        <p className="text-sm tabular-nums text-white/80" aria-live="polite">
          <span className="sr-only">{t("gallery.position", { n: index + 1, total: n })}</span>
          <span aria-hidden>
            {index + 1} <span className="text-white/40">/ {n}</span>
          </span>
        </p>
        <p className="hidden min-w-0 flex-1 truncate text-center text-sm text-white/60 sm:block">{name}</p>
        <div className="flex items-center gap-2">
          <button type="button" className={btn} onClick={() => (zoomed ? setZoom(NO_ZOOM) : setZoom({ s: TAP_SCALE, x: 0, y: 0 }))} aria-label={zoomed ? t("gallery.zoomOut") : t("gallery.zoomIn")}>
            {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </button>
          <button ref={closeRef} type="button" className={btn} onClick={onClose} aria-label={t("gallery.close")}>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* slides */}
      <div className="relative min-h-0 flex-1">
        <div ref={trackRef} onScroll={onScroll} className={`no-scrollbar flex h-full snap-x snap-mandatory ${zoomed ? "overflow-hidden" : "overflow-x-auto"}`}>
          {images.map((img, i) => {
            const active = i === index;
            const mounted = seen.has(i) || Math.abs(i - index) <= 1;
            return (
              <div key={img.url + i} className="relative h-full w-full shrink-0 snap-center overflow-hidden px-3 py-2 sm:px-20 sm:py-4" aria-hidden={!active}>
                <div
                  ref={active ? stageRef : undefined}
                  onPointerDown={active ? onPointerDown : undefined}
                  onPointerMove={active ? onPointerMove : undefined}
                  onPointerUp={active ? onPointerUp : undefined}
                  onPointerCancel={active ? onPointerUp : undefined}
                  className={`relative h-full w-full select-none ${active && zoomed ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-zoom-in touch-pan-x"}`}
                >
                  {mounted && (
                    <Image
                      src={img.url}
                      alt={img.alt ?? name}
                      fill
                      sizes="100vw"
                      quality={75}
                      loading={active ? "eager" : "lazy"}
                      draggable={false}
                      className="object-contain will-change-transform"
                      style={active ? { transform: `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.s})`, transition: dragging ? "none" : "transform 260ms cubic-bezier(0.16,1,0.3,1)" } : undefined}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(index - 1)} aria-label={t("gallery.prev")} className={`${btn} absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 sm:grid`}>
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label={t("gallery.next")} className={`${btn} absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 sm:grid`}>
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* thumbnails */}
      {n > 1 && (
        <div className="no-scrollbar flex justify-center-safe gap-2 overflow-x-auto px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => go(i)}
              aria-label={t("gallery.show", { n: i + 1 })}
              aria-current={i === index ? "true" : undefined}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${i === index ? "opacity-100 ring-2 ring-white" : "opacity-45 hover:opacity-90"}`}
            >
              <Image src={img.url} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
