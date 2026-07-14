"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_LOCALE,
  directionForLocale,
  getCopy,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  type Locale,
  type TextDirection,
  type UiCopy,
} from "@/lib/i18n";

export interface LocaleContextValue {
  locale: Locale;
  direction: TextDirection;
  copy: UiCopy;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function localeFromCookie(): Locale | null {
  if (typeof document === "undefined") return null;

  const value = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);

  if (!value) return null;

  try {
    const decoded = decodeURIComponent(value);
    return isLocale(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

function localeFromStorage(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.lang = locale;
  root.dir = directionForLocale(locale);
  root.dataset.locale = locale;
}

function persistLocale(locale: Locale) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // The cookie still preserves the preference when storage is unavailable.
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const updateLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    applyDocumentLocale(nextLocale);
    persistLocale(nextLocale);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((currentLocale) => {
      const nextLocale: Locale = currentLocale === "en" ? "fa" : "en";
      applyDocumentLocale(nextLocale);
      persistLocale(nextLocale);
      return nextLocale;
    });
  }, []);

  useEffect(() => {
    // Cookie takes priority because it can also be read by the server layout and
    // therefore matches the SSR language. Storage is a resilience fallback.
    const persistedLocale = localeFromCookie() ?? localeFromStorage();
    const resolvedLocale = persistedLocale ?? initialLocale;
    applyDocumentLocale(resolvedLocale);
    persistLocale(resolvedLocale);
    const hydrationTimer = window.setTimeout(() => {
      setLocaleState(resolvedLocale);
    }, 0);

    const synchronizeTabs = (event: StorageEvent) => {
      if (event.key !== LOCALE_STORAGE_KEY || !isLocale(event.newValue)) return;
      setLocaleState(event.newValue);
      applyDocumentLocale(event.newValue);
      persistLocale(event.newValue);
    };

    window.addEventListener("storage", synchronizeTabs);
    return () => {
      window.clearTimeout(hydrationTimer);
      window.removeEventListener("storage", synchronizeTabs);
    };
  }, [initialLocale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      direction: directionForLocale(locale),
      copy: getCopy(locale),
      setLocale: updateLocale,
      toggleLocale,
    }),
    [locale, toggleLocale, updateLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useLocale must be used inside LocaleProvider.");
  }
  return value;
}
