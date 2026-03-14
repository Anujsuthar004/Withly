import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SUPPORT_EMAIL } from "@/lib/env";

interface StaticPageSection {
  title: string;
  body: string[];
}

interface StaticPageShellProps {
  kicker: string;
  title: string;
  intro: string;
  sections: StaticPageSection[];
}

export function StaticPageShell({ kicker, title, intro, sections }: StaticPageShellProps) {
  return (
    <main className="static-page">
      <section className="hero-copy static-page-hero">
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
        <div className="static-page-meta">
          <a className="ghost-button compact" href={`mailto:${SUPPORT_EMAIL}`}>
            Contact support
          </a>
          <Link className="ghost-button compact" href="/">
            Home
          </Link>
          <Link className="ghost-button compact" href="/workspace">
            Workspace
          </Link>
        </div>
      </section>

      <section className="panel static-page-panel">
        <div className="static-page-grid">
          {sections.map((section) => (
            <article key={section.title} className="static-page-card">
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
