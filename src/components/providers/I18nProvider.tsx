"use client";
import { createContext, useContext, type ReactNode } from "react";
import { translate, type Locale, type TKey } from "@/lib/i18n/dictionaries";

const Ctx = createContext<Locale>("es");

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export function useLocale() {
  return useContext(Ctx);
}

export function useT() {
  const locale = useContext(Ctx);
  return (key: TKey, vars?: Record<string, string | number>) => translate(locale, key, vars);
}
