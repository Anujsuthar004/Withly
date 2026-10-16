import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, BookOpen, Mail, ShieldCheck } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SUPPORT_EMAIL } from "@/lib/env";
import styles from "@/app/information-design.module.css";

interface StaticPageSection {
  title: string;
  body: string[];
}

interface StaticPageShellProps {
  kicker: string;
  title: string;
  intro: string;
  sections: StaticPageSection[];
  safety?: boolean;
}

export function StaticPageShell({ kicker, title, intro, sections, safety = false }: StaticPageShellProps) {
  return (
    <main className={styles.page} id="main-content" tabIndex={-1}>
      <div className={styles.container} id="page-top">
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Withly home"><Image src="/withly-app-icon.svg" width={38} height={38} alt="" />Withly</Link>
        <nav aria-label="Page navigation"><Link href="/">Home</Link><Link href="/explore">Explore <ArrowUpRight size={14} /></Link></nav>
      </header>
      <section className={`${styles.hero} ${safety ? styles.safetyHero : ""}`}>
        <div className={styles.heroCopy}>
        <p className={styles.kicker}>{kicker}</p>
        <h1>{title}</h1>
        <p className={styles.intro}>{intro}</p>
        <div className={styles.actions}>
          <a className={styles.primary} href={`mailto:${SUPPORT_EMAIL}`}>
            <Mail size={16} /> Contact support <ArrowUpRight size={15} />
          </a>
          {safety ? <Link className={styles.secondary} href="/sessions">Open your sessions <ArrowRight size={15} /></Link> : <Link className={styles.secondary} href="/account">Your account controls <ArrowRight size={15} /></Link>}
        </div>
        </div>
        <div className={styles.heroArt} aria-hidden="true">{safety ? <ShieldCheck size={70} strokeWidth={1.5} /> : <BookOpen size={70} strokeWidth={1.5} />}<span>{safety ? "THOUGHTFUL BOUNDARIES" : "THE IMPORTANT DETAILS"}</span></div>
      </section>
      <div className={styles.layout}>
        <aside className={styles.rail}>
          <nav className={styles.contents} aria-label="On this page"><p className={styles.kicker}>ON THIS PAGE</p>{sections.map((section, index) => <a href={`#section-${index + 1}`} key={section.title}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}<ArrowUpRight size={13} /></a>)}</nav>
          <div className={styles.help}><span className={styles.mark} aria-hidden="true" /><h2>Questions? We’re here.</h2><p>Contact support if you need help understanding these details.</p><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL} <ArrowUpRight size={13} /></a></div>
        </aside>
        <div className={styles.sections}>
          {sections.map((section, index) => (
            <article key={section.title} id={`section-${index + 1}`} aria-labelledby={`section-heading-${index + 1}`} className={`${styles.card} ${safety && index === 0 ? styles.immediate : ""}`}>
              <div className={styles.cardHeading}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><h2 id={`section-heading-${index + 1}`}>{section.title}</h2></div>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>
          ))}
          <a className={styles.backToTop} href="#page-top">Back to top ↑</a>
        </div>
      </div>

      <SiteFooter />
      </div>
    </main>
  );
}
