"use client";

import Link from "next/link";
import styles from "@/app/fallback-design.module.css";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className={styles.card}>
    <span className={styles.mark} aria-hidden="true" />
    <p className={styles.kicker}>LET’S TRY THAT AGAIN</p>
    <h1>Something went wrong.</h1>
    <p>Please try again or navigate back to the feed.</p>
    {error.digest ? <p className={styles.reference}>Error ID: {error.digest}</p> : null}
    <div className={styles.actions}><button className={styles.primary} type="button" onClick={reset}>Try again</button><Link className={styles.secondary} href="/feed">Go to feed</Link><Link className={styles.secondary} href="/inbox">Go to inbox</Link></div>
  </section>;
}
