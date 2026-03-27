import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Withly — Companionship for plans, errands, and everyday moments.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#fff9ee",
          padding: "80px 96px",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Teal accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 8,
            height: "100%",
            background: "#006855",
            borderRadius: "0 4px 4px 0",
          }}
        />

        {/* Top badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              background: "#006855",
              borderRadius: 10,
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 20, height: 20, background: "#fff9ee", borderRadius: "50%", display: "flex" }} />
          </div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#006855",
              letterSpacing: "-0.02em",
            }}
          >
            withly
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "#1e1b15",
            lineHeight: 1,
            letterSpacing: "-0.05em",
            maxWidth: 900,
          }}
        >
          Find your companion for any plan.
        </div>

        {/* Subline */}
        <div
          style={{
            marginTop: 28,
            fontSize: 28,
            color: "#4d534d",
            maxWidth: 680,
            lineHeight: 1.4,
          }}
        >
          Private. Intentional. Real connections for errands, outings, and everyday moments.
        </div>

        {/* Bottom CTA pill */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 96,
            background: "#006855",
            color: "#fff9ee",
            fontSize: 22,
            fontWeight: 700,
            padding: "14px 32px",
            borderRadius: 100,
            letterSpacing: "-0.01em",
            display: "flex",
          }}
        >
          withly.in
        </div>
      </div>
    ),
    { ...size }
  );
}
