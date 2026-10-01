import type { Locale } from "./dictionaries";

/** Page-level copy blocks: Spanish is the source; English/German fall back to Spanish per key. */
export function pick<T extends Record<string, string>>(locale: Locale | string, copy: { es: T; en?: Partial<T>; de?: Partial<T> }): T {
  const extra = (copy as Record<string, Partial<T> | undefined>)[locale];
  return extra ? { ...copy.es, ...extra } : copy.es;
}
