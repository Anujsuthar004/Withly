"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarClock, CheckCircle2, Shield, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { createRequestAction } from "@/app/workspace/actions";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { TURNSTILE_SITE_KEY, hasTurnstileEnv } from "@/lib/env";
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

const stepOrder = [
  {
    key: "basics",
    title: "Basics",
    description: "Tone, context, and clarity.",
  },
  {
    key: "logistics",
    title: "Logistics",
    description: "Area, timing, and tags.",
  },
  {
    key: "safety",
    title: "Safety",
    description: "Defaults and final review.",
  },
] as const;

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
  const [stepIndex, setStepIndex] = useState(0);
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
    setStepIndex(0);
  }

  function canMoveToStep(targetIndex: number) {
    if (targetIndex <= stepIndex) return true;
    if (targetIndex === 1) return basicsReady;
    if (targetIndex === 2) return basicsReady && logisticsReady;
    return false;
  }

  return (
    <section className="panel composer-panel">
      <div className="composer-shell">
        <div className="composer-main">
          <div className="composer-top">
            <div className="composer-top-copy">
              <div className="panel-heading composer-panel-heading">
                <div>
                  <p className="kicker">Post Securely</p>
                  <h3>Craft a request with strong defaults.</h3>
                </div>
                <span className="status-dot">
                  <Sparkles size={16} />
                  Guided flow
                </span>
              </div>
              <p className="panel-intro composer-panel-intro">
                Move one step at a time: set the tone first, tighten the logistics second, and publish only after the
                draft feels calm and clear.
              </p>
            </div>

            <div className="lane-switch composer-lane-switch">
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
          </div>

          <form
            className="stack-form composer-form"
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
            <div className="composer-steps" role="tablist" aria-label="Request creation steps">
              {stepOrder.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  className={`composer-step ${stepIndex === index ? "active" : ""} ${canMoveToStep(index) ? "" : "locked"}`}
                  onClick={() => {
                    if (canMoveToStep(index)) {
                      setStepIndex(index);
                    }
                  }}
                  disabled={!canMoveToStep(index)}
                >
                  <span>{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <small>{step.description}</small>
                  </div>
                </button>
              ))}
            </div>

            {stepIndex === 0 ? (
              <section className="form-section">
                <div className="form-section-head">
                  <h4>Plan basics</h4>
                  <p>Name the plan clearly, then describe the mood, expectations, and what would make it feel safe.</p>
                </div>

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
                    rows={5}
                    required
                    disabled={preview || isPending}
                  />
                </label>
              </section>
            ) : null}

            {stepIndex === 1 ? (
              <section className="form-section">
                <div className="form-section-head">
                  <h4>Logistics</h4>
                  <p>Share just enough area and timing context for the right people to recognize the fit quickly.</p>
                </div>

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
                  <label className="range-field">
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
              </section>
            ) : null}

            {stepIndex === 2 ? (
              <section className="form-section">
                <div className="form-section-head">
                  <h4>Safety defaults</h4>
                  <p>Set expectations, review the draft, and only publish when the plan reads clearly end to end.</p>
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
              </section>
            ) : null}

            <div className="composer-actions">
              <button
                className="ghost-button compact"
                type="button"
                disabled={stepIndex === 0 || isPending}
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              >
                Back
              </button>

              {stepIndex < stepOrder.length - 1 ? (
                <button
                  className="primary-button compact"
                  type="button"
                  disabled={isPending || (stepIndex === 0 ? !basicsReady : !logisticsReady)}
                  onClick={() => setStepIndex((current) => Math.min(stepOrder.length - 1, current + 1))}
                >
                  Continue
                </button>
              ) : (
                <button className="primary-button compact" type="submit" disabled={preview || isPending}>
                  {preview ? "Preview mode only" : isPending ? "Posting..." : "Post Request"}
                </button>
              )}
            </div>
          </form>
        </div>

        <aside className="composer-preview panel">
          <div className="form-section-head">
            <h4>Live preview</h4>
            <p>Check how the request reads before you publish it. This is the moment to simplify and tighten.</p>
          </div>

          <div className="composer-preview-card">
            <div className="composer-preview-top">
              <span className="request-lane">{lane === "social" ? "Social" : "Errand"}</span>
              <span className="mini-chip">{formatDateTime(meetupAt || null)}</span>
            </div>
            <h4>{title.trim() || "Your request title will appear here."}</h4>
            <p>{description.trim() || "A calm, specific description helps the right person recognise the fit quickly."}</p>
          </div>

          <div className="composer-preview-meta">
            <div className="composer-preview-line">
              <span>Area</span>
              <strong>{areaLabel.trim() || "Add a neighbourhood or landmark"}</strong>
            </div>
            <div className="composer-preview-line">
              <span>Discovery radius</span>
              <strong>{radiusKm} km</strong>
            </div>
            <div className="composer-preview-line">
              <span>Replies</span>
              <strong>{verifiedOnly ? "Verified only" : "Open to all"}</strong>
            </div>
            <div className="composer-preview-line">
              <span>Check-ins</span>
              <strong>{checkInEnabled ? "Enabled" : "Off"}</strong>
            </div>
          </div>

          <div className="tag-row">
            {parsedTags.length > 0 ? (
              parsedTags.map((tag) => (
                <span key={tag} className="tag-chip active">
                  {tag}
                </span>
              ))
            ) : (
              <span className="request-privacy-note">Add a few tags so the right people can spot the request faster.</span>
            )}
          </div>

          <div className="composer-checklist">
            <div className={`composer-checklist-item ${basicsReady ? "done" : ""}`}>
              <CheckCircle2 size={16} />
              Basics {basicsReady ? "ready" : "need a stronger title and description"}
            </div>
            <div className={`composer-checklist-item ${logisticsReady ? "done" : ""}`}>
              <CheckCircle2 size={16} />
              Logistics {logisticsReady ? "ready" : "need an area before publishing"}
            </div>
            <div className={`composer-checklist-item ${stepIndex === 2 ? "done" : ""}`}>
              <CheckCircle2 size={16} />
              Final review {stepIndex === 2 ? "open" : "comes last"}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
