"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarClock, Check, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  deleteAvailabilityWindowAction,
  setAvailabilityWindowAction,
  updateProfileAction,
  uploadProfileAvatarAction,
} from "@/app/workspace/actions";
import { ProfileAvatar } from "@/components/app/profile-avatar";
import type { AvailabilityWindow, TrustedCompanion, WorkspaceProfile } from "@/lib/supabase/types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ProfilePanel({
  profile,
  availability = [],
  companions = [],
  preview,
  onStatus,
}: {
  profile: WorkspaceProfile;
  availability?: AvailabilityWindow[];
  companions?: TrustedCompanion[];
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
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef("");
  const [isEditing, setIsEditing] = useState(false);
  const [availabilityForm, setAvailabilityForm] = useState({ dayOfWeek: 1, startTime: "18:00", endTime: "20:00", label: "" });
  const [isAvailabilityPending, startAvailabilityTransition] = useTransition();

  const displayName = form.displayName.trim() || profile.displayName;
  const activeAvatarUrl = avatarPreviewUrl || profile.avatarUrl;
  const initials = displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const tierLabel =
    profile.verificationTier === "id_verified"
      ? "ID Verified"
      : profile.verificationTier === "phone"
        ? "Phone verified"
        : "Email confirmed";

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

  const verifications = [{ label: "Email", status: "Confirmed", done: true }];

  return (
    <div className="wl-profile" style={{ maxWidth: 960 }}>
      {/* Hero card */}
      <section className="wl-profile-hero">
        <div className="wl-profile-cover" />
        <div className="wl-profile-hero-body">
          <div className="wl-profile-avatar-wrap">
            {activeAvatarUrl ? (
              <ProfileAvatar name={displayName} url={activeAvatarUrl} size="xl" />
            ) : (
              <div className="wl-profile-avatar-initials">{initials}</div>
            )}
          </div>
          <div className="wl-profile-hero-info">
            <div className="wl-profile-name-row">
              <h2>{displayName}</h2>
              <span className="wl-verified-pill">
                <ShieldCheck size={13} />
                {tierLabel}
              </span>
            </div>
            <p className="wl-profile-bio">
              {profile.homeArea || "Location not set"} · {profile.aboutMe || "Prefers clear plans, public spaces, and fast confirmations."}
            </p>
          </div>
          <div className="wl-profile-hero-actions">
            <button
              type="button"
              className="wl-btn-gradient"
              onClick={() => setIsEditing((c) => !c)}
            >
              {isEditing ? "Cancel editing" : "Edit profile"}
            </button>
          </div>
        </div>
      </section>

      {/* Edit form (collapsible) */}
      {isEditing && (
        <section className="wl-profile-edit-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const result = await updateProfileAction(form);
                onStatus(result.message);
                if (result.ok) {
                  setIsEditing(false);
                  router.refresh();
                }
              });
            }}
          >
            <div className="wl-edit-grid">
              <label className="wl-edit-field">
                Display name
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm((c) => ({ ...c, displayName: e.target.value }))}
                  minLength={2}
                  maxLength={60}
                  disabled={preview || isPending}
                />
              </label>
              <label className="wl-edit-field">
                Home area
                <input
                  type="text"
                  value={form.homeArea}
                  onChange={(e) => setForm((c) => ({ ...c, homeArea: e.target.value }))}
                  maxLength={120}
                  disabled={preview || isPending}
                />
              </label>
            </div>
            <label className="wl-edit-field">
              About you
              <textarea
                rows={3}
                value={form.aboutMe}
                onChange={(e) => setForm((c) => ({ ...c, aboutMe: e.target.value }))}
                maxLength={300}
                disabled={preview || isPending}
              />
            </label>

            {/* Avatar section */}
            <div className="wl-edit-avatar-section">
              <input
                ref={fileInputRef}
                id="profile-avatar-input"
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const nextFile = e.target.files?.[0] ?? null;
                  if (previewUrlRef.current) {
                    URL.revokeObjectURL(previewUrlRef.current);
                    previewUrlRef.current = "";
                  }
                  setSelectedAvatarFile(nextFile);
                  if (nextFile) {
                    const url = URL.createObjectURL(nextFile);
                    previewUrlRef.current = url;
                    setAvatarPreviewUrl(url);
                  } else {
                    setAvatarPreviewUrl("");
                  }
                }}
                disabled={preview || isAvatarPending}
              />
              <label className="wl-btn-ghost" htmlFor="profile-avatar-input">
                {selectedAvatarFile ? "Choose another" : "Change photo"}
              </label>
              {selectedAvatarFile && (
                <button
                  type="button"
                  className="wl-btn-teal"
                  onClick={() => {
                    if (!selectedAvatarFile) return;
                    startAvatarTransition(async () => {
                      const fd = new FormData();
                      fd.set("avatar", selectedAvatarFile);
                      const result = await uploadProfileAvatarAction(fd);
                      onStatus(result.message);
                      if (result.ok) { resetAvatarSelection(); router.refresh(); }
                    });
                  }}
                  disabled={isAvatarPending}
                >
                  {isAvatarPending ? "Uploading..." : "Upload photo"}
                </button>
              )}
            </div>

            <button className="wl-btn-gradient" type="submit" disabled={preview || isPending || isAvatarPending}>
              {preview ? "Preview mode only" : isPending ? "Saving..." : "Save profile details"}
            </button>
          </form>
        </section>
      )}

      {/* Two-up: Trust + Endorsements */}
      <div className="wl-profile-two-up">
        {/* Trust score */}
        <div className="wl-rail-card">
          <div className="wl-trust-head">
            <h3>Trust score</h3>
            <span className="wl-trust-number">{profile.trustScore}<span>/100</span></span>
          </div>
          <div className="wl-trust-bar">
            <div className="wl-trust-bar-fill" style={{ width: `${profile.trustScore}%` }} />
          </div>
          <div className="wl-verify-list">
            {verifications.map((v) => (
              <div key={v.label} className="wl-verify-item">
                <span className={`wl-verify-dot ${v.done ? "done" : ""}`}>
                  <Check size={14} />
                </span>
                <div className="wl-verify-info">
                  <strong>{v.label}</strong>
                  <small>{v.status}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div className="wl-rail-card">
          <h3 className="wl-rail-title">Availability</h3>
          <div className="wl-endorse-list">
            {availability.length === 0 ? <p>No availability windows saved yet.</p> : null}
            {availability.map((window) => (
              <div key={window.id} className="wl-endorse-item">
                <CalendarClock size={18} />
                <div className="wl-endorse-text">
                  <strong>{DAYS[window.dayOfWeek]}</strong> {window.startTime.slice(0, 5)}–{window.endTime.slice(0, 5)} {window.label}
                </div>
                <button
                  type="button"
                  className="wl-verify-action"
                  aria-label={`Remove ${DAYS[window.dayOfWeek]} availability`}
                  disabled={preview || isAvailabilityPending}
                  onClick={() => startAvailabilityTransition(async () => {
                    const formData = new FormData();
                    formData.set("windowId", window.id);
                    const result = await deleteAvailabilityWindowAction({ ok: false, message: "" }, formData);
                    onStatus(result.message);
                    if (result.ok) router.refresh();
                  })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              startAvailabilityTransition(async () => {
                const formData = new FormData();
                formData.set("dayOfWeek", String(availabilityForm.dayOfWeek));
                formData.set("startTime", availabilityForm.startTime);
                formData.set("endTime", availabilityForm.endTime);
                formData.set("label", availabilityForm.label);
                const result = await setAvailabilityWindowAction({ ok: false, message: "" }, formData);
                onStatus(result.message);
                if (result.ok) router.refresh();
              });
            }}
          >
            <select
              aria-label="Availability day"
              value={availabilityForm.dayOfWeek}
              disabled={preview || isAvailabilityPending}
              onChange={(event) => setAvailabilityForm((current) => ({ ...current, dayOfWeek: Number(event.target.value) }))}
            >
              {DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
            <div className="grid-two">
              <input
                aria-label="Availability start time"
                type="time"
                value={availabilityForm.startTime}
                disabled={preview || isAvailabilityPending}
                onChange={(event) => setAvailabilityForm((current) => ({ ...current, startTime: event.target.value }))}
              />
              <input
                aria-label="Availability end time"
                type="time"
                value={availabilityForm.endTime}
                disabled={preview || isAvailabilityPending}
                onChange={(event) => setAvailabilityForm((current) => ({ ...current, endTime: event.target.value }))}
              />
            </div>
            <input
              aria-label="Availability label"
              placeholder="Optional label"
              maxLength={80}
              value={availabilityForm.label}
              disabled={preview || isAvailabilityPending}
              onChange={(event) => setAvailabilityForm((current) => ({ ...current, label: event.target.value }))}
            />
            <button className="wl-btn-teal" type="submit" disabled={preview || isAvailabilityPending}>
              {preview ? "Preview mode only" : isAvailabilityPending ? "Saving..." : "Add availability"}
            </button>
          </form>
        </div>
      </div>

      {/* Meet-again roster */}
      <div className="wl-rail-card">
        <div className="wl-meet-head">
          <h3>Meet-again roster</h3>
          <span>People you&apos;d tag along with again</span>
        </div>
        <div className="wl-meet-scroll">
          {companions.length === 0 ? <p>No mutual meet-again connections yet.</p> : null}
          {companions.map((companion) => (
            <div key={companion.id} className="wl-meet-card">
              <div className="wl-meet-avatar">{companion.companionName.slice(0, 1).toUpperCase()}</div>
              <strong>{companion.companionName}</strong>
              <span>Trust {companion.companionTrustScore}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
