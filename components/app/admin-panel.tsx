"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { resolveDeletionRequestAction, resolveReportAction } from "@/app/workspace/actions";
import type { AdminDashboard } from "@/lib/supabase/types";
import { formatRelativeTime } from "@/lib/utils";

export function AdminPanel({
  dashboard,
  preview,
  onStatus,
}: {
  dashboard: AdminDashboard;
  preview: boolean;
  onStatus: (message: string) => void;
}) {
  const router = useRouter();
  const [moderationNotes, setModerationNotes] = useState<Record<string, string>>({});
  const [deletionNotes, setDeletionNotes] = useState<Record<string, string>>({});
  const [moderationBusyId, setModerationBusyId] = useState<string | null>(null);
  const [deletionBusyId, setDeletionBusyId] = useState<string | null>(null);

  async function handleResolveReport(reportId: string, status: "reviewing" | "resolved" | "dismissed") {
    if (preview) {
      onStatus("Admin tools are only available after sign-in.");
      return;
    }

    setModerationBusyId(reportId);
    const result = await resolveReportAction({
      reportId,
      status,
      resolutionNote: moderationNotes[reportId] ?? "",
    });
    setModerationBusyId(null);
    onStatus(result.message);
    if (result.ok) router.refresh();
  }

  async function handleResolveDeletionRequest(requestId: string, status: "resolved" | "cancelled") {
    if (preview) {
      onStatus("Admin tools are only available after sign-in.");
      return;
    }

    setDeletionBusyId(requestId);
    const result = await resolveDeletionRequestAction({
      requestId,
      status,
      resolutionNote: deletionNotes[requestId] ?? "",
    });
    setDeletionBusyId(null);
    onStatus(result.message);
    if (result.ok) router.refresh();
  }

  return (
    <section className="panel admin-panel">
      <div className="panel-heading">
        <div>
          <p className="kicker">Moderation</p>
          <h3>Open moderation queue.</h3>
        </div>
        <span className="status-dot">
          <ShieldCheck size={16} />
          {dashboard.overview.reportsOpen} reports open
        </span>
      </div>
      <p className="panel-intro">Work through reports and deletion requests with enough context to act quickly without losing track of platform health.</p>

      <section className="panel-section">
        <div className="form-section-head">
          <h4>Overview</h4>
          <p>A quick read on platform volume and open moderation work.</p>
        </div>

        <div className="admin-overview-grid">
          <article className="admin-stat-card">
            <span>Users</span>
            <strong>{dashboard.overview.usersTotal}</strong>
          </article>
          <article className="admin-stat-card">
            <span>Open requests</span>
            <strong>{dashboard.overview.openRequests}</strong>
          </article>
          <article className="admin-stat-card">
            <span>Matched</span>
            <strong>{dashboard.overview.matchedRequests}</strong>
          </article>
          <article className="admin-stat-card">
            <span>Deletion queue</span>
            <strong>{dashboard.overview.deletionRequestsOpen}</strong>
          </article>
        </div>
      </section>

      <section className="panel-section">
        <div className="form-section-head">
          <h4>Reports</h4>
          <p>Review incoming safety or conduct reports and leave a clear resolution trail.</p>
        </div>

        <div className="review-list">
          {dashboard.reports.length === 0 ? <div className="empty-card">No reports in queue.</div> : null}

          {dashboard.reports.map((report) => (
            <article key={report.id} className="review-card">
              <div className="summary-head">
                <div>
                  <h4>{report.reason}</h4>
                  <p>
                    {report.reporterDisplayName ?? "Unknown reporter"}
                    {report.targetDisplayName ? ` -> ${report.targetDisplayName}` : ""}
                  </p>
                </div>
                <span className={`status-pill status-${report.status}`}>{report.status}</span>
              </div>
              <p className="review-about">{report.details || "No additional details provided."}</p>
              <div className="summary-meta">
                <span>{formatRelativeTime(report.createdAt)}</span>
                {report.requestId ? <span>request {report.requestId.slice(0, 8)}</span> : null}
              </div>
              <label>
                Resolution note
                <textarea
                  rows={3}
                  value={moderationNotes[report.id] ?? ""}
                  onChange={(event) => setModerationNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                  maxLength={1200}
                  disabled={preview || moderationBusyId === report.id}
                />
              </label>
              <div className="button-row admin-actions">
                <button
                  className="ghost-button compact"
                  type="button"
                  disabled={preview || moderationBusyId === report.id}
                  onClick={() => void handleResolveReport(report.id, "reviewing")}
                >
                  Reviewing
                </button>
                <button
                  className="secondary-button compact"
                  type="button"
                  disabled={preview || moderationBusyId === report.id}
                  onClick={() => void handleResolveReport(report.id, "dismissed")}
                >
                  Dismiss
                </button>
                <button
                  className="primary-button compact"
                  type="button"
                  disabled={preview || moderationBusyId === report.id}
                  onClick={() => void handleResolveReport(report.id, "resolved")}
                >
                  {preview ? "Preview mode only" : moderationBusyId === report.id ? "Saving..." : "Resolve"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <div className="form-section-head">
          <h4>Account deletion requests</h4>
          <p>Track deletion requests separately so they stay visible and auditable.</p>
        </div>

        <div className="review-list">
          {dashboard.deletionRequests.length === 0 ? (
            <div className="empty-card">No account deletion requests in queue.</div>
          ) : null}

          {dashboard.deletionRequests.map((entry) => (
            <article key={entry.id} className="review-card">
              <div className="summary-head">
                <div>
                  <h4>{entry.displayName ?? "Unknown member"}</h4>
                  <p>{entry.status}</p>
                </div>
                <span className={`status-pill status-${entry.status}`}>{entry.status}</span>
              </div>
              <p className="review-about">{entry.reason || "No reason provided."}</p>
              <div className="summary-meta">
                <span>{formatRelativeTime(entry.createdAt)}</span>
                <span>user {entry.userId.slice(0, 8)}</span>
              </div>
              <label>
                Moderation note
                <textarea
                  rows={3}
                  value={deletionNotes[entry.id] ?? ""}
                  onChange={(event) => setDeletionNotes((current) => ({ ...current, [entry.id]: event.target.value }))}
                  maxLength={1200}
                  disabled={preview || deletionBusyId === entry.id}
                />
              </label>
              <div className="button-row">
                <button
                  className="secondary-button compact"
                  type="button"
                  disabled={preview || deletionBusyId === entry.id}
                  onClick={() => void handleResolveDeletionRequest(entry.id, "cancelled")}
                >
                  Cancel request
                </button>
                <button
                  className="primary-button compact"
                  type="button"
                  disabled={preview || deletionBusyId === entry.id}
                  onClick={() => void handleResolveDeletionRequest(entry.id, "resolved")}
                >
                  {preview ? "Preview mode only" : deletionBusyId === entry.id ? "Saving..." : "Mark resolved"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
