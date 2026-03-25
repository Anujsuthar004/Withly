"use client";

import { useState } from "react";

import { ProfilePanel } from "@/components/app/profile-panel";
import type { WorkspaceProfile } from "@/lib/supabase/types";

export function ProfilePage({
  profile,
  availability,
  preview,
  initialStatus,
}: {
  profile: WorkspaceProfile;
  availability: { id: string; day_of_week: number; start_time: string; end_time: string; label: string | null }[];
  preview: boolean;
  initialStatus?: string;
}) {
  const [status, setStatus] = useState(initialStatus ?? (preview ? "Preview mode is active. Sign in to update your profile." : ""));

  return (
    <div className="sanctuary-page sanctuary-profile-page">
      <section className="sanctuary-page-intro">
        <div>
          <p className="sanctuary-kicker">Profile</p>
          <h1>Creating spaces for presence and calm.</h1>
          <p>Shape the first impression people see before they reply, with enough warmth and clarity to feel trustworthy.</p>
        </div>
      </section>
      {status ? <div className="withly-status-banner">{status}</div> : null}
      <ProfilePanel profile={profile} availability={availability} preview={preview} onStatus={setStatus} />
    </div>
  );
}
