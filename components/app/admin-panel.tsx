"use client";

import { useState } from "react";
import { ShieldAlert, ShieldCheck, Siren, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { resolveDeletionRequestAction, resolveReportAction } from "@/app/workspace/actions";
import type { AdminDashboard, ModerationReport } from "@/lib/supabase/types";
import { formatRelativeTime } from "@/lib/utils";

type ReportSeverity = "critical" | "high" | "medium" | "low";
type ReportView = "active" | "all" | "open" | "reviewing" | "resolved";
type DeletionView = "pending" | "all" | "resolved";

function getHoursSince(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }

  return Math.max(0, (Date.now() - parsed.getTime()) / (1000 * 60 * 60));
}

function formatQueueAge(hours: number) {
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

function getSeverityScore(severity: ReportSeverity) {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function getStatusScore(status: ModerationReport["status"]) {
  if (status === "open") return 4;
  if (status === "reviewing") return 3;
  if (status === "resolved") return 2;
  return 1;
}

function getReportSeverity(report: ModerationReport): ReportSeverity {
  const haystack = `${report.reason} ${report.details}`.toLowerCase();

  if (/(assault|violence|weapon|sexual|stalk|threat|emergency|self-harm|suicid|coerc|blackmail)/.test(haystack)) {
    return "critical";
  }

  if (/(harass|unsafe|followed|intimidat|abuse|hate|minor|underage|scam|fraud|impersonat|extort)/.test(haystack)) {
    return "high";
  }

  if (/(boundary|pressure|spam|late|rude|misleading|no-show|ghost)/.test(haystack)) {
    return "medium";
  }

  return "low";
}

function getDeletionUrgency(createdAt: string) {
  const ageHours = getHoursSince(createdAt);

  if (ageHours >= 72) return "high";
  if (ageHours >= 24) return "medium";
  return "low";
}

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
  const [reportView, setReportView] = useState<ReportView>("active");
  const [deletionView, setDeletionView] = useState<DeletionView>("pending");
  const [severityFilter, setSeverityFilter] = useState<ReportSeverity | "all">("all");
  const [reportSearch, setReportSearch] = useState("");

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

  const reportsWithMeta = dashboard.reports
    .map((report) => {
      const ageHours = getHoursSince(report.createdAt);
      const severity = getReportSeverity(report);
      const needsFastAttention = report.status === "open" && (severity === "critical" || ageHours >= 24);

      return {
        ...report,
        ageHours,
        severity,
        needsFastAttention,
      };
    })
    .sort((left, right) => {
      if (left.needsFastAttention !== right.needsFastAttention) {
        return Number(right.needsFastAttention) - Number(left.needsFastAttention);
      }

      const statusDelta = getStatusScore(right.status) - getStatusScore(left.status);
      if (statusDelta !== 0) return statusDelta;

      const severityDelta = getSeverityScore(right.severity) - getSeverityScore(left.severity);
      if (severityDelta !== 0) return severityDelta;

      return right.ageHours - left.ageHours;
    });

  const activeReports = reportsWithMeta.filter((report) => report.status === "open" || report.status === "reviewing");
  const openReports = reportsWithMeta.filter((report) => report.status === "open");
  const reviewingReports = reportsWithMeta.filter((report) => report.status === "reviewing");
  const urgentReports = reportsWithMeta.filter((report) => report.needsFastAttention);
  const resolvedReports = reportsWithMeta.filter((report) => report.status === "resolved");
  const dismissedReports = reportsWithMeta.filter((report) => report.status === "dismissed");
  const pendingDeletionRequests = dashboard.deletionRequests.filter((entry) => entry.status === "pending");
  const resolvedDeletionRequests = dashboard.deletionRequests.filter((entry) => entry.status === "resolved");

  const reportReasonCounts = Object.entries(
    activeReports.reduce<Record<string, number>>((counts, report) => {
      const key = report.reason.trim() || "Unspecified";
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {})
  ).sort((left, right) => right[1] - left[1]);

  const oldestOpenReportAge = openReports.reduce((oldest, report) => Math.max(oldest, report.ageHours), 0);
  const reportsPerHundredUsers =
    dashboard.overview.usersTotal > 0 ? Math.round((dashboard.overview.reportsOpen / dashboard.overview.usersTotal) * 100) : 0;
  const matchedShare =
    dashboard.overview.openRequests + dashboard.overview.matchedRequests > 0
      ? Math.round((dashboard.overview.matchedRequests / (dashboard.overview.openRequests + dashboard.overview.matchedRequests)) * 100)
      : 0;

  const queueHealthScore = Math.max(
    8,
    Math.round(
      100 -
        urgentReports.length * 22 -
        reviewingReports.length * 8 -
        pendingDeletionRequests.length * 6 -
        Math.min(oldestOpenReportAge, 72) / 2
    )
  );

  const queueHealthTone =
    queueHealthScore >= 80 ? "Stable" : queueHealthScore >= 55 ? "Watch closely" : queueHealthScore >= 35 ? "High load" : "Escalated";

  const nextPriority =
    urgentReports.length > 0
      ? `Start with ${urgentReports[0]?.reason.toLowerCase() || "the oldest urgent report"} before working the rest of the queue.`
      : reviewingReports.length > 0
        ? "Clear the reviewing queue next so investigations do not stall without a resolution trail."
        : pendingDeletionRequests.length > 0
          ? "Deletion work is your next priority. Keep audit notes clear before closing any request."
          : "No urgent backlog is building. This is a good moment to close easy wins and keep the queue clean.";

  const filteredReports = reportsWithMeta.filter((report) => {
    if (reportView === "active" && !["open", "reviewing"].includes(report.status)) return false;
    if (reportView === "open" && report.status !== "open") return false;
    if (reportView === "reviewing" && report.status !== "reviewing") return false;
    if (reportView === "resolved" && !["resolved", "dismissed"].includes(report.status)) return false;
    if (severityFilter !== "all" && report.severity !== severityFilter) return false;

    if (!reportSearch.trim()) return true;

    const haystack = [
      report.reason,
      report.details,
      report.reporterDisplayName ?? "",
      report.targetDisplayName ?? "",
      report.status,
      report.severity,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(reportSearch.trim().toLowerCase());
  });

  const filteredDeletionRequests = dashboard.deletionRequests.filter((entry) => {
    if (deletionView === "pending") return entry.status === "pending";
    if (deletionView === "resolved") return entry.status !== "pending";
    return true;
  });

  return (
    <section className="panel admin-panel">
      <div className="panel-heading">
        <div>
          <p className="kicker">Moderation command center</p>
          <h3>See pressure early and move through the queue with context.</h3>
        </div>
        <span className="status-dot">
          <ShieldCheck size={16} />
          {activeReports.length} active items
        </span>
      </div>
      <p className="panel-intro">
        This view surfaces backlog health, urgency, queue mix, and the work most likely to need action next so you can moderate with fewer blind spots.
      </p>

      <div className="admin-command-grid">
        <section className="panel-section admin-health-card">
          <div className="admin-health-head">
            <div>
              <p className="kicker">Queue health</p>
              <h4>{queueHealthTone}</h4>
            </div>
            <span className={`status-pill admin-health-pill health-${queueHealthTone.toLowerCase().replace(/\s+/g, "-")}`}>{queueHealthTone}</span>
          </div>

          <div className="admin-health-score">
            <strong>{queueHealthScore}</strong>
            <span>/100</span>
          </div>

          <p>{nextPriority}</p>

          <div className="admin-health-signals">
            <span className="mini-chip">
              <Siren size={14} />
              {urgentReports.length} urgent
            </span>
            <span className="mini-chip">{reviewingReports.length} reviewing</span>
            <span className="mini-chip">{pendingDeletionRequests.length} deletion pending</span>
            <span className="mini-chip">oldest open {formatQueueAge(oldestOpenReportAge)}</span>
          </div>
        </section>

        <section className="panel-section">
          <div className="form-section-head">
            <h4>Platform snapshot</h4>
            <p>Read platform health at a glance, not just raw queue length.</p>
          </div>

          <div className="admin-overview-grid admin-overview-grid-rich">
            <article className="admin-stat-card">
              <span>Total users</span>
              <strong>{dashboard.overview.usersTotal}</strong>
            </article>
            <article className="admin-stat-card">
              <span>Open requests</span>
              <strong>{dashboard.overview.openRequests}</strong>
            </article>
            <article className="admin-stat-card">
              <span>Matched share</span>
              <strong>{matchedShare}%</strong>
            </article>
            <article className="admin-stat-card">
              <span>Reports / 100 users</span>
              <strong>{reportsPerHundredUsers}</strong>
            </article>
            <article className="admin-stat-card">
              <span>Resolved reports</span>
              <strong>{resolvedReports.length}</strong>
            </article>
            <article className="admin-stat-card">
              <span>Dismissed reports</span>
              <strong>{dismissedReports.length}</strong>
            </article>
          </div>
        </section>
      </div>

      <section className="panel-section">
        <div className="form-section-head">
          <h4>Moderation signals</h4>
          <p>Use these to understand where friction is building before the queue turns into a cleanup job.</p>
        </div>

        <div className="admin-signal-grid">
          <article className="admin-signal-card">
            <span>Urgent backlog</span>
            <strong>{urgentReports.length}</strong>
            <p>Open reports that are either severe or have been waiting longer than a day.</p>
          </article>
          <article className="admin-signal-card">
            <span>Open queue age</span>
            <strong>{formatQueueAge(oldestOpenReportAge)}</strong>
            <p>Oldest currently open report. This is your clearest SLA pressure signal.</p>
          </article>
          <article className="admin-signal-card">
            <span>Reviewing now</span>
            <strong>{reviewingReports.length}</strong>
            <p>Cases that already need follow-through rather than first-pass triage.</p>
          </article>
          <article className="admin-signal-card">
            <span>Deletion load</span>
            <strong>{pendingDeletionRequests.length}</strong>
            <p>Separate privacy/compliance work that should not disappear behind conduct reports.</p>
          </article>
        </div>

        {reportReasonCounts.length > 0 ? (
          <div className="admin-reason-cloud">
            {reportReasonCounts.slice(0, 8).map(([reason, count]) => (
              <span key={reason} className="mini-chip">
                {reason}
                <strong>{count}</strong>
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="panel-section">
        <div className="form-section-head">
          <h4>Reports queue</h4>
          <p>Filter by urgency and status, then resolve each report with enough context to leave an audit trail.</p>
        </div>

        <div className="feed-toolbar admin-toolbar">
          <label className="search-input">
            <input
              type="search"
              value={reportSearch}
              onChange={(event) => setReportSearch(event.target.value)}
              placeholder="Search by reason, people, or report details"
            />
          </label>

          <div className="feed-filter-row">
            <div className="filter-pill-group" role="tablist" aria-label="Report status filters">
              <button type="button" className={`filter-pill ${reportView === "active" ? "active" : ""}`} onClick={() => setReportView("active")}>
                Active
              </button>
              <button type="button" className={`filter-pill ${reportView === "open" ? "active" : ""}`} onClick={() => setReportView("open")}>
                Open
              </button>
              <button
                type="button"
                className={`filter-pill ${reportView === "reviewing" ? "active" : ""}`}
                onClick={() => setReportView("reviewing")}
              >
                Reviewing
              </button>
              <button
                type="button"
                className={`filter-pill ${reportView === "resolved" ? "active" : ""}`}
                onClick={() => setReportView("resolved")}
              >
                Resolved
              </button>
              <button type="button" className={`filter-pill ${reportView === "all" ? "active" : ""}`} onClick={() => setReportView("all")}>
                All
              </button>
            </div>

            <div className="filter-pill-group" role="tablist" aria-label="Severity filters">
              <button
                type="button"
                className={`filter-pill ${severityFilter === "all" ? "active" : ""}`}
                onClick={() => setSeverityFilter("all")}
              >
                All severities
              </button>
              {(["critical", "high", "medium", "low"] as const).map((severity) => (
                <button
                  key={severity}
                  type="button"
                  className={`filter-pill ${severityFilter === severity ? "active" : ""}`}
                  onClick={() => setSeverityFilter(severity)}
                >
                  {severity}
                </button>
              ))}
            </div>
          </div>

          <div className="feed-toolbar-meta">
            <span>
              Showing {filteredReports.length} of {dashboard.reports.length} reports
            </span>
            <span>{urgentReports.length} urgent</span>
          </div>
        </div>

        <div className="review-list">
          {filteredReports.length === 0 ? <div className="empty-card">No reports match this view right now.</div> : null}

          {filteredReports.map((report) => (
            <article key={report.id} className="review-card admin-review-card">
              <div className="summary-head">
                <div>
                  <div className="admin-card-pill-row">
                    <span className={`status-pill admin-severity-pill severity-${report.severity}`}>{report.severity}</span>
                    <span className={`status-pill status-${report.status}`}>{report.status}</span>
                    {report.needsFastAttention ? (
                      <span className="status-pill severity-critical">
                        <ShieldAlert size={14} />
                        act now
                      </span>
                    ) : null}
                  </div>
                  <h4>{report.reason}</h4>
                  <p>
                    {report.reporterDisplayName ?? "Unknown reporter"}
                    {report.targetDisplayName ? ` -> ${report.targetDisplayName}` : ""}
                  </p>
                </div>
                <div className="admin-card-meta-stack">
                  <span className="mini-chip">{formatRelativeTime(report.createdAt)}</span>
                  <span className="mini-chip">{formatQueueAge(report.ageHours)} old</span>
                  {report.requestId ? <span className="mini-chip">request {report.requestId.slice(0, 8)}</span> : null}
                </div>
              </div>

              {report.needsFastAttention ? (
                <div className="summary-callout">
                  Prioritise this case before lower-severity items. It is either severe on content or has waited long enough to become queue risk.
                </div>
              ) : null}

              <p className="review-about">{report.details || "No additional details provided."}</p>

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
          <p>Keep privacy/compliance operations visible, triaged, and clearly documented.</p>
        </div>

        <div className="feed-toolbar admin-toolbar">
          <div className="filter-pill-group" role="tablist" aria-label="Deletion request filters">
            <button
              type="button"
              className={`filter-pill ${deletionView === "pending" ? "active" : ""}`}
              onClick={() => setDeletionView("pending")}
            >
              Pending
            </button>
            <button
              type="button"
              className={`filter-pill ${deletionView === "resolved" ? "active" : ""}`}
              onClick={() => setDeletionView("resolved")}
            >
              Resolved / cancelled
            </button>
            <button type="button" className={`filter-pill ${deletionView === "all" ? "active" : ""}`} onClick={() => setDeletionView("all")}>
              All
            </button>
          </div>

          <div className="feed-toolbar-meta">
            <span>
              Showing {filteredDeletionRequests.length} of {dashboard.deletionRequests.length} requests
            </span>
            <span>{pendingDeletionRequests.length} pending</span>
          </div>
        </div>

        <div className="review-list">
          {filteredDeletionRequests.length === 0 ? <div className="empty-card">No account deletion requests match this view.</div> : null}

          {filteredDeletionRequests.map((entry) => {
            const urgency = getDeletionUrgency(entry.createdAt);

            return (
              <article key={entry.id} className="review-card admin-review-card">
                <div className="summary-head">
                  <div>
                    <div className="admin-card-pill-row">
                      <span className={`status-pill severity-${urgency}`}>{urgency} priority</span>
                      <span className={`status-pill status-${entry.status}`}>{entry.status}</span>
                    </div>
                    <h4>{entry.displayName ?? "Unknown member"}</h4>
                    <p>user {entry.userId.slice(0, 8)}</p>
                  </div>
                  <div className="admin-card-meta-stack">
                    <span className="mini-chip">
                      <Trash2 size={14} />
                      {formatRelativeTime(entry.createdAt)}
                    </span>
                  </div>
                </div>

                <p className="review-about">{entry.reason || "No reason provided."}</p>

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
            );
          })}
        </div>
      </section>
    </section>
  );
}
