"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowUpRight, BookOpen, Check, Clock, Coffee, Headphones, Laptop, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";
import styles from "@/app/compose-design.module.css";
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
    icon: Headphones,
    label: "Deep Work Sprint",
    lane: "social" as const,
    title: "2-hour deep work & coffee sprint",
    description: "Looking for an accountability partner to share a cafe table. Headphones on for focus sprints, quick chat during coffee refills!",
    tags: "deep-work, coffee-shop, laptop-friendly, quiet-focus",
  },
  {
    icon: Laptop,
    label: "Side Project Coworking",
    lane: "social" as const,
    title: "Cafe coworking & side projects",
    description: "Hacking on side projects/coding from a cafe this afternoon. Would love to share a table, bounce ideas, and stay productive together.",
    tags: "side-projects, coworking, coffee-shop, casual",
  },
  {
    icon: BookOpen,
    label: "Library Study Session",
    lane: "social" as const,
    title: "Quiet library study & reading block",
    description: "Heading to a quiet library or cafe for deep reading and study prep. Looking for an accountability buddy to share a table.",
    tags: "study-session, quiet-focus, library, reading",
  },
  {
    icon: Coffee,
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
  const radiusKm = 5;
  const [tags, setTags] = useState(defaultTags.social.join(", "));
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const checkInEnabled = true;
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
    <div className={styles.layout}>
      {/* ─── Left column: Form ─── */}
      <div className={styles.formColumn}>
        <div className={styles.formCard}>
          <div className={styles.sectionHeading}>
            <span className={styles.stepNumber} aria-hidden="true">01</span>
            <div><h2>Pick your kind of plan</h2><p>Start with an idea, then make it yours.</p></div>
          </div>

          {/* Quick Presets */}
          <div className={styles.presets}>
            <p className={styles.presetHint}>A little inspiration · tap to fill</p>
            <div className={styles.presetGrid}>
              {quickPresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={styles.preset}
                  aria-pressed={lane === preset.lane && title === preset.title && description === preset.description && tags === preset.tags}
                  disabled={isPending}
                  onClick={() => {
                    setLane(preset.lane);
                    setTitle(preset.title);
                    setDescription(preset.description);
                    setTags(preset.tags);
                  }}
                >
                  <span className={styles.presetIcon}><preset.icon size={20} strokeWidth={1.7} aria-hidden="true" /></span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (preview || isPending || !canSubmit) return;

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
            <div className={styles.laneSwitch} role="group" aria-label="Request activity">
              <button
                type="button"
                aria-pressed={lane === "social"}
                disabled={isPending}
                onClick={() => { setLane("social"); setTags(defaultTags.social.join(", ")); }}
              >
                <Headphones size={16} aria-hidden="true" /> Coworking &amp; Focus
              </button>
              <button
                type="button"
                aria-pressed={lane === "errand"}
                disabled={isPending}
                onClick={() => { setLane("errand"); setTags(defaultTags.errand.join(", ")); }}
              >
                <Coffee size={16} aria-hidden="true" /> Coffee Walk
              </button>
            </div>

            {/* Fields */}
            <div className={`${styles.sectionHeading} ${styles.dividedHeading}`}>
              <span className={styles.stepNumber} aria-hidden="true">02</span>
              <div><h2>Make the plan clear</h2><p>The what, where and when. Keep private details out.</p></div>
            </div>
            <div className={styles.fields}>
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
                  disabled={isPending}
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
                  disabled={isPending}
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
                    disabled={isPending}
                  />
                </label>
                <label className="wl-compose-field">
                  Tags
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="comma, separated, tags"
                    disabled={isPending}
                  />
                </label>
              </div>

              <div className="wl-compose-two">
                <label className="wl-compose-field">
                  When (optional)
                  <input
                    type="datetime-local"
                    value={meetupAt}
                    onChange={(e) => setMeetupAt(e.target.value)}
                    disabled={isPending}
                  />
                </label>
              </div>
              <p className={styles.fieldHint}>Choose a public place. Leave the time blank if you’d rather agree in chat.</p>
            </div>

            {/* Toggles */}
            <div className={`${styles.sectionHeading} ${styles.dividedHeading}`}>
              <span className={styles.stepNumber} aria-hidden="true">03</span>
              <div><h2>A few thoughtful boundaries</h2><p>Your preferences, before you put the invitation out.</p></div>
            </div>
            <div className={styles.preferences}>
              <label className={styles.preference}>
                <span><strong>Email-confirmed members only</strong><small>Only members with a confirmed email can respond.</small></span>
                <input type="checkbox" role="switch" aria-label="Email-confirmed members only" checked={verifiedOnly} disabled={isPending} onChange={(event) => setVerifiedOnly(event.target.checked)} />
              </label>
              <label className={styles.preference}>
                <span><strong>Close after six hours</strong><small>Automatically expires six hours after posting.</small></span>
                <input type="checkbox" role="switch" aria-label="Close after six hours" checked={ephemeral} disabled={isPending} onChange={(event) => setEphemeral(event.target.checked)} />
              </label>
            </div>
            <p className={styles.safetyHint}><ShieldCheck size={16} aria-hidden="true" /> Email confirmation isn’t an identity or safety guarantee. Meet in public and agree on the details in chat.</p>

            {hasTurnstileSiteKey ? (
              <div style={{ marginTop: 16 }}>
                <TurnstileWidget key={turnstileKey} siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} theme="light" />
              </div>
            ) : null}

            {preview ? <p className={styles.previewNotice}>Try the form here. This is a preview—nothing will be published.</p> : null}
            {statusMessage && !preview ? <p className={styles.status} role="status">{statusMessage}</p> : null}

            <div className={styles.actions}>
              <button type="button" className={styles.cancel} onClick={() => router.push("/feed")}>
                Cancel
              </button>
              <button className={styles.publish} type="submit" disabled={preview || isPending || !canSubmit}>
                {preview ? "Preview mode only" : isPending ? "Posting..." : "Publish request"}<ArrowUpRight size={17} aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ─── Right rail: Preview + Checklist ─── */}
      <aside className={styles.previewRail} aria-label="Your request preview">
        <div className={styles.previewHeading}><span className={styles.pairMark} aria-hidden="true" /><h2>Your invitation</h2><span>PREVIEW</span></div>

        {/* Preview card mimicking the real card */}
        <div className={styles.previewCard} data-lane={lane}>
          <div className={styles.previewActivity}>{lane === "social" ? <Headphones size={17} aria-hidden="true" /> : <Coffee size={17} aria-hidden="true" />}<span>{lane === "social" ? "Coworking & Focus" : "Coffee Walk"}</span></div>
          <div className={styles.previewBody}>
            <div className={styles.previewHost}>
              <span className={styles.youAvatar}>You</span>
              <div><strong>Your next little plan</strong><small>Waiting for a +1</small></div>
            </div>
            <h3>{title.trim() || "Something good starts with a plan."}</h3>
            <p>{description.trim() || "Your words go here. Tell someone what you have in mind, and what kind of company you’d like."}</p>
            <div className={styles.previewMeta}>
              {areaLabel.trim() && (
                <span>
                  <MapPin size={12} />
                  {areaLabel}
                </span>
              )}
              <span><Clock size={12} aria-hidden="true" />{meetupAt ? formatDateTime(meetupAt) : "Time is flexible"}</span>
            </div>
            <div className={styles.previewTags}>{parsedTags.slice(0, 3).map((tag, index) => <span key={`${tag}-${index}`}>#{tag}</span>)}</div>
            <div className={styles.previewPreferences}>{verifiedOnly ? <span><ShieldCheck size={13} aria-hidden="true" /> Email-confirmed replies</span> : null}{ephemeral ? <span><Clock size={13} aria-hidden="true" /> Closes 6h after posting</span> : null}</div>
          </div>
        </div>

        {/* Checklist */}
        <div className={styles.checklist}>
          <div className={styles.checklistHeading}><h3>A little detail goes a long way</h3><span>{checklist.filter((item) => item.done).length}/{checklist.length}</span></div>
          <div className={styles.progressTrack} role="progressbar" aria-label="Request details completed" aria-valuemin={0} aria-valuemax={checklist.length} aria-valuenow={checklist.filter((item) => item.done).length}><span style={{ width: `${checklist.filter((item) => item.done).length / checklist.length * 100}%` }} /></div>
          {checklist.map((item) => (
            <div key={item.label} className={styles.checklistItem} data-done={item.done}>
              <span className={styles.checkDot}>
                {item.done ? <Check size={11} aria-hidden="true" /> : null}
              </span>
              <span>{item.label}</span><span className={styles.srOnly}>{item.done ? ": complete" : ": not yet complete"}</span>
            </div>
          ))}
          <p>A helpful guide, not a score. Tags are optional.</p>
        </div>
        <div className={styles.afterPosting}><ShieldCheck size={19} aria-hidden="true" /><h3>You choose who joins.</h3><p>Review replies, approve a companion, then coordinate in your private session chat.</p><Link href="/safety/reporting">A quick safety refresher ↗</Link></div>
      </aside>
    </div>
  );
}
