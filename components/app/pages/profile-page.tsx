"use client";

import { useState } from "react";

import { ProfileAvatar } from "@/components/app/profile-avatar";
import { ProfilePanel } from "@/components/app/profile-panel";
import type { WorkspaceProfile } from "@/lib/supabase/types";
import { WorkspacePageHeader } from "@/components/app/workspace-page-header";
import { getProfileCompletion } from "@/lib/utils";

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
  const progress = getProfileCompletion(profile);

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        kicker="Profile"
        title="Present yourself clearly before anyone replies."
        intro="A calm, complete profile gives people the context they need to feel comfortable responding."
        status={status}
        meta={
          <>
            <ProfileAvatar name={profile.displayName} url={profile.avatarUrl} size="sm" />
            <span className="mini-chip">{progress.percentage}% complete</span>
          </>
        }
      />
      <ProfilePanel profile={profile} availability={availability} preview={preview} onStatus={setStatus} />
    </div>
  );
}
