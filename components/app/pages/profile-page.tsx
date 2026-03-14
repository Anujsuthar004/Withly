"use client";

import { useState } from "react";

import { ProfilePanel } from "@/components/app/profile-panel";
import type { WorkspaceProfile } from "@/lib/supabase/types";
import { WorkspacePageHeader } from "@/components/app/workspace-page-header";

export function ProfilePage({
  profile,
  preview,
  initialStatus,
}: {
  profile: WorkspaceProfile;
  preview: boolean;
  initialStatus?: string;
}) {
  const [status, setStatus] = useState(initialStatus ?? (preview ? "Preview mode is active. Sign in to update your profile." : "Profile ready."));

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        kicker="Profile"
        title="Present yourself clearly before anyone replies."
        intro="A calm, complete profile gives people the context they need to feel comfortable responding."
        status={status}
      />
      <ProfilePanel profile={profile} preview={preview} onStatus={setStatus} />
    </div>
  );
}
