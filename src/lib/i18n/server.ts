import "server-only";
import { cookies } from "next/headers";
import { LOCALES, translate, type Locale, type TKey } from "./dictionaries";

export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const v = c.get("locale")?.value as Locale | undefined;
  return v && (LOCALES as readonly string[]).includes(v) ? v : "es";
}

export async function getT() {
  const locale = await getLocale();
  return Object.assign((key: TKey, vars?: Record<string, string | number>) => translate(locale, key, vars), { locale });
}
