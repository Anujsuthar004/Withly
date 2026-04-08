"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Clock, Plus, Radar, ShieldCheck, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { 
  deleteAvailabilityWindowAction,
  removeProfileAvatarAction, 
  setAvailabilityWindowAction,
  updateProfileAction, 
  uploadProfileAvatarAction 
} from "@/app/workspace/actions";
import { ProfileAvatar } from "@/components/app/profile-avatar";
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
    <section className="panel profile-panel">
      <div className="panel-heading">
        <div>
          <p className="kicker">Identity</p>
          <h3>{profile.displayName}</h3>
        </div>
        <div className="card-chip-row align-right">
          <span className="status-dot">
            <Radar size={16} />
            {profile.homeArea || "Area not set"}
          </span>
          <span className="status-dot">
            <Star size={16} />
            {profile.trustScore}/100 Trust
          </span>
          <span className="status-dot">
            <ShieldCheck size={16} />
            {profile.verificationTier === "id_verified" ? "ID Verified" : profile.verificationTier === "phone" ? "Phone Verified" : "Email Verified"}
          </span>
        </div>
      </div>
      <p className="panel-intro">Keep the essentials current so people understand who they are talking to before they ever reply.</p>

      <div className="profile-progress-card">
        <div className="profile-strength-meter" aria-label={`Profile ${progress.percentage}% complete`}>
          <div className="profile-strength-bar">
            <span style={{ width: `${progress.percentage}%` }} />
          </div>
          <strong>{progress.percentage}% complete</strong>
        </div>

        <div className="profile-strength-checklist">
          {progress.steps.map((step) => (
            <div key={step.id} className={`profile-strength-item ${step.done ? "done" : ""}`}>
              <span>{step.label}</span>
              <strong>{step.done ? "Done" : "Add it"}</strong>
            </div>
          ))}
        </div>
      </div>

      <form
        className="stack-form"
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
        <section className="form-section profile-avatar-card">
          <div className="profile-avatar-stack">
            <ProfileAvatar name={displayName} url={activeAvatarUrl} size="xl" />
            <div className="profile-avatar-copy">
              <div className="form-section-head">
                <h4>Profile photo</h4>
                <p>Use a clear, recent photo so people can recognise you quickly. If you skip it, the app falls back to your initials.</p>
              </div>
              <div className="profile-avatar-meta">
                <span className="mini-chip">{activeAvatarUrl ? "Photo ready" : "Initials placeholder"}</span>
                {selectedAvatarFile ? <span className="mini-chip">{selectedAvatarFile.name}</span> : null}
              </div>
            </div>
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

          <div className="button-row profile-avatar-actions">
            <label className="ghost-button compact file-picker-button" htmlFor="profile-avatar-input">
              {selectedAvatarFile ? "Choose another photo" : "Choose photo"}
            </label>
            <button
              className="secondary-button compact"
              type="button"
              onClick={handleAvatarUpload}
              disabled={preview || isAvatarPending || !selectedAvatarFile}
            >
              {preview ? "Preview mode only" : isAvatarPending && selectedAvatarFile ? "Uploading..." : "Upload photo"}
            </button>
            <button
              className="ghost-button compact danger-button"
              type="button"
              onClick={handleAvatarRemoval}
              disabled={preview || isAvatarPending || (!selectedAvatarFile && !profile.avatarUrl)}
            >
              {preview ? "Preview mode only" : isAvatarPending ? "Working..." : selectedAvatarFile ? "Clear selection" : "Remove photo"}
            </button>
          </div>

          <p className="profile-avatar-note">JPG, PNG, or WebP up to 4 MB.</p>
        </section>

        <section className="form-section">
          <div className="form-section-head">
            <h4>Public details</h4>
            <p>Make this recognisable, calm, and honest. People should know who they are meeting in a few seconds.</p>
          </div>

          <div className="grid-two">
            <label>
              Display name
              <input
                type="text"
                value={form.displayName}
                onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                minLength={2}
                maxLength={60}
                disabled={preview || isPending}
              />
            </label>

            <label>
              Home area
              <input
                type="text"
                value={form.homeArea}
                onChange={(event) => setForm((current) => ({ ...current, homeArea: event.target.value }))}
                maxLength={120}
                disabled={preview || isPending}
              />
            </label>
          </div>

          <label>
            About you
            <textarea
              rows={3}
              value={form.aboutMe}
              onChange={(event) => setForm((current) => ({ ...current, aboutMe: event.target.value }))}
              maxLength={300}
              disabled={preview || isPending}
            />
          </label>
        </section>

        <section className="form-section">
          <div className="form-section-head">
            <h4>Availability Windows</h4>
            <p>Set a few recurring windows when you&apos;re typically free. Helps match you with regular companions.</p>
          </div>

          {availability.length > 0 && (
            <div className="summary-callout" style={{ padding: "1rem" }}>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {availability.map((window) => {
                  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                  return (
                    <li key={window.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        <strong>{days[window.day_of_week]}</strong> {window.start_time} - {window.end_time}
                        {window.label ? ` (${window.label})` : ""}
                      </span>
                      <button
                        type="button"
                        className="danger-button ghost-button compact"
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
                        <Trash2 size={12} /> Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="grid-two">
            <label>
              Day
              <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} disabled={preview || isAvailPending}>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
                <option value={0}>Sunday</option>
              </select>
            </label>

            <label>
              Start Time
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={preview || isAvailPending} />
            </label>

            <label>
              End Time
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={preview || isAvailPending} />
            </label>

            <label>
              Label (Optional)
              <input type="text" placeholder="e.g. Afternoon Walk" value={availLabel} onChange={(e) => setAvailLabel(e.target.value)} disabled={preview || isAvailPending} />
            </label>
          </div>

          <button
            className="secondary-button compact"
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
            <Clock size={16} /> Add Window
          </button>
        </section>

        <button className="primary-button" type="submit" disabled={preview || isPending || isAvatarPending}>
          {preview ? "Preview mode only" : isPending ? "Saving..." : "Save profile details"}
        </button>
      </form>
    </section>
  );
}
