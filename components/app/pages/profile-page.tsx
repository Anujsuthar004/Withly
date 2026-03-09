"use client";

import { useState } from "react";

import { ProfilePanel } from "@/components/app/profile-panel";
import { StatusBadge } from "@/components/app/status-badge";
import type { WorkspaceProfile } from "@/lib/supabase/types";

export function ProfilePage({ profile, preview }: { profile: WorkspaceProfile; preview: boolean }) {
  const [status, setStatus] = useState(preview ? "Preview mode is active. Sign in to update your profile." : "Profile ready.");

  return (
    <div className="workspace-page">
      <section className="workspace-hero-actions" style={{ padding: 0, background: "transparent", border: 0, boxShadow: "none" }}>
        <StatusBadge message={status} />
      </section>
      <ProfilePanel profile={profile} preview={preview} onStatus={setStatus} />
    </div>
  );
}

