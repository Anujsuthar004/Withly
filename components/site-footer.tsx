import Link from "next/link";

import { SUPPORT_EMAIL } from "@/lib/env";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <p className="kicker">Public Release Basics</p>
        <h3>Safety, privacy, and support should be one click away.</h3>
      </div>

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
