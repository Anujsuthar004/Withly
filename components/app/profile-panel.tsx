"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Clock3, LockKeyhole, MapPin, MessageCircleMore, ShieldCheck, Star, SunMedium, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  deleteAvailabilityWindowAction,
  removeProfileAvatarAction,
  setAvailabilityWindowAction,
  updateProfileAction,
  uploadProfileAvatarAction,
} from "@/app/workspace/actions";
import { ProfileAvatar } from "@/components/app/profile-avatar";
import { getDisplayTags, referenceMedia, referenceProfileReviews } from "@/lib/reference-content";
import type { WorkspaceProfile } from "@/lib/supabase/types";
import { getProfileCompletion } from "@/lib/utils";

export function ProfilePanel({
  profile,
  availability = [],
  preview,
  onStatus,
}: {
  profile: WorkspaceProfile;
  availability?: { id: string; day_of_week: number; start_time: string; end_time: string; label: string | null }[];
  preview: boolean;
  onStatus: (message: string) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: profile.displayName,
    aboutMe: profile.aboutMe,
    homeArea: profile.homeArea,
  });
  const [isPending, startTransition] = useTransition();
  const [isAvatarPending, startAvatarTransition] = useTransition();
  const [isAvailPending, startAvailTransition] = useTransition();

  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [availLabel, setAvailLabel] = useState("");
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef("");
  const displayName = form.displayName.trim() || profile.displayName;
  const activeAvatarUrl = avatarPreviewUrl || profile.avatarUrl;
  const progress = getProfileCompletion({ ...form, avatarUrl: activeAvatarUrl });
  const displayTags = getDisplayTags(form.aboutMe, form.homeArea);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function resetAvatarSelection() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }

    setSelectedAvatarFile(null);
    setAvatarPreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleAvatarUpload() {
    if (!selectedAvatarFile) {
      onStatus("Choose a photo first.");
      return;
    }

    startAvatarTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("avatar", selectedAvatarFile);

        const result = await uploadProfileAvatarAction(formData);
        onStatus(result.message);

        if (result.ok) {
          resetAvatarSelection();
          router.refresh();
        }
      } catch {
        onStatus("Could not upload the photo right now. Please try again.");
      }
    });
  }

  function handleAvatarRemoval() {
    startAvatarTransition(async () => {
      try {
        if (selectedAvatarFile) {
          resetAvatarSelection();
          onStatus("Photo selection cleared.");
          return;
        }

        const result = await removeProfileAvatarAction();
        onStatus(result.message);

        if (result.ok) {
          router.refresh();
        }
      } catch {
        onStatus("Could not update the photo right now. Please try again.");
      }
    });
  }

  return (
    <section className="trust-dashboard-shell">
      <div className="trust-dashboard-grid">
        <aside className="trust-dashboard-left">
          <article className="trust-identity-card">
            <div className="trust-avatar-wrap">
              <ProfileAvatar name={displayName} url={activeAvatarUrl} size="xl" />
              <span className="trust-avatar-badge">
                <ShieldCheck size={14} />
              </span>
            </div>
            <h2>{displayName}</h2>
            <p>Certified companion</p>

            <div className="trust-score-card">
              <div className="trust-score-head">
                <span>Trust score</span>
                <strong>{profile.trustScore}</strong>
              </div>
              <div className="trust-score-bar">
                <span style={{ width: `${profile.trustScore}%` }} />
              </div>
              <small>
                {profile.verificationTier === "id_verified"
                  ? "Identity verified via secure review and recent successful sessions."
                  : "Verification is active and the profile is ready for clearer trust signals."}
              </small>
            </div>
          </article>

          <article className="trust-mutual-card">
            <p className="sanctuary-kicker">Mutual circles</p>
            <div className="trust-mutual-avatars">
              {referenceMedia.profileMutuals.map((url) => (
                <span key={url} className="trust-mutual-avatar">
                  <Image src={url} alt="" fill sizes="40px" />
                </span>
              ))}
              <span className="trust-mutual-more">+4</span>
            </div>
            <p>
              You both belong to the <strong>{form.homeArea || "Quietude Collective"}</strong> circle and calm planning spaces.
            </p>
          </article>
        </aside>

        <div className="trust-dashboard-main">
          <section className="trust-intent-section">
            <p className="sanctuary-kicker accent">The curator&apos;s intent</p>
            <h2>Creating spaces for presence and calm.</h2>
            <p>
              {form.aboutMe ||
                "I specialize in low-stimulation companionship, focused on grounded pacing, clear logistics, and warm follow-through."}
            </p>
            <div className="trust-tag-row">
              {displayTags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </section>

          <section className="trust-engagement-section">
            <div className="trust-section-head">
              <h3>Past Engagements</h3>
              <span>View Full History</span>
            </div>

            <div className="trust-review-grid">
              {referenceProfileReviews.map((review) => (
                <article key={review.title} className="trust-review-card">
                  <div className="trust-stars">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} size={12} fill="currentColor" />
                    ))}
                  </div>
                  <p>&quot;{review.quote}&quot;</p>
                  <div className="trust-review-meta">
                    <strong>{review.title}</strong>
                    <span>{review.date}</span>
                  </div>
                </article>
              ))}
            </div>

            <article className="trust-banner-card">
              <Image src={referenceMedia.profileBanner} alt="Sanctuary certification" fill sizes="(max-width: 960px) 100vw, 840px" />
              <div className="trust-banner-overlay" />
              <div className="trust-banner-copy">
                <div>
                  <h3>Sanctuary Certified</h3>
                  <p>{availability.length > 0 ? `${availability.length}+ availability windows are currently active.` : "Ready for quiet, grounded sessions."}</p>
                </div>
                <span>Active partner</span>
              </div>
            </article>
          </section>

          <section className="trust-spec-grid">
            <article className="trust-spec-card">
              <p className="sanctuary-kicker">Interaction style</p>
              <ul>
                <li>
                  <MessageCircleMore size={16} />
                  <div>
                    <strong>Minimalist communication</strong>
                    <span>Prefers brief logistical texts over long calls.</span>
                  </div>
                </li>
                <li>
                  <SunMedium size={16} />
                  <div>
                    <strong>Morning preference</strong>
                    <span>
                      {availability[0]
                        ? `${days[availability[0].day_of_week]} ${availability[0].start_time} - ${availability[0].end_time}`
                        : "Best availability often starts earlier in the day."}
                    </span>
                  </div>
                </li>
              </ul>
            </article>

            <article className="trust-spec-card">
              <p className="sanctuary-kicker">Safety standards</p>
              <ul>
                <li>
                  <MapPin size={16} />
                  <div>
                    <strong>Public spaces only</strong>
                    <span>Meetups stay grounded in clear, vetted public locations.</span>
                  </div>
                </li>
                <li>
                  <LockKeyhole size={16} />
                  <div>
                    <strong>End-to-end tracking</strong>
                    <span>Private threads keep the plan, updates, and check-ins together.</span>
                  </div>
                </li>
              </ul>
            </article>
          </section>
        </div>
      </div>

      <form
        className="profile-studio-form"
        onSubmit={(event) => {
          event.preventDefault();

          startTransition(async () => {
            const result = await updateProfileAction(form);
            onStatus(result.message);
            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        <section className="profile-studio-card">
          <div className="profile-studio-head">
            <div>
              <p className="sanctuary-kicker">Edit studio</p>
              <h3>Profile details</h3>
            </div>
            <span className="sanctuary-chip">{progress.percentage}% complete</span>
          </div>

          <div className="profile-studio-meter">
            <span style={{ width: `${progress.percentage}%` }} />
          </div>

          <input
            ref={fileInputRef}
            id="profile-avatar-input"
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
                previewUrlRef.current = "";
              }

              setSelectedAvatarFile(nextFile);
              if (nextFile) {
                const nextPreviewUrl = URL.createObjectURL(nextFile);
                previewUrlRef.current = nextPreviewUrl;
                setAvatarPreviewUrl(nextPreviewUrl);
              } else {
                setAvatarPreviewUrl("");
              }
            }}
            disabled={preview || isAvatarPending}
          />

          <div className="profile-studio-avatar-row">
            <ProfileAvatar name={displayName} url={activeAvatarUrl} size="xl" />
            <div className="profile-studio-avatar-copy">
              <strong>Profile photo</strong>
              <p>Use a clear, recent photo so people can recognize you quickly.</p>
              <div className="profile-studio-avatar-actions">
                <label className="composer-text-button profile-upload-button" htmlFor="profile-avatar-input">
                  {selectedAvatarFile ? "Choose another photo" : "Choose photo"}
                </label>
                <button
                  className="sanctuary-primary-button"
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={preview || isAvatarPending || !selectedAvatarFile}
                >
                  {!preview && isAvatarPending && selectedAvatarFile && <span className="btn-spinner" />}
                  {preview ? "Preview mode only" : isAvatarPending && selectedAvatarFile ? "Uploading..." : "Upload photo"}
                </button>
                <button
                  className="sanctuary-ghost-button danger"
                  type="button"
                  onClick={handleAvatarRemoval}
                  disabled={preview || isAvatarPending || (!selectedAvatarFile && !profile.avatarUrl)}
                >
                  {!preview && isAvatarPending && <span className="btn-spinner" />}
                  {preview ? "Preview mode only" : isAvatarPending ? "Working..." : selectedAvatarFile ? "Clear selection" : "Remove photo"}
                </button>
              </div>
            </div>
          </div>

          <div className="profile-studio-fields">
            <label className="composer-line-field">
              <span>Display name</span>
              <input
                type="text"
                value={form.displayName}
                onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                minLength={2}
                maxLength={60}
                disabled={preview || isPending}
              />
            </label>

            <label className="composer-line-field">
              <span>Home area</span>
              <input
                type="text"
                value={form.homeArea}
                onChange={(event) => setForm((current) => ({ ...current, homeArea: event.target.value }))}
                maxLength={120}
                disabled={preview || isPending}
              />
            </label>

            <label className="composer-line-field composer-line-field--full">
              <span>About you</span>
              <textarea
                rows={4}
                value={form.aboutMe}
                onChange={(event) => setForm((current) => ({ ...current, aboutMe: event.target.value }))}
                maxLength={300}
                disabled={preview || isPending}
              />
            </label>
          </div>
        </section>

        <section className="profile-studio-card">
          <div className="profile-studio-head">
            <div>
              <p className="sanctuary-kicker">Availability</p>
              <h3>Recurring windows</h3>
            </div>
            <span className="sanctuary-chip">{availability.length} active</span>
          </div>

          {availability.length > 0 ? (
            <div className="profile-availability-list">
              {availability.map((window) => (
                <div key={window.id} className="profile-availability-item">
                  <div>
                    <strong>
                      {days[window.day_of_week]} {window.start_time} - {window.end_time}
                    </strong>
                    <span>{window.label || "Open window"}</span>
                  </div>
                  <button
                    type="button"
                    className="sanctuary-ghost-button danger"
                    disabled={preview || isAvailPending}
                    onClick={() => {
                      startAvailTransition(async () => {
                        const formData = new FormData();
                        formData.set("windowId", window.id);
                        const result = await deleteAvailabilityWindowAction({ ok: false, message: "" }, formData);
                        onStatus(result.message);
                        if (result.ok) router.refresh();
                      });
                    }}
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="profile-availability-fields">
            <label className="composer-line-field">
              <span>Day</span>
              <select value={dayOfWeek} onChange={(event) => setDayOfWeek(Number(event.target.value))} disabled={preview || isAvailPending}>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
                <option value={0}>Sunday</option>
              </select>
            </label>

            <label className="composer-line-field">
              <span>Start time</span>
              <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} disabled={preview || isAvailPending} />
            </label>

            <label className="composer-line-field">
              <span>End time</span>
              <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} disabled={preview || isAvailPending} />
            </label>

            <label className="composer-line-field">
              <span>Label</span>
              <input type="text" placeholder="e.g. Afternoon walk" value={availLabel} onChange={(event) => setAvailLabel(event.target.value)} disabled={preview || isAvailPending} />
            </label>
          </div>

          <button
            className="sanctuary-primary-button"
            type="button"
            disabled={preview || isAvailPending}
            onClick={() => {
              startAvailTransition(async () => {
                const formData = new FormData();
                formData.set("dayOfWeek", String(dayOfWeek));
                formData.set("startTime", startTime);
                formData.set("endTime", endTime);
                formData.set("label", availLabel);

                const result = await setAvailabilityWindowAction({ ok: false, message: "" }, formData);
                onStatus(result.message);

                if (result.ok) {
                  setAvailLabel("");
                  router.refresh();
                }
              });
            }}
          >
            <Clock3 size={16} />
            Add window
          </button>
        </section>

        <button className="composer-submit-button" type="submit" disabled={preview || isPending || isAvatarPending}>
          {!preview && isPending && <span className="btn-spinner" />}
          {preview ? "Preview mode only" : isPending ? "Saving..." : "Save profile details"}
        </button>
      </form>
    </section>
  );
}
