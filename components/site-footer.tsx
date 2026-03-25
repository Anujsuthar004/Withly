import Image from "next/image";
import Link from "next/link";

import { SUPPORT_EMAIL } from "@/lib/env";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-copy">
        <p className="kicker">Private by design</p>
        <Link href="/" className="site-footer-brand">
          <Image src="/withly-app-icon.svg" alt="Withly Logo" width={20} height={20} />
          Withly
        </Link>
        <h2>Keep the public window small. Let the real coordination happen in a private thread.</h2>
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
