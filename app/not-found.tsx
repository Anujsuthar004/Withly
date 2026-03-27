import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
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
        404
      </p>
      <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.04em", margin: 0 }}>
        Page not found.
      </h1>
      <p style={{ color: "var(--text-soft, #888)", maxWidth: "36ch", lineHeight: 1.6 }}>
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.5rem" }}>
        <Link
          href="/"
          style={{ padding: "0.6rem 1.25rem", borderRadius: "8px", background: "var(--teal, #0f6b61)", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}
        >
          Go home
        </Link>
        <Link
          href="/explore"
          style={{ padding: "0.6rem 1.25rem", borderRadius: "8px", border: "1px solid var(--border, #ddd)", textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}
        >
          Browse requests
        </Link>
      </div>
    </div>
  );
}
