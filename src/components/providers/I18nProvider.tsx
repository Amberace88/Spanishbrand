"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Dict, Locale, TKey } from "@/lib/i18n/dictionaries";

/* The client gets only the active locale's strings (merged over Spanish on the server, see `messagesFor`), not the
 * full nine-language dictionary module (~50 KB gzipped of JavaScript on every page). */
const Ctx = createContext<{ locale: Locale; messages: Dict }>({ locale: "es", messages: {} });

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Dict; children: ReactNode }) {
  return <Ctx.Provider value={{ locale, messages }}>{children}</Ctx.Provider>;
}

export function useLocale() {
  return useContext(Ctx).locale;
}

export function useT() {
  const { messages } = useContext(Ctx);
  return (key: TKey, vars?: Record<string, string | number>) => {
    let s = messages[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };
}
