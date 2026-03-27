"use client";

import { type ReactNode, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { ArrowRight, CalendarClock, CheckCircle2, MapPin, MessageCircleMore, Send, Shield, ShoppingBag, Sparkles, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { createRequestAction } from "@/app/workspace/actions";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { TURNSTILE_SITE_KEY, hasTurnstileEnv } from "@/lib/env";
import { referenceMedia } from "@/lib/reference-content";
import type { RequestLane } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";

interface RequestComposerProps {
  preview: boolean;
  onStatus: (message: string) => void;
}

const defaultTags: Record<RequestLane, string[]> = {
  social: ["public-space", "clear-plan", "easygoing"],
  errand: ["structured", "on-time", "supportive"],
};

const laneCards: Array<{
  lane: RequestLane;
  title: string;
  description: string;
  icon: ReactNode;
  tone: "soft" | "peach";
}> = [
  {
    lane: "errand",
    title: "Errand",
    description: "Groceries, pharmacy runs, or dry cleaning pickup. Someone to handle the logistics while you stay focused.",
    icon: <ShoppingBag size={28} />,
    tone: "soft",
  },
  {
    lane: "social",
    title: "Social",
    description: "Coffee chats, museum visits, or a walk in the park. Purely human connection.",
    icon: <MessageCircleMore size={28} />,
    tone: "peach",
  },
];

export function RequestComposer({ preview, onStatus }: RequestComposerProps) {
  const router = useRouter();
  const [lane, setLane] = useState<RequestLane>("social");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [areaLabel, setAreaLabel] = useState("");
  const [meetupAt, setMeetupAt] = useState("");
  const [radiusKm, setRadiusKm] = useState(5);
  const [tags, setTags] = useState(defaultTags.social.join(", "));
  const [expiresAt, setExpiresAt] = useState("");
  const [maxCompanions, setMaxCompanions] = useState(1);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [checkInEnabled, setCheckInEnabled] = useState(true);
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
  const canSubmit = basicsReady && logisticsReady && (!hasTurnstileEnv || Boolean(captchaToken));

  const progress = [
    true,
    basicsReady,
    basicsReady && logisticsReady,
  ];

  return (
    <div className="composer-reference-shell">
      <div className="composer-reference-main">
        <div className="composer-progress">
          {progress.map((complete, index) => (
            <span key={index} className={complete ? "active" : ""} />
          ))}
        </div>

        <form
          className="composer-reference-form"
          onSubmit={(event) => {
            event.preventDefault();

            startTransition(async () => {
              const result = await createRequestAction({
                lane,
                title,
                description,
                areaLabel,
                meetupAt: meetupAt || null,
                radiusKm,
                tags: parsedTags,
                verifiedOnly,
                checkInEnabled,
                maxCompanions,
                expiresAt: expiresAt || undefined,
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
          <section className="composer-stage">
            <div className="composer-stage-head">
              <div>
                <h2>1. Choose a Category</h2>
                <p>Define the nature of your request to find the right companion.</p>
              </div>
            </div>

            <div className="composer-category-grid">
              {laneCards.map((option) => {
                const active = option.lane === lane;

                return (
                  <button
                    key={option.lane}
                    type="button"
                    className={`composer-category-card tone-${option.tone} ${active ? "active" : ""}`}
                    onClick={() => {
                      setLane(option.lane);
                      setTags(defaultTags[option.lane].join(", "));
                    }}
                  >
                    <span className="composer-category-icon">{option.icon}</span>
                    <strong>{option.title}</strong>
                    <p>{option.description}</p>
                    <span className="composer-category-link">
                      {active ? "Selected" : "Select Category"}
                      <ArrowRight size={16} />
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                className="composer-category-card composer-category-card--wide"
                onClick={() => document.getElementById("request-title-field")?.focus()}
              >
                <div className="composer-category-wide-icon">
                  <Sparkles size={22} />
                </div>
                <div>
                  <strong>Custom Request</strong>
                  <p>Something unique that doesn&apos;t fit a standard box.</p>
                </div>
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="composer-stage-actions">
              <button type="button" className="composer-text-button" onClick={() => router.push("/feed")}>
                Cancel
              </button>
              <span className="composer-inline-note">
                {basicsReady ? "Task details ready to refine." : "Choose a category, then name the plan clearly."}
              </span>
            </div>
          </section>

          <section className={`composer-stage ${basicsReady ? "ready" : "muted"}`}>
            <div className="composer-stage-head">
              <div>
                <h2>2. Task Details</h2>
                <p>Share just enough context for the right companion to recognize the fit quickly.</p>
              </div>
            </div>

            <div className="composer-underlines">
              <label className="composer-line-field composer-line-field--full">
                <span>What are we doing?</span>
                <input
                  id="request-title-field"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={lane === "social" ? "e.g. New exhibit at SFMOMA" : "e.g. Weekly grocery run at the local market"}
                  minLength={6}
                  maxLength={120}
                  required
                  disabled={preview || isPending}
                />
              </label>

              <label className="composer-line-field composer-line-field--full">
                <span>Describe the tone</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What should the other person know about the pace, intent, and kind of presence that would help?"
                  minLength={24}
                  maxLength={600}
                  rows={4}
                  required
                  disabled={preview || isPending}
                />
              </label>

              <div className="composer-two-up">
                <label className="composer-line-field">
                  <span>Where</span>
                  <div className="composer-line-input">
                    <MapPin size={16} />
                    <input
                      type="text"
                      value={areaLabel}
                      onChange={(event) => setAreaLabel(event.target.value)}
                      placeholder="Select location"
                      minLength={3}
                      maxLength={120}
                      required
                      disabled={preview || isPending}
                    />
                  </div>
                </label>

                <label className="composer-line-field">
                  <span>When</span>
                  <div className="composer-line-input">
                    <CalendarClock size={16} />
                    <input
                      type="datetime-local"
                      value={meetupAt}
                      onChange={(event) => setMeetupAt(event.target.value)}
                      disabled={preview || isPending}
                    />
                  </div>
                </label>
              </div>
            </div>
          </section>

          <section className={`composer-stage ${logisticsReady ? "ready" : "muted"}`}>
            <div className="composer-stage-head">
              <div>
                <h2>3. Intent &amp; Preferences</h2>
                <p>Set expectations, safety defaults, and a few lightweight discovery signals.</p>
              </div>
            </div>

            <div className="composer-preference-grid">
              <label className={`composer-preference-card ${verifiedOnly ? "active" : ""}`}>
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(event) => setVerifiedOnly(event.target.checked)}
                  disabled={preview || isPending}
                />
                <div className="composer-preference-icon">
                  <Shield size={18} />
                </div>
                <div>
                  <strong>Verified responses only</strong>
                  <p>Keep replies limited to companions with stronger trust signals.</p>
                </div>
              </label>

              <label className={`composer-preference-card ${checkInEnabled ? "active" : ""}`}>
                <input
                  type="checkbox"
                  checked={checkInEnabled}
                  onChange={(event) => setCheckInEnabled(event.target.checked)}
                  disabled={preview || isPending}
                />
                <div className="composer-preference-icon">
                  <Sparkles size={18} />
                </div>
                <div>
                  <strong>Live safety check-ins</strong>
                  <p>Keep arrival and SOS tools ready once the request turns into an active plan.</p>
                </div>
              </label>
            </div>

            <div className="composer-advanced-grid">
              <label className="composer-line-field">
                <span>Max companions</span>
                <div className="composer-line-input">
                  <Users size={16} />
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxCompanions}
                    onChange={(event) => setMaxCompanions(Number(event.target.value))}
                    disabled={preview || isPending}
                  />
                </div>
              </label>

              <label className="composer-line-field">
                <span>Auto-expire at</span>
                <div className="composer-line-input">
                  <CalendarClock size={16} />
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(event) => setExpiresAt(event.target.value)}
                    disabled={preview || isPending}
                  />
                </div>
              </label>

              <label className="composer-line-field">
                <span>Discovery radius</span>
                <div className="composer-range-wrap">
                  <input
                    type="range"
                    min={1}
                    max={25}
                    value={radiusKm}
                    onChange={(event) => setRadiusKm(Number(event.target.value))}
                    disabled={preview || isPending}
                  />
                  <strong>{radiusKm} km</strong>
                </div>
              </label>

              <label className="composer-line-field">
                <span>Tags</span>
                <input
                  type="text"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="comma, separated, tags"
                  disabled={preview || isPending}
                />
              </label>
            </div>

            {hasTurnstileEnv ? (
              <div className="composer-captcha-wrap">
                <TurnstileWidget key={turnstileKey} siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} theme="light" />
              </div>
            ) : null}
          </section>

          <div className="composer-submit-row">
            <div className="composer-submit-note">
              <CheckCircle2 size={16} />
              <span>
                {preview
                  ? "Preview mode is on. Sign in to publish."
                  : canSubmit
                    ? "Ready to publish."
                    : "Add a stronger title, description, and area before publishing."}
              </span>
            </div>
            <button className="composer-submit-button" type="submit" disabled={preview || isPending || !canSubmit}>
              {!preview && isPending ? <span className="btn-spinner" /> : <Send size={16} />}
              {preview ? "Preview mode only" : isPending ? "Posting..." : "Post Request"}
            </button>
          </div>

          <button className="composer-floating-submit" type="submit" disabled={preview || isPending || !canSubmit} aria-label="Post request">
            {isPending ? <span className="btn-spinner btn-spinner--lg" /> : <Send size={24} />}
          </button>
        </form>
      </div>

      <aside className="composer-reference-side">
        <div className="composer-side-card">
          <h3>Why Withly?</h3>
          <p>Clear requests lead to calmer replies. Thoughtful details help the right person recognize the fit quickly.</p>
        </div>

        <div className="composer-side-image">
          <Image src={referenceMedia.homeArtwork[2]} alt="Intentional quiet planning scene" fill sizes="(max-width: 1280px) 100vw, 280px" />
          <div className="composer-side-image-copy">
            <span>Atmosphere</span>
            <strong>Intentional Quietude</strong>
          </div>
        </div>

        <div className="composer-preview-card">
          <div className="composer-preview-head">
            <span>{lane === "social" ? "Social" : "Errand"}</span>
            <span>{formatDateTime(meetupAt || null)}</span>
          </div>
          <h3>{title.trim() || "Your request title will appear here."}</h3>
          <p>{description.trim() || "A calm, specific description helps the right companion recognize the fit quickly."}</p>
          <dl className="composer-preview-details">
            <div>
              <dt>Where</dt>
              <dd>{areaLabel.trim() || "Choose a neighborhood or landmark"}</dd>
            </div>
            <div>
              <dt>Radius</dt>
              <dd>{radiusKm} km</dd>
            </div>
            <div>
              <dt>Companions</dt>
              <dd>{maxCompanions === 1 ? "1-on-1" : `Up to ${maxCompanions}`}</dd>
            </div>
          </dl>
          <div className="composer-preview-tags">
            {parsedTags.slice(0, 4).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
