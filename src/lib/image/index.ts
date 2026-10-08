import "server-only";
import { WASM_CODECS_KEY, type ImageOps, type WasmImageCodecs } from "./types";

export type { ImageOps, RawRGBA, OutputFormat, Rgba } from "./types";
export { assertFitsRuntime, ImageTooLargeError, isWorkersImageRuntime, WORKERS_MAX_PIXELS } from "./limits";

let cached: Promise<ImageOps> | null = null;

/**
 * The image implementation for this runtime: WASM codecs on Cloudflare Workers (installed on globalThis by
 * cloudflare/worker.ts), sharp everywhere else (Netlify / Node / tests). Both are loaded lazily, so the Workers
 * bundle never evaluates sharp and the Node bundle never evaluates the WASM path.
 */
export function imageOps(): Promise<ImageOps> {
  return (cached ??= (async () => {
    const codecs = (globalThis as Record<string, unknown>)[WASM_CODECS_KEY] as WasmImageCodecs | undefined;
    if (codecs) return (await import("./wasm-ops")).createWasmOps(codecs);
    return (await import("./sharp-ops")).sharpOps;
  })().catch((e) => {
    cached = null;
    throw e;
  }));
}
