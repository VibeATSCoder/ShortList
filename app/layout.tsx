import type { Metadata, Viewport } from "next";

import "@fontsource-variable/manrope/wght.css";
import "./globals.css";
import "./workspace.css";

import { LocaleProvider } from "@/components/locale-provider";
import { getCopy } from "@/lib/i18n";

const metadataCopy = getCopy("en").metadata;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://ats.mehdisharifi.com"),
  title: metadataCopy.title,
  description: metadataCopy.description,
  applicationName: "Shortlist",
  keywords: ["ATS", "resume screening", "AI hiring", "candidate ranking", "recruiting automation"],
  robots: { index: true, follow: true },
  openGraph: {
    title: metadataCopy.openGraphTitle,
    description: metadataCopy.openGraphDescription,
    type: "website",
    locale: "en_US",
    siteName: "Shortlist",
  },
  twitter: { card: "summary", title: metadataCopy.openGraphTitle, description: metadataCopy.openGraphDescription },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10231c",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html data-locale="en" dir="ltr" lang="en"><body><LocaleProvider>{children}</LocaleProvider></body></html>;
}
