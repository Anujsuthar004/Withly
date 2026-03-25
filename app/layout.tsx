import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";

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

export const metadata: Metadata = {
  title: "Withly",
  description: "A private companionship platform for plans, errands, and everyday moments.",
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${manrope.variable}`}>{children}</body>
    </html>
  );
}
