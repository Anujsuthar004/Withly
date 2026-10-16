import { ImageResponse } from "next/og";

export const alt = "Withly — Focus, coworking & coffee.";
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
          background: "#f8f9ff",
          padding: "80px 96px",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 8,
            height: "100%",
            background: "#6742e9",
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
              background: "#6742e9",
              borderRadius: 10,
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 64 64" fill="none"><path d="M10 17v17c0 7.2 4.8 13 11 13s11-5.8 11-13v-8m0 8c0 7.2 4.8 13 11 13s11-5.8 11-13V17" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#6742e9",
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
            color: "#25213c",
            lineHeight: 1,
            letterSpacing: "-0.05em",
            maxWidth: 900,
          }}
        >
          Find your focus companion.
        </div>

        {/* Subline */}
        <div
          style={{
            marginTop: 28,
            fontSize: 28,
            color: "#696279",
            maxWidth: 680,
            lineHeight: 1.4,
          }}
        >
          Shared tables. Study sessions. Coffee breaks. Meet in public, coordinate privately.
        </div>

        {/* Bottom CTA pill */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 96,
            background: "#6742e9",
            color: "#fff",
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
