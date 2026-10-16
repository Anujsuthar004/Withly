"use client";

import { useState } from "react";

import { AdminPanel } from "@/components/app/admin-panel";
import { ShieldCheck } from "lucide-react";
import styles from "@/app/admin-design.module.css";
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
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>WITHLY · COMMUNITY CARE</p>
          <h1>A little care.<br /><span>A safer community.</span></h1>
          <p className={styles.intro}>Review reports, follow up with context, and keep member requests moving. Every case deserves a human decision.</p>
          <div className={styles.counts}><span>{activeReports} active {activeReports === 1 ? "report" : "reports"}</span><span>{pendingDeletionRequests} {pendingDeletionRequests === 1 ? "deletion" : "deletions"} pending</span></div>
        </div>
        <div className={styles.heroIcon} aria-hidden="true"><ShieldCheck size={80} /><span>PEOPLE FIRST</span></div>
      </header>
      <nav className={styles.shortcuts} aria-label="Moderation sections">
        <a href="#reports">Reports</a><a href="#deletions">Deletion requests</a><a href="#members">Members</a><a href="#automated-reviews">Automated reviews</a>
      </nav>
      {preview ? <p className={styles.preview}>Example admin workspace. All records are fictional and moderation actions are disabled.</p> : null}
      <p className={styles.status} role="status">{status}</p>
      <AdminPanel dashboard={dashboard} preview={preview} onStatus={setStatus} />
    </div>
  );
}
