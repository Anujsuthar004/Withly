"use client";

import Link from "next/link";

export default function AppError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="workspace-page">
      <section className="panel">
        <p className="kicker">Error</p>
        <h3>Something went wrong.</h3>
        <p>Please try again or navigate back to the feed.</p>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.5rem" }}>
          {error.message || "Unknown error"} {error.digest ? `(${error.digest})` : ""}
        </p>
        <div className="button-row" style={{ marginTop: "1rem" }}>
          <Link className="primary-button compact" href="/feed">Go to feed</Link>
          <Link className="ghost-button compact" href="/inbox">Go to inbox</Link>
        </div>
      </section>
    </div>
  );
}
