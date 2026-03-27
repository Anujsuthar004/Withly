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

const description = "A private companionship platform for plans, errands, and everyday moments.";

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
    icon: "/withly-app-icon.svg",
    shortcut: "/withly-app-icon.svg",
    apple: "/withly-app-icon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: "Withly",
    title: "Withly — Companionship for plans, errands, and everyday moments.",
    description,
    url: SITE_URL || "https://withly.in",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Withly — Find a companion for your plans",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Withly — Companionship for plans, errands, and everyday moments.",
    description,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${manrope.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
