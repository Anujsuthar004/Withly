"use client";

import Link from "next/link";
import { PublicPageShell } from "@/components/public-page-shell";
import styles from "@/app/fallback-design.module.css";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PublicPageShell><section className={styles.card}>
    <span className={styles.mark} aria-hidden="true" />
    <p className={styles.kicker}>LET’S TRY THAT AGAIN</p>
    <h1>Something went wrong.</h1>
    <p>An unexpected error occurred. Please try again or return home.</p>
    {error.digest ? <p className={styles.reference}>Error ID: {error.digest}</p> : null}
    <div className={styles.actions}><button className={styles.primary} type="button" onClick={reset}>Try again</button><Link className={styles.secondary} href="/">Go home</Link></div>
  </section></PublicPageShell>;
}
