import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";

import "@fontsource-variable/manrope/wght.css";
import "@fontsource-variable/vazirmatn/wght.css";
import "./globals.css";
import "./workspace.css";

import { LocaleProvider } from "@/components/locale-provider";
import {
  DEFAULT_LOCALE,
  directionForLocale,
  getCopy,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n";

async function requestLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  const copy = getCopy(locale).metadata;

  return {
    metadataBase: new URL(process.env.APP_URL ?? "https://ats.mehdisharifi.com"),
    title: copy.title,
    description: copy.description,
    applicationName: "Shortlist",
    keywords: [
      "ATS",
      "resume screening",
      "AI hiring",
      "candidate ranking",
      "ارزیابی رزومه",
      "استخدام",
    ],
    robots: { index: true, follow: true },
    openGraph: {
      title: copy.openGraphTitle,
      description: copy.openGraphDescription,
      type: "website",
      locale: locale === "fa" ? "fa_IR" : "en_US",
      alternateLocale: locale === "fa" ? ["en_US"] : ["fa_IR"],
      siteName: "Shortlist",
    },
    twitter: {
      card: "summary",
      title: copy.openGraphTitle,
      description: copy.openGraphDescription,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10231c",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await requestLocale();

  return (
    <html
      data-locale={locale}
      dir={directionForLocale(locale)}
      lang={locale}
      suppressHydrationWarning
    >
      <body>
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
