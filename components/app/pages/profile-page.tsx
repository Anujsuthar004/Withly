"use client";

import { useState } from "react";

import { ProfilePanel } from "@/components/app/profile-panel";
import type { WorkspaceProfile } from "@/lib/supabase/types";
import { StatusBadge } from "@/components/app/status-badge";

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
      <section className="workspace-hero-actions" style={{ padding: 0, background: "transparent", border: 0, boxShadow: "none" }}>
        <StatusBadge message={status} />
      </section>
      <ProfilePanel profile={profile} preview={preview} onStatus={setStatus} />
    </div>
  );
}
