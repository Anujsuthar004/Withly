"use client";

import { useState } from "react";

import { AdminPanel } from "@/components/app/admin-panel";
import { StatusBadge } from "@/components/app/status-badge";
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
      <section className="workspace-hero-actions" style={{ padding: 0, background: "transparent", border: 0, boxShadow: "none" }}>
        <StatusBadge message={status} />
      </section>
      <AdminPanel dashboard={dashboard} preview={preview} onStatus={setStatus} />
    </div>
  );
}

