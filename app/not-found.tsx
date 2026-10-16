import Link from "next/link";
import type { Metadata } from "next";
import { PublicPageShell } from "@/components/public-page-shell";
import styles from "@/app/fallback-design.module.css";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return <PublicPageShell><section className={styles.card}>
    <span className={styles.mark} aria-hidden="true" />
    <p className={styles.kicker}>404 · A SMALL DETOUR</p>
    <h1>Page not found.</h1>
    <p>The page you’re looking for doesn’t exist or may have been moved.</p>
    <div className={styles.actions}><Link className={styles.primary} href="/">Go home</Link><Link className={styles.secondary} href="/explore">Browse requests</Link></div>
  </section></PublicPageShell>;
}
