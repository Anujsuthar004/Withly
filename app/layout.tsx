import type { Metadata } from "next";

import "@/app/globals.css";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = {
  title: "Tag Along",
  description: "A private companionship platform for plans, errands, and everyday moments.",
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
