import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Shortlist — evidence-backed resume screening",
  description:
    "Turn a job description and a batch of resumes into an explainable, human-reviewed shortlist.",
  applicationName: "Shortlist",
  keywords: ["ATS", "resume screening", "AI hiring", "candidate ranking"],
  robots: { index: true, follow: true },
  openGraph: {
    title: "Shortlist — every score comes with proof",
    description:
      "Evidence-backed AI resume screening with blind review and human decisions.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10231c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

