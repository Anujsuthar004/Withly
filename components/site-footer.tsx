import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-copy">
        <p className="kicker">Private by design</p>
        <Link href="/" className="site-footer-brand">
          <Image src="/withly-app-icon.svg" alt="Withly Logo" width={20} height={20} />
          Withly
        </Link>
        <h2>Good company. Better study sessions and coffee breaks.</h2>
        <p>Find company for focused work, study sessions, and coffee breaks in public spaces.</p>
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
          Help &amp; reporting
        </Link>
      </nav>
    </footer>
  );
}
