"use client";

import Link from "next/link";
import styles from "@/app/sessions-design.module.css";

export default function SessionError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className={styles.page}>
      <section className={styles.empty}>
        <p className={styles.kicker}>Session</p>
        <h1>Something went wrong loading this session.</h1>
        <p>This could be a temporary issue. Try accessing the chat from your inbox instead.</p>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.5rem" }}>
          Error: {error.message || "Unknown"} {error.digest ? `(${error.digest})` : ""}
        </p>
        <div className="button-row" style={{ marginTop: "1rem" }}>
          <Link className={styles.primary} href="/inbox">Go to inbox</Link>
          <Link className={styles.textLink} href="/requests">Back to requests</Link>
        </div>
      </section>
    </div>
  );
}
