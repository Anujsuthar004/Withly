import Image from "next/image";
import Link from "next/link";

import { SUPPORT_EMAIL } from "@/lib/env";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link href="/" className="site-footer-brand">
        <Image src="/tagalong-app-icon.svg" alt="Tag Along Logo" width={20} height={20} />
        Tag Along
      </Link>

      <nav className="footer-links" aria-label="Footer">
        <Link href="/legal/privacy">Privacy</Link>
        <Link href="/legal/terms">Terms</Link>
        <Link href="/legal/community">Community</Link>
        <Link href="/safety/reporting">Reporting</Link>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </nav>
    </footer>
  );
}
