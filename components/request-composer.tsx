"use client";

import { type ReactNode, useMemo, useState, useTransition } from "react";
import { CalendarClock, Check, CheckCircle2, MapPin, Send, ShoppingBag, MessageCircleMore, Users, Star, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

import { createRequestAction } from "@/app/workspace/actions";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { TURNSTILE_SITE_KEY, hasTurnstileSiteKey } from "@/lib/env";
import type { RequestLane } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";

interface RequestComposerProps {
  preview: boolean;
  onStatus: (message: string) => void;
  statusMessage?: string;
}

const defaultTags: Record<RequestLane, string[]> = {
  social: ["deep-work", "coffee-shop", "quiet-focus", "laptop-friendly"],
  errand: ["coffee-walk", "structured", "on-time", "supportive"],
};

const quickPresets = [
  {
    icon: "☕",
    label: "Deep Work Sprint",
    lane: "social" as const,
    title: "2-hour deep work & coffee sprint",
    description: "Looking for an accountability partner to share a cafe table. Headphones on for focus sprints, quick chat during coffee refills!",
    tags: "deep-work, coffee-shop, laptop-friendly, quiet-focus",
  },
  {
    icon: "💻",
    label: "Side Project Coworking",
    lane: "social" as const,
    title: "Cafe coworking & side projects",
    description: "Hacking on side projects/coding from a cafe this afternoon. Would love to share a table, bounce ideas, and stay productive together.",
    tags: "side-projects, coworking, coffee-shop, casual",
  },
  {
    icon: "📚",
    label: "Library Study Session",
    lane: "social" as const,
    title: "Quiet library study & reading block",
    description: "Heading to a quiet library or cafe for deep reading and study prep. Looking for an accountability buddy to share a table.",
    tags: "study-session, quiet-focus, library, reading",
  },
  {
    icon: "🚶",
    label: "Coffee Walk & Stroll",
    lane: "errand" as const,
    title: "Afternoon coffee run & stroll",
    description: "Taking a 30-45 minute screen break to grab an iced coffee and stretch legs. Low-pressure, easygoing conversation.",
    tags: "coffee-walk, screen-break, easygoing, neighborhood",
  },
];

export function RequestComposer({ preview, onStatus, statusMessage }: RequestComposerProps) {
  const router = useRouter();
  const [lane, setLane] = useState<RequestLane>("social");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [areaLabel, setAreaLabel] = useState("");
  const [meetupAt, setMeetupAt] = useState("");
  const [radiusKm, setRadiusKm] = useState(5);
  const [tags, setTags] = useState(defaultTags.social.join(", "));
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [checkInEnabled, setCheckInEnabled] = useState(true);
  const [ephemeral, setEphemeral] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const parsedTags = useMemo(
    () =>
      tags
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    [tags]
  );

  const basicsReady = title.trim().length >= 6 && description.trim().length >= 24;
  const logisticsReady = areaLabel.trim().length >= 3;
  const captchaReady = !hasTurnstileSiteKey || Boolean(captchaToken);
  const canSubmit = basicsReady && logisticsReady && captchaReady;

  const checklist = [
    { label: "Title added", done: title.trim().length >= 6 },
    { label: "Description looks good", done: description.trim().length >= 24 },
    { label: "Area helps matching", done: areaLabel.trim().length >= 3 },
    { label: "Tags help matching", done: parsedTags.length >= 2 },
  ];

  return (
    <div className="wl-compose-grid">
      {/* ─── Left column: Form ─── */}
      <div className="wl-compose-col">
        <div className="wl-compose-card">
          <div>
            <span className="wl-compose-step">Step 1 of 3 — Compose</span>
            <h2 className="wl-compose-title">Post a request</h2>
          </div>

          {/* Quick Presets */}
          <div style={{ marginTop: 14, marginBottom: 16 }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
              ⚡ Quick Focus Presets (1-tap fill)
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {quickPresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: "9999px",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.16)",
                    color: "var(--foreground)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onClick={() => {
                    setLane(preset.lane);
                    setTitle(preset.title);
                    setDescription(preset.description);
                    setTags(preset.tags);
                  }}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();

              startTransition(async () => {
                const result = await createRequestAction({
                  lane,
                  title,
                  description,
                  areaLabel,
                  meetupAt: meetupAt ? new Date(meetupAt).toISOString() : null,
                  radiusKm,
                  tags: parsedTags,
                  verifiedOnly,
                  checkInEnabled,
                  expiresAt: ephemeral ? new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() : null,
                  captchaToken,
                });

                onStatus(result.message);
                if (!result.ok) {
                  setCaptchaToken("");
                  setTurnstileKey((current) => current + 1);
                  return;
                }

                router.push("/requests");
              });
            }}
          >
            {/* Lane switch */}
            <div className="wl-lane-switch">
              <button
                type="button"
                className={`wl-lane-btn ${lane === "social" ? "active" : ""}`}
                onClick={() => { setLane("social"); setTags(defaultTags.social.join(", ")); }}
              >
                ☕ Coworking & Focus
              </button>
              <button
                type="button"
                className={`wl-lane-btn ${lane === "errand" ? "active" : ""}`}
                onClick={() => { setLane("errand"); setTags(defaultTags.errand.join(", ")); }}
              >
                🚶 Coffee Walk
              </button>
            </div>

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 20 }}>
              <label className="wl-compose-field">
                Title
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={lane === "social" ? "e.g. 2-hour deep work & coffee sprint at Blue Tokai" : "e.g. Afternoon coffee run & walk"}
                  minLength={6}
                  maxLength={120}
                  required
                  disabled={preview || isPending}
                />
              </label>

              <label className="wl-compose-field">
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What should your focus buddy know about the pace, intent (e.g. silent focus with headphones vs brainstorming), and cafe spot?"
                  minLength={24}
                  maxLength={600}
                  rows={4}
                  required
                  disabled={preview || isPending}
                />
              </label>

              <div className="wl-compose-two">
                <label className="wl-compose-field">
                  Area / Neighborhood
                  <input
                    type="text"
                    value={areaLabel}
                    onChange={(e) => setAreaLabel(e.target.value)}
                    placeholder="e.g. Lower Parel"
                    minLength={3}
                    maxLength={120}
                    required
                    disabled={preview || isPending}
                  />
                </label>
                <label className="wl-compose-field">
                  Tags
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="comma, separated, tags"
                    disabled={preview || isPending}
                  />
                </label>
              </div>

              <div className="wl-compose-two">
                <label className="wl-compose-field">
                  When
                  <input
                    type="datetime-local"
                    value={meetupAt}
                    onChange={(e) => setMeetupAt(e.target.value)}
                    disabled={preview || isPending}
                  />
                </label>
              </div>
            </div>

            {/* Toggles */}
            <div className="wl-toggle-panel" style={{ marginTop: 20 }}>
              <div className="wl-toggle-row" onClick={() => setVerifiedOnly((c) => !c)}>
                <div className="wl-toggle-copy">
                  <strong>Email-confirmed members only</strong>
                  <small>Only members with a confirmed email can respond</small>
                </div>
                <div className={`wl-toggle-track ${verifiedOnly ? "on" : "off"}`}>
                  <span className="wl-toggle-knob" />
                </div>
              </div>
              <div className="wl-toggle-divider" />
              <div className="wl-toggle-row" onClick={() => setEphemeral((c) => !c)}>
                <div className="wl-toggle-copy">
                  <strong>Ephemeral</strong>
                  <small>Automatically expires six hours after posting</small>
                </div>
                <div className={`wl-toggle-track ${ephemeral ? "on" : "off"}`}>
                  <span className="wl-toggle-knob" />
                </div>
              </div>
            </div>

            {hasTurnstileSiteKey ? (
              <div style={{ marginTop: 16 }}>
                <TurnstileWidget key={turnstileKey} siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} theme="light" />
              </div>
            ) : null}

            {statusMessage && <p style={{ marginTop: 8, color: "var(--accent2)", fontWeight: 600, fontSize: 14 }}>{statusMessage}</p>}

            <div className="wl-compose-actions" style={{ marginTop: 20 }}>
              <button type="button" className="wl-btn-ghost" onClick={() => router.push("/feed")}>
                Cancel
              </button>
              <button className="wl-btn-gradient" type="submit" disabled={preview || isPending || !canSubmit} style={{ flex: 1 }}>
                {preview ? "Preview mode only" : isPending ? "Posting..." : "Publish request"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ─── Right rail: Preview + Checklist ─── */}
      <aside className="wl-compose-rail">
        <span className="wl-preview-label">Live preview</span>

        {/* Preview card mimicking the real card */}
        <div className="wl-card">
          <div className="wl-card-body">
            <div className="wl-card-meta-line">
              <span>{lane === "social" ? "Coworking & Focus" : "Coffee Walk"}</span>
              <span className="wl-meta-dot" />
              <span>just now</span>
            </div>
            <h4 className="wl-card-title">{title.trim() || "Your request title"}</h4>
            <p className="wl-card-desc">{description.trim() || "Add a description to preview how it'll appear in the feed."}</p>
            <div className="wl-card-chips">
              {areaLabel.trim() && (
                <span className="wl-meta-chip">
                  <MapPin size={12} />
                  {areaLabel}
                </span>
              )}
              {parsedTags.slice(0, 3).map((tag) => (
                <span key={tag} className="wl-tag-chip">#{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="wl-checklist">
          {checklist.map((item) => (
            <div key={item.label} className={`wl-checklist-item ${item.done ? "done" : "pending"}`}>
              <span className="wl-checklist-dot">
                <Check size={11} />
              </span>
              {item.label}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
