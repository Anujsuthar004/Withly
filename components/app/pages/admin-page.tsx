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
  const activeReports = dashboard.reports.filter((report) => report.status === "open" || report.status === "reviewing").length;
  const pendingDeletionRequests = dashboard.deletionRequests.filter((entry) => entry.status === "pending").length;
  const [status, setStatus] = useState(
    preview
      ? "Preview mode is active."
      : activeReports > 0 || pendingDeletionRequests > 0
        ? `${activeReports} active reports and ${pendingDeletionRequests} pending deletion requests need coverage.`
        : "Admin queue is calm and fully triaged."
  );

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        kicker="Admin"
        title="Keep the community cared for."
        intro="Review reports, support members, and track account requests in one place."
        status={status}
        meta={
          <>
            <span className="mini-chip">{activeReports} active reports</span>
            <span className="mini-chip">{pendingDeletionRequests} deletion pending</span>
          </>
        }
      />
      <AdminPanel dashboard={dashboard} preview={preview} onStatus={setStatus} />
    </div>
  );
}
