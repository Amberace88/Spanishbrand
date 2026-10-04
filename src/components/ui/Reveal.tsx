import type { CSSProperties, ReactNode } from "react";

export { MaskLines } from "./MaskLines";

/**
 * Scroll-triggered editorial reveal — CSS only (scroll-driven animation, see `.reveal` in globals.css).
 * No JavaScript and no hydration: content already in the viewport paints visible with the HTML (it used to
 * wait for hydration at opacity 0, delaying LCP), content below the fold rises in as it enters the viewport.
 * Browsers without `animation-timeline` and reduced-motion users simply see the content.
 * `delay` (seconds, as before) staggers siblings by starting their reveal a little later in the scroll.
 */
export function Reveal({ children, delay = 0, y = 20, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const style = { "--rv-y": `${y}px`, ...(delay ? { "--rv-start": `${Math.min(40, Math.round(delay * 100))}%` } : {}) } as CSSProperties;
  return (
    <div className={className ? `reveal ${className}` : "reveal"} style={style}>
      {children}
    </div>
  );
}
