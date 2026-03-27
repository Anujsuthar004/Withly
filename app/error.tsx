"use client";

import Link from "next/link";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "var(--font-inter, sans-serif)",
      }}
    >
      <p style={{ fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-soft, #888)" }}>
        Error
      </p>
      <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.04em", margin: 0 }}>
        Something went wrong.
      </h1>
      <p style={{ color: "var(--text-soft, #888)", maxWidth: "36ch", lineHeight: 1.6 }}>
        An unexpected error occurred. Please try again or return home.
      </p>
      {error.digest ? (
        <p style={{ fontSize: "0.75rem", color: "var(--text-soft, #aaa)", fontFamily: "monospace" }}>
          Error ID: {error.digest}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.5rem" }}>
        <button
          type="button"
          onClick={reset}
          style={{ padding: "0.6rem 1.25rem", borderRadius: "8px", background: "var(--teal, #0f6b61)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{ padding: "0.6rem 1.25rem", borderRadius: "8px", border: "1px solid var(--border, #ddd)", textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
