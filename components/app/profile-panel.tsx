"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ShieldCheck, Star } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  removeProfileAvatarAction,
  updateProfileAction,
  uploadProfileAvatarAction,
} from "@/app/workspace/actions";
import { ProfileAvatar } from "@/components/app/profile-avatar";
import type { WorkspaceProfile } from "@/lib/supabase/types";

const ENDORSEMENTS = [
  { name: "Aarav", initials: "A", color: "linear-gradient(135deg,#3FA796,#2C7A6B)", text: "punctual and easy to plan with." },
  { name: "Mira", initials: "M", color: "linear-gradient(135deg,#D6497E,#B32E63)", text: "kept things calm and clear the whole time." },
  { name: "Kabir", initials: "K", color: "linear-gradient(135deg,#B37FE0,#8C4FC4)", text: "great company for a quiet evening out." },
];

const MEET_AGAIN = [
  { name: "Aarav", initials: "A", color: "linear-gradient(135deg,#3FA796,#2C7A6B)", sessions: "2 sessions together" },
  { name: "Mira", initials: "M", color: "linear-gradient(135deg,#D6497E,#B32E63)", sessions: "1 session" },
  { name: "Zoya", initials: "Z", color: "linear-gradient(135deg,#E0864B,#C65D3B)", sessions: "1 session" },
  { name: "Kabir", initials: "K", color: "linear-gradient(135deg,#B37FE0,#8C4FC4)", sessions: "3 sessions together" },
];

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
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef("");
  const [isEditing, setIsEditing] = useState(false);

  const displayName = form.displayName.trim() || profile.displayName;
  const activeAvatarUrl = avatarPreviewUrl || profile.avatarUrl;
  const initials = displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const tierLabel =
    profile.verificationTier === "id_verified"
      ? "ID Verified"
      : profile.verificationTier === "phone"
        ? "Phone verified"
        : "Email verified";

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

  const verifications = [
    { label: "Email", status: "Verified · institutional", done: true },
    {
      label: "Phone",
      status: profile.verificationTier === "phone" || profile.verificationTier === "id_verified" ? "Verified" : "Not verified",
      done: profile.verificationTier === "phone" || profile.verificationTier === "id_verified",
    },
    { label: "Government ID", status: "Not verified — worth +20 trust", done: profile.verificationTier === "id_verified", action: profile.verificationTier !== "id_verified" },
  ];

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
                {v.action && (
                  <button type="button" className="wl-verify-action">Verify</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Endorsements */}
        <div className="wl-rail-card">
          <h3 className="wl-rail-title">Endorsements</h3>
          <div className="wl-endorse-list">
            {ENDORSEMENTS.map((e) => (
              <div key={e.name} className="wl-endorse-item">
                <div className="wl-endorse-avatar" style={{ background: e.color }}>{e.initials}</div>
                <div className="wl-endorse-text">
                  <strong>{e.name}</strong> {e.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Meet-again roster */}
      <div className="wl-rail-card">
        <div className="wl-meet-head">
          <h3>Meet-again roster</h3>
          <span>People you&apos;d tag along with again</span>
        </div>
        <div className="wl-meet-scroll">
          {MEET_AGAIN.map((m) => (
            <div key={m.name} className="wl-meet-card">
              <div className="wl-meet-avatar" style={{ background: m.color }}>{m.initials}</div>
              <strong>{m.name}</strong>
              <span>{m.sessions}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
