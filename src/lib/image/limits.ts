import { WASM_CODECS_KEY } from "./types";

/**
 * Cloudflare Workers memory budget for one image surface. An isolate has 128 MB in total (code, heap, every
 * WASM codec's linear memory, which never shrinks), and a decoded surface briefly exists twice (WASM heap + JS
 * copy). ≈ 2048 × 2048 = 16.8 MB of RGBA; a pipeline holds three to five such buffers at peak.
 * Measured under Node with the same codecs: a 2048² decode → resize → encode peaks at roughly +25 MB, while a
 * 2400 × 3200 resvg (next/og) print render grew RSS by ~100 MB — far beyond what a Worker can hold.
 */
export const WORKERS_MAX_PIXELS = 4_200_000;

export class ImageTooLargeError extends Error {
  constructor(what: string, width: number, height: number) {
    super(`IMAGE_TOO_LARGE_FOR_WORKER: ${what} ${width}x${height} exceeds ${WORKERS_MAX_PIXELS} px`);
    this.name = "ImageTooLargeError";
  }
}

/** True on Cloudflare Workers (the custom worker entry installs the WASM codecs). */
export const isWorkersImageRuntime = () => Boolean((globalThis as Record<string, unknown>)[WASM_CODECS_KEY]);

/**
 * Throw a normal, catchable error before rendering a surface that cannot fit in Worker memory (print files at
 * provider resolution), instead of letting the isolate be killed mid-request. No-op on Node / Netlify.
 */
export function assertFitsRuntime(width: number, height: number, what: string) {
  if (isWorkersImageRuntime() && width * height > WORKERS_MAX_PIXELS) throw new ImageTooLargeError(what, width, height);
}
