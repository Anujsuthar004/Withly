"use client";

import { useState } from "react";

import { ProfileAvatar } from "@/components/app/profile-avatar";
import { ProfilePanel } from "@/components/app/profile-panel";
import type { WorkspaceProfile } from "@/lib/supabase/types";
import { WorkspacePageHeader } from "@/components/app/workspace-page-header";

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
  const [status, setStatus] = useState(initialStatus ?? (preview ? "Preview mode is active. Sign in to update your profile." : "Profile ready."));

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        kicker="Profile"
        title="Creating space for presence and calm."
        intro="Shape the first impression people see before they reply, with enough warmth and clarity to feel trustworthy."
        status={status}
        meta={
          <ProfileAvatar name={profile.displayName} url={profile.avatarUrl} size="sm" />
        }
      />
      <ProfilePanel profile={profile} availability={availability} preview={preview} onStatus={setStatus} />
    </div>
  );
}
