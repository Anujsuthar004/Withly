import type { Metadata } from "next";

import "@/app/globals.css";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = {
  title: "Tag Along",
  description: "A privacy-first companionship platform rebuilt on Next.js, TypeScript, and Supabase.",
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
