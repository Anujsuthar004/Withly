"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Shield, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { createRequestAction } from "@/app/workspace/actions";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { TURNSTILE_SITE_KEY, hasTurnstileEnv } from "@/lib/env";
import type { RequestLane } from "@/lib/supabase/types";

interface RequestComposerProps {
  preview: boolean;
  onStatus: (message: string) => void;
}

const defaultTags: Record<RequestLane, string[]> = {
  social: ["public-space", "clear-plan", "easygoing"],
  errand: ["structured", "on-time", "supportive"],
};

export function RequestComposer({ preview, onStatus }: RequestComposerProps) {
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
  const [captchaToken, setCaptchaToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  function resetForm(nextLane: RequestLane) {
    setTitle("");
    setDescription("");
    setAreaLabel("");
    setMeetupAt("");
    setRadiusKm(5);
    setTags(defaultTags[nextLane].join(", "));
    setVerifiedOnly(true);
    setCheckInEnabled(true);
    setCaptchaToken("");
    setTurnstileKey((current) => current + 1);
  }

  return (
    <section className="panel composer-panel">
      <div className="panel-heading">
        <div>
          <p className="kicker">Post Securely</p>
          <h3>Craft a request with strong defaults.</h3>
        </div>
        <span className="status-dot">
          <Sparkles size={16} />
          Privacy-first
        </span>
      </div>

      <div className="lane-switch">
        {(["social", "errand"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={lane === option ? "active" : ""}
            onClick={() => {
              setLane(option);
              resetForm(option);
            }}
          >
            {option === "social" ? "Social Plus-One" : "Errand Companion"}
          </button>
        ))}
      </div>

      <form
        className="stack-form"
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
              tags: tags
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
              verifiedOnly,
              checkInEnabled,
              captchaToken,
            });

            onStatus(result.message);
            if (!result.ok) {
              setCaptchaToken("");
              setTurnstileKey((current) => current + 1);
              return;
            }

            resetForm(lane);
            router.refresh();
          });
        }}
      >
        <label>
          Title
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={lane === "social" ? "Rooftop set and an after-walk" : "Hospital visit and pharmacy stop"}
            minLength={6}
            maxLength={120}
            required
            disabled={preview || isPending}
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="State the mood, timing, expectations, and what would make the session feel safe."
            minLength={24}
            maxLength={600}
            rows={4}
            required
            disabled={preview || isPending}
          />
        </label>

        <div className="grid-two">
          <label>
            Area
            <input
              type="text"
              value={areaLabel}
              onChange={(event) => setAreaLabel(event.target.value)}
              placeholder="Neighbourhood or landmark"
              minLength={3}
              maxLength={120}
              required
              disabled={preview || isPending}
            />
          </label>

          <label>
            Meet time
            <div className="input-icon-wrap">
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

        <div className="grid-two">
          <label>
            Discovery radius: {radiusKm} km
            <input
              type="range"
              min={1}
              max={25}
              value={radiusKm}
              onChange={(event) => setRadiusKm(Number(event.target.value))}
              disabled={preview || isPending}
            />
          </label>

          <label>
            Tags
            <input
              type="text"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="comma, separated, tags"
              disabled={preview || isPending}
            />
          </label>
        </div>

        <div className="option-grid">
          <label className="toggle-card">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(event) => setVerifiedOnly(event.target.checked)}
              disabled={preview || isPending}
            />
            <span>
              <Shield size={16} />
              Verified-only responses
            </span>
          </label>

          <label className="toggle-card">
            <input
              type="checkbox"
              checked={checkInEnabled}
              onChange={(event) => setCheckInEnabled(event.target.checked)}
              disabled={preview || isPending}
            />
            <span>
              <Sparkles size={16} />
              Check-in ready session
            </span>
          </label>
        </div>

        {hasTurnstileEnv ? (
          <TurnstileWidget
            key={turnstileKey}
            siteKey={TURNSTILE_SITE_KEY}
            onToken={setCaptchaToken}
            theme="light"
          />
        ) : null}

        <button className="primary-button" type="submit" disabled={preview || isPending}>
          {preview ? "Preview mode only" : isPending ? "Posting..." : "Post Request"}
        </button>
      </form>
    </section>
  );
}
