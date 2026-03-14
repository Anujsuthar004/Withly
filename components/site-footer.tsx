import Image from "next/image";
import Link from "next/link";

import { SUPPORT_EMAIL } from "@/lib/env";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-copy">
        <Link href="/" className="site-footer-brand">
          <Image src="/tagalong-app-icon.svg" alt="Tag Along Logo" width={20} height={20} />
          Tag Along
        </Link>
        <p>Calmer coordination for plans, errands, and the moments you do not want to handle alone.</p>
      </div>

      <nav className="footer-links" aria-label="Footer">
        <Link href="/legal/privacy" className="footer-link-button">
          Privacy
        </Link>
        <Link href="/legal/terms" className="footer-link-button">
          Terms
        </Link>
        <Link href="/legal/community" className="footer-link-button">
          Community
        </Link>
        <Link href="/safety/reporting" className="footer-link-button">
          Reporting
        </Link>
        <a className="footer-link-button footer-link-email" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
      </nav>
    </footer>
  );
}
