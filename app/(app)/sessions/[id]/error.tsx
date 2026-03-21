"use client";

import Link from "next/link";

export default function SessionError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="workspace-page">
      <section className="panel">
        <p className="kicker">Session</p>
        <h3>Something went wrong loading this session.</h3>
        <p>This could be a temporary issue. Try accessing the chat from your inbox instead.</p>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.5rem" }}>
          Error: {error.message || "Unknown"} {error.digest ? `(${error.digest})` : ""}
        </p>
        <div className="button-row" style={{ marginTop: "1rem" }}>
          <Link className="primary-button compact" href="/inbox">Go to inbox</Link>
          <Link className="ghost-button compact" href="/requests">Back to requests</Link>
        </div>
      </section>
    </div>
  );
}
