"use client";

import { useState, useTransition } from "react";
import { Radar } from "lucide-react";
import { useRouter } from "next/navigation";

import { updateProfileAction } from "@/app/workspace/actions";
import type { WorkspaceProfile } from "@/lib/supabase/types";
import { getProfileCompletion } from "@/lib/utils";

export function ProfilePanel({
  profile,
  preview,
  onStatus,
}: {
  profile: WorkspaceProfile;
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
  const progress = getProfileCompletion(form);

  return (
    <section className="panel profile-panel">
      <div className="panel-heading">
        <div>
          <p className="kicker">Identity</p>
          <h3>{profile.displayName}</h3>
        </div>
        <span className="status-dot">
          <Radar size={16} />
          {profile.homeArea || "Area not set"}
        </span>
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

        <button className="secondary-button" type="submit" disabled={preview || isPending}>
          {preview ? "Preview mode only" : isPending ? "Saving..." : "Save profile"}
        </button>
      </form>
    </section>
  );
}
