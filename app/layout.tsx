import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "@/app/globals.css";
import { SITE_URL } from "@/lib/env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const description = "Find a coworking companion, study partner, or coffee buddy for a public-space session.";

export const metadata: Metadata = {
  title: {
    default: "Withly",
    template: "%s | Withly",
  },
  description,
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/withly-app-icon.svg?v=3",
    shortcut: "/withly-app-icon.svg?v=3",
    apple: "/withly-app-icon.svg?v=3",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: "Withly",
    title: "Withly — Focus, coworking & coffee.",
    description,
    url: SITE_URL || "https://withly.in",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Withly — Find your focus companion",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Withly — Focus, coworking & coffee.",
    description,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
