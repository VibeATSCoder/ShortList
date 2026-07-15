"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

import { getCopy, LOCALE_COOKIE, LOCALE_STORAGE_KEY, type Locale, type TextDirection, type UiCopy } from "@/lib/i18n";

export interface LocaleContextValue {
  locale: Locale;
  direction: TextDirection;
  copy: UiCopy;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode; initialLocale?: Locale }) {
  useEffect(() => {
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    document.documentElement.dataset.locale = "en";
    try { window.localStorage.setItem(LOCALE_STORAGE_KEY, "en"); } catch { /* optional preference storage */ }
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${LOCALE_COOKIE}=en; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  }, []);

  const value = useMemo<LocaleContextValue>(() => ({
    locale: "en",
    direction: "ltr",
    copy: getCopy("en"),
    setLocale: () => undefined,
    toggleLocale: () => undefined,
  }), []);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider.");
  return value;
}
