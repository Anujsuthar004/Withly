"use client";

import { useState } from "react";

import { AdminPanel } from "@/components/app/admin-panel";
import { WorkspacePageHeader } from "@/components/app/workspace-page-header";
import type { AdminDashboard } from "@/lib/supabase/types";

export function AdminPage({
  dashboard,
  preview,
}: {
  dashboard: AdminDashboard;
  preview: boolean;
}) {
  const [status, setStatus] = useState(preview ? "Preview mode is active." : "Admin queue ready.");

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        kicker="Admin"
        title="Review moderation work with more context."
        intro="See open reports, deletion requests, and platform health signals without jumping between screens."
        status={status}
      />
      <AdminPanel dashboard={dashboard} preview={preview} onStatus={setStatus} />
    </div>
  );
}
