"use client";

import { useDeferredValue, useState, useTransition } from "react";
import {
  BellRing,
  Compass,
  Download,
  Flag,
  MessageCircleMore,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserMinus,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

import {
  blockUserAction,
  completeRequestAction,
  createReportAction,
  deleteAccountAction,
  resolveDeletionRequestAction,
  resolveReportAction,
  reviewJoinRequestAction,
  submitJoinRequestAction,
  updateProfileAction,
} from "@/app/workspace/actions";
import { ChatRoom } from "@/components/chat-room";
import { RequestComposer } from "@/components/request-composer";
import { SiteFooter } from "@/components/site-footer";
import { SignOutButton } from "@/components/sign-out-button";
import { SUPPORT_EMAIL, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AdminDashboard, FeedRequestCard, WorkspaceSnapshot } from "@/lib/supabase/types";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

interface WorkspaceShellProps {
  user: User | null;
  feed: FeedRequestCard[];
  snapshot: WorkspaceSnapshot;
  preview: boolean;
  setupError: string;
  adminDashboard: AdminDashboard | null;
}

type CompletionDraft = {
  outcome: "completed" | "issue";
  meetAgain: boolean;
};

type ReportDraft = {
  reason: string;
  details: string;
  blockTarget: boolean;
};

const defaultCompletionDraft: CompletionDraft = {
  outcome: "completed",
  meetAgain: true,
};

const defaultReportDraft: ReportDraft = {
  reason: "",
  details: "",
  blockTarget: true,
};

function reportKeyFor(requestId: string, targetUserId: string | null) {
  return `${requestId}:${targetUserId ?? "request"}`;
}

export function WorkspaceShell({
  user,
  feed,
  snapshot,
  preview,
  setupError,
  adminDashboard,
}: WorkspaceShellProps) {
  const router = useRouter();
  const [status, setStatus] = useState(
    preview
      ? "Preview mode is active. Connect Supabase to unlock secure auth, RLS, moderation, and realtime chat."
      : "Managed auth, RLS, moderation, and realtime are active."
  );
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [profileForm, setProfileForm] = useState({
    displayName: snapshot.profile.displayName,
    aboutMe: snapshot.profile.aboutMe,
    homeArea: snapshot.profile.homeArea,
  });
  const [completionDrafts, setCompletionDrafts] = useState<Record<string, CompletionDraft>>({});
  const [reportDrafts, setReportDrafts] = useState<Record<string, ReportDraft>>({});
  const [moderationNotes, setModerationNotes] = useState<Record<string, string>>({});
  const [deletionNotes, setDeletionNotes] = useState<Record<string, string>>({});
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [joinDrafts, setJoinDrafts] = useState<Record<string, string>>({});
  const [joinBusyId, setJoinBusyId] = useState<string | null>(null);
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [completionBusyId, setCompletionBusyId] = useState<string | null>(null);
  const [reportBusyId, setReportBusyId] = useState<string | null>(null);
  const [blockBusyId, setBlockBusyId] = useState<string | null>(null);
  const [moderationBusyId, setModerationBusyId] = useState<string | null>(null);
  const [deletionBusyId, setDeletionBusyId] = useState<string | null>(null);
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isAccountPending, startAccountTransition] = useTransition();

  const filteredFeed = feed.filter((entry) => {
    const haystack = [entry.title, entry.description, entry.areaLabel, entry.hostDisplayName, entry.tags.join(" ")]
      .join(" ")
      .toLowerCase();

    return haystack.includes(deferredSearch.trim().toLowerCase());
  });

  const joinedRequestIds = new Set(
    snapshot.myRequests.filter((entry) => entry.status === "matched" || entry.status === "completed").map((entry) => entry.id)
  );

  function getCompletionDraft(requestId: string) {
    return completionDrafts[requestId] ?? defaultCompletionDraft;
  }

  function updateCompletionDraft(requestId: string, patch: Partial<CompletionDraft>) {
    setCompletionDrafts((current) => ({
      ...current,
      [requestId]: {
        ...(current[requestId] ?? defaultCompletionDraft),
        ...patch,
      },
    }));
  }

  function getReportDraft(requestId: string, targetUserId: string | null) {
    return reportDrafts[reportKeyFor(requestId, targetUserId)] ?? defaultReportDraft;
  }

  function updateReportDraft(requestId: string, targetUserId: string | null, patch: Partial<ReportDraft>) {
    const key = reportKeyFor(requestId, targetUserId);
    setReportDrafts((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? defaultReportDraft),
        ...patch,
      },
    }));
  }

  async function handleCompletionSubmit(requestId: string) {
    if (preview) {
      setStatus("Connect Supabase to record private completion notes.");
      return;
    }

    const draft = getCompletionDraft(requestId);
    setCompletionBusyId(requestId);
    const result = await completeRequestAction({
      requestId,
      outcome: draft.outcome,
      meetAgain: draft.meetAgain,
    });
    setCompletionBusyId(null);
    setStatus(result.message);

    if (result.ok) {
      router.refresh();
    }
  }

  async function handleReportSubmit(requestId: string, targetUserId: string | null) {
    if (preview) {
      setStatus("Connect Supabase to use reporting and blocking.");
      return;
    }

    const key = reportKeyFor(requestId, targetUserId);
    const draft = getReportDraft(requestId, targetUserId);
    setReportBusyId(key);
    const result = await createReportAction({
      requestId,
      targetUserId,
      reason: draft.reason,
      details: draft.details,
      blockTarget: draft.blockTarget,
    });
    setReportBusyId(null);
    setStatus(result.message);

    if (result.ok) {
      setReportDrafts((current) => ({
        ...current,
        [key]: { ...defaultReportDraft },
      }));
      router.refresh();
    }
  }

  async function handleBlockUser(userId: string | null) {
    if (!userId) {
      setStatus("No user is available to block for this session.");
      return;
    }

    if (preview) {
      setStatus("Connect Supabase to use blocking.");
      return;
    }

    setBlockBusyId(userId);
    const result = await blockUserAction({ userId });
    setBlockBusyId(null);
    setStatus(result.message);

    if (result.ok) {
      router.refresh();
    }
  }

  async function handleResolveReport(reportId: string, statusValue: "reviewing" | "resolved" | "dismissed") {
    if (preview) {
      setStatus("Connect Supabase to use admin moderation.");
      return;
    }

    setModerationBusyId(reportId);
    const result = await resolveReportAction({
      reportId,
      status: statusValue,
      resolutionNote: moderationNotes[reportId] ?? "",
    });
    setModerationBusyId(null);
    setStatus(result.message);

    if (result.ok) {
      router.refresh();
    }
  }

  async function handleResolveDeletionRequest(requestId: string, statusValue: "resolved" | "cancelled") {
    if (preview) {
      setStatus("Connect Supabase to use admin moderation.");
      return;
    }

    setDeletionBusyId(requestId);
    const result = await resolveDeletionRequestAction({
      requestId,
      status: statusValue,
      resolutionNote: deletionNotes[requestId] ?? "",
    });
    setDeletionBusyId(null);
    setStatus(result.message);

    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <main className="workspace-page">
      <section className="workspace-hero">
        <div className="workspace-hero-copy">
          <p className="kicker">Secure Workspace</p>
          <h1>Trust-first companionship, rebuilt for privacy and speed.</h1>
          <p>
            The legacy public endpoints and local JSON storage are gone from the runtime path. This workspace runs on
            managed auth, cookie-backed sessions, rate-limited actions, and Supabase policies that keep sessions
            private to participants.
          </p>
        </div>

        <div className="workspace-hero-actions">
          <div className="status-badge">
            <Sparkles size={16} />
            {status}
          </div>
          <div className="workspace-hero-stack">
            <div className="status-dot">
              <ShieldCheck size={16} />
              {snapshot.profile.role === "admin" ? "Admin moderation enabled" : "Member workspace"}
            </div>
            {user ? <SignOutButton /> : null}
          </div>
        </div>
      </section>

      {setupError ? <section className="setup-banner">{setupError}</section> : null}

      <section className="workspace-grid">
        <div className="workspace-left">
          <section className="panel profile-panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">Identity</p>
                <h3>{snapshot.profile.displayName}</h3>
              </div>
              <span className="status-dot">
                <Radar size={16} />
                {snapshot.profile.homeArea || "Area not set"}
              </span>
            </div>

            <form
              className="stack-form"
              onSubmit={(event) => {
                event.preventDefault();

                startProfileTransition(async () => {
                  const result = await updateProfileAction(profileForm);
                  setStatus(result.message);
                  if (result.ok) {
                    router.refresh();
                  }
                });
              }}
            >
              <label>
                Display name
                <input
                  type="text"
                  value={profileForm.displayName}
                  onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))}
                  minLength={2}
                  maxLength={60}
                  disabled={preview || isProfilePending}
                />
              </label>

              <label>
                About you
                <textarea
                  rows={3}
                  value={profileForm.aboutMe}
                  onChange={(event) => setProfileForm((current) => ({ ...current, aboutMe: event.target.value }))}
                  maxLength={300}
                  disabled={preview || isProfilePending}
                />
              </label>

              <label>
                Home area
                <input
                  type="text"
                  value={profileForm.homeArea}
                  onChange={(event) => setProfileForm((current) => ({ ...current, homeArea: event.target.value }))}
                  maxLength={120}
                  disabled={preview || isProfilePending}
                />
              </label>

              <button className="secondary-button" type="submit" disabled={preview || isProfilePending}>
                {preview ? "Preview mode only" : isProfilePending ? "Saving..." : "Save profile"}
              </button>
            </form>
          </section>

          <RequestComposer preview={preview} onStatus={setStatus} />
        </div>

        <div className="workspace-main">
          <section className="panel feed-panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">Discovery Feed</p>
                <h3>Only safe public fields are exposed here.</h3>
              </div>
              <span className="status-dot">
                <Compass size={16} />
                {filteredFeed.length} live fits
              </span>
            </div>

            <label className="search-input">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by mood, area, or tags"
              />
            </label>

            <div className="feed-list">
              {filteredFeed.map((request) => {
                const joined = joinedRequestIds.has(request.id);

                return (
                  <article key={request.id} className={`request-card lane-${request.lane}`}>
                    <div className="request-card-top">
                      <div>
                        <span className="request-lane">{request.lane === "social" ? "Social" : "Errand"}</span>
                        <h4>{request.title}</h4>
                      </div>
                      {request.verifiedOnly ? (
                        <span className="mini-chip">
                          <ShieldAlert size={14} />
                          Verified only
                        </span>
                      ) : null}
                    </div>

                    <p className="request-description">{request.description}</p>

                    <div className="request-meta">
                      <span>{request.areaLabel}</span>
                      <span>{formatDateTime(request.meetupAt)}</span>
                      <span>{request.hostDisplayName}</span>
                    </div>

                    <div className="tag-row">
                      {request.tags.map((tag) => (
                        <span key={tag} className="tag-chip">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="join-box">
                      <textarea
                        rows={2}
                        value={joinDrafts[request.id] ?? ""}
                        onChange={(event) =>
                          setJoinDrafts((current) => ({ ...current, [request.id]: event.target.value }))
                        }
                        placeholder="Add a short intro so the request owner knows why you're a fit."
                        maxLength={220}
                        disabled={preview || joined || joinBusyId === request.id}
                      />

                      <button
                        className="primary-button compact"
                        type="button"
                        disabled={preview || joined || joinBusyId === request.id}
                        onClick={() => {
                          setJoinBusyId(request.id);

                          void (async () => {
                            const result = await submitJoinRequestAction({
                              requestId: request.id,
                              introMessage: joinDrafts[request.id] ?? "",
                            });

                            setStatus(result.message);
                            setJoinBusyId(null);
                            if (result.ok) {
                              setJoinDrafts((current) => ({ ...current, [request.id]: "" }));
                              router.refresh();
                            }
                          })();
                        }}
                      >
                        {preview
                          ? "Preview mode only"
                          : joined
                            ? "Already matched"
                            : joinBusyId === request.id
                              ? "Sending..."
                              : "Request to Join"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="panel request-list-panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">Your Requests</p>
                <h3>Private state, post-session controls, and safety actions.</h3>
              </div>
              <span className="status-dot">
                <BellRing size={16} />
                {snapshot.myRequests.length} tracked
              </span>
            </div>

            <div className="summary-list">
              {snapshot.myRequests.map((request) => {
                const completionDraft = getCompletionDraft(request.id);
                const reportDraft = getReportDraft(request.id, request.partnerId);
                const reportKey = reportKeyFor(request.id, request.partnerId);
                const canComplete = (request.status === "matched" || request.status === "completed") && !request.userOutcome;

                return (
                  <article key={request.id} className="summary-card">
                    <div className="summary-head">
                      <div>
                        <span className="request-lane">{request.lane === "social" ? "Social" : "Errand"}</span>
                        <h4>{request.title}</h4>
                      </div>
                      <span className={`status-pill status-${request.status}`}>{request.status}</span>
                    </div>

                    <p>{request.areaLabel}</p>

                    <div className="summary-meta">
                      <span>{formatDateTime(request.meetupAt)}</span>
                      <span>{formatRelativeTime(request.lastActivityAt)}</span>
                      <span>{request.pendingJoinCount} pending</span>
                      {request.partnerDisplayName ? <span>with {request.partnerDisplayName}</span> : null}
                    </div>

                    {request.userOutcome ? (
                      <div className="summary-callout">
                        You marked this session as {request.userOutcome}.
                        {request.userOutcome === "completed"
                          ? request.userMeetAgain
                            ? " You would meet again."
                            : " You would not meet again."
                          : " A report can still be filed if follow-up is needed."}
                      </div>
                    ) : null}

                    {canComplete ? (
                      <details className="action-disclosure">
                        <summary>Complete and rate this session</summary>
                        <div className="disclosure-body">
                          <div className="grid-two">
                            <label>
                              Outcome
                              <select
                                value={completionDraft.outcome}
                                onChange={(event) =>
                                  updateCompletionDraft(request.id, {
                                    outcome: event.target.value as CompletionDraft["outcome"],
                                  })
                                }
                                disabled={preview || completionBusyId === request.id}
                              >
                                <option value="completed">Completed safely</option>
                                <option value="issue">There was an issue</option>
                              </select>
                            </label>

                            <label className="toggle-card">
                              <input
                                type="checkbox"
                                checked={completionDraft.meetAgain}
                                onChange={(event) =>
                                  updateCompletionDraft(request.id, { meetAgain: event.target.checked })
                                }
                                disabled={preview || completionBusyId === request.id}
                              />
                              <span>
                                <ShieldCheck size={16} />
                                I would meet this person again
                              </span>
                            </label>
                          </div>

                          <button
                            className="primary-button compact"
                            type="button"
                            disabled={preview || completionBusyId === request.id}
                            onClick={() => {
                              void handleCompletionSubmit(request.id);
                            }}
                          >
                            {preview
                              ? "Preview mode only"
                              : completionBusyId === request.id
                                ? "Saving..."
                                : "Save completion note"}
                          </button>
                        </div>
                      </details>
                    ) : null}

                    {request.partnerId ? (
                      <details className="action-disclosure">
                        <summary>Report or block partner</summary>
                        <div className="disclosure-body">
                          <label>
                            Reason
                            <input
                              type="text"
                              value={reportDraft.reason}
                              onChange={(event) =>
                                updateReportDraft(request.id, request.partnerId, { reason: event.target.value })
                              }
                              minLength={4}
                              maxLength={80}
                              placeholder="Missed meetup, unsafe behavior, harassment..."
                              disabled={preview || reportBusyId === reportKey}
                            />
                          </label>

                          <label>
                            Details
                            <textarea
                              rows={3}
                              value={reportDraft.details}
                              onChange={(event) =>
                                updateReportDraft(request.id, request.partnerId, { details: event.target.value })
                              }
                              maxLength={1200}
                              placeholder="Share facts, timing, and what follow-up is needed."
                              disabled={preview || reportBusyId === reportKey}
                            />
                          </label>

                          <label className="toggle-card">
                            <input
                              type="checkbox"
                              checked={reportDraft.blockTarget}
                              onChange={(event) =>
                                updateReportDraft(request.id, request.partnerId, { blockTarget: event.target.checked })
                              }
                              disabled={preview || reportBusyId === reportKey}
                            />
                            <span>
                              <Flag size={16} />
                              Also block this user after reporting
                            </span>
                          </label>

                          <div className="button-row">
                            <button
                              className="secondary-button compact"
                              type="button"
                              disabled={preview || blockBusyId === request.partnerId}
                              onClick={() => {
                                void handleBlockUser(request.partnerId);
                              }}
                            >
                              {preview
                                ? "Preview mode only"
                                : blockBusyId === request.partnerId
                                  ? "Blocking..."
                                  : "Block now"}
                            </button>
                            <button
                              className="primary-button compact"
                              type="button"
                              disabled={preview || reportBusyId === reportKey}
                              onClick={() => {
                                void handleReportSubmit(request.id, request.partnerId);
                              }}
                            >
                              {preview
                                ? "Preview mode only"
                                : reportBusyId === reportKey
                                  ? "Submitting..."
                                  : "Submit report"}
                            </button>
                          </div>
                        </div>
                      </details>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <div className="workspace-right">
          <section className="panel review-panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">Join Review</p>
                <h3>Only request owners can see these intros.</h3>
              </div>
              <span className="status-dot">
                <ShieldAlert size={16} />
                Private queue
              </span>
            </div>

            <div className="review-list">
              {snapshot.incomingJoinRequests.length === 0 ? (
                <div className="empty-card">No pending join requests right now.</div>
              ) : null}

              {snapshot.incomingJoinRequests.map((entry) => (
                <article key={entry.id} className="review-card">
                  <div className="summary-head">
                    <div>
                      <h4>{entry.joinerDisplayName}</h4>
                      <p>{entry.requestTitle}</p>
                    </div>
                    <span className="mini-chip">{formatRelativeTime(entry.createdAt)}</span>
                  </div>
                  <p className="review-about">{entry.joinerAboutMe || "No public bio yet."}</p>
                  <blockquote>{entry.introMessage || "No intro included."}</blockquote>

                  <div className="button-row">
                    <button
                      className="secondary-button compact"
                      type="button"
                      disabled={preview || reviewBusyId === entry.id}
                      onClick={() => {
                        setReviewBusyId(entry.id);

                        void (async () => {
                          const result = await reviewJoinRequestAction({
                            joinRequestId: entry.id,
                            decision: "declined",
                          });

                          setStatus(result.message);
                          setReviewBusyId(null);
                          if (result.ok) {
                            router.refresh();
                          }
                        })();
                      }}
                    >
                      {preview ? "Preview mode only" : reviewBusyId === entry.id ? "Working..." : "Decline"}
                    </button>
                    <button
                      className="primary-button compact"
                      type="button"
                      disabled={preview || reviewBusyId === entry.id}
                      onClick={() => {
                        setReviewBusyId(entry.id);

                        void (async () => {
                          const result = await reviewJoinRequestAction({
                            joinRequestId: entry.id,
                            decision: "accepted",
                          });

                          setStatus(result.message);
                          setReviewBusyId(null);
                          if (result.ok) {
                            router.refresh();
                          }
                        })();
                      }}
                    >
                      {preview ? "Preview mode only" : reviewBusyId === entry.id ? "Working..." : "Accept"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel session-panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">Active Session</p>
                <h3>Realtime chat stays private to participants.</h3>
              </div>
              <span className="status-dot">
                <MessageCircleMore size={16} />
                Supabase Realtime
              </span>
            </div>

            <div className="summary-callout summary-callout-teal">
              Keep first meetups in public places, confirm an exact landmark in chat, and contact{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> for urgent moderation help.
            </div>

            {snapshot.activeSession ? (
              <>
                <div className="session-summary">
                  <h4>{snapshot.activeSession.requestTitle}</h4>
                  <p>
                    {snapshot.activeSession.partnerDisplayName} • {snapshot.activeSession.areaLabel} •{" "}
                    {formatDateTime(snapshot.activeSession.meetupAt)}
                  </p>
                </div>
                <ChatRoom
                  requestId={snapshot.activeSession.requestId}
                  currentUserId={snapshot.profile.id}
                  initialMessages={snapshot.activeSession.messages}
                  onStatus={setStatus}
                />
              </>
            ) : (
              <div className="empty-card">Your next confirmed session will appear here with private chat access.</div>
            )}
          </section>

          <section className="panel account-panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">Account</p>
                <h3>Export data or remove your account cleanly.</h3>
              </div>
              <span className="status-dot">
                <UserMinus size={16} />
                Data rights
              </span>
            </div>

            <div className="action-stack">
              <div className="summary-callout">
                Download your current profile, requests, messages, reports, and block records as JSON before deleting
                your account.
              </div>

              <button
                className="ghost-button"
                type="button"
                disabled={preview}
                onClick={() => {
                  if (preview) {
                    setStatus("Connect Supabase to export account data.");
                    return;
                  }

                  window.location.href = "/api/account/export";
                }}
              >
                <Download size={16} />
                {preview ? "Preview mode only" : "Download account export"}
              </button>

              <form
                className="stack-form"
                onSubmit={(event) => {
                  event.preventDefault();

                  if (preview) {
                    setStatus("Connect Supabase to manage deletion requests.");
                    return;
                  }

                  startAccountTransition(async () => {
                    const result = await deleteAccountAction({
                      confirmationText: deleteConfirmation,
                      reason: deleteReason,
                    });

                    setStatus(result.message);
                    if (!result.ok) {
                      return;
                    }

                    if (result.accountDeleted) {
                      if (hasSupabaseEnv) {
                        const supabase = createSupabaseBrowserClient();
                        await supabase.auth.signOut();
                      }

                      router.push("/");
                      router.refresh();
                      return;
                    }

                    setDeleteReason("");
                    setDeleteConfirmation("");
                    router.refresh();
                  });
                }}
              >
                <label>
                  Why are you leaving?
                  <textarea
                    rows={3}
                    value={deleteReason}
                    onChange={(event) => setDeleteReason(event.target.value)}
                    maxLength={600}
                    placeholder="Optional context for support or compliance follow-up."
                    disabled={preview || isAccountPending}
                  />
                </label>

                <label>
                  Type DELETE MY ACCOUNT to confirm
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    disabled={preview || isAccountPending}
                  />
                </label>

                <button className="primary-button" type="submit" disabled={preview || isAccountPending}>
                  <Trash2 size={16} />
                  {preview ? "Preview mode only" : isAccountPending ? "Processing..." : "Delete my account"}
                </button>
              </form>
            </div>
          </section>

          {adminDashboard ? (
            <section className="panel admin-panel">
              <div className="panel-heading">
                <div>
                  <p className="kicker">Moderation</p>
                  <h3>Reports, deletion requests, and platform health.</h3>
                </div>
                <span className="status-dot">
                  <ShieldCheck size={16} />
                  {adminDashboard.overview.reportsOpen} reports open
                </span>
              </div>

              <div className="admin-overview-grid">
                <article className="admin-stat-card">
                  <span>Users</span>
                  <strong>{adminDashboard.overview.usersTotal}</strong>
                </article>
                <article className="admin-stat-card">
                  <span>Open requests</span>
                  <strong>{adminDashboard.overview.openRequests}</strong>
                </article>
                <article className="admin-stat-card">
                  <span>Matched</span>
                  <strong>{adminDashboard.overview.matchedRequests}</strong>
                </article>
                <article className="admin-stat-card">
                  <span>Deletion queue</span>
                  <strong>{adminDashboard.overview.deletionRequestsOpen}</strong>
                </article>
              </div>

              <div className="review-list">
                {adminDashboard.reports.length === 0 ? (
                  <div className="empty-card">No reports in queue.</div>
                ) : null}

                {adminDashboard.reports.map((report) => (
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
                        onChange={(event) =>
                          setModerationNotes((current) => ({ ...current, [report.id]: event.target.value }))
                        }
                        maxLength={1200}
                        disabled={preview || moderationBusyId === report.id}
                      />
                    </label>
                    <div className="button-row admin-actions">
                      <button
                        className="ghost-button compact"
                        type="button"
                        disabled={preview || moderationBusyId === report.id}
                        onClick={() => {
                          void handleResolveReport(report.id, "reviewing");
                        }}
                      >
                        Reviewing
                      </button>
                      <button
                        className="secondary-button compact"
                        type="button"
                        disabled={preview || moderationBusyId === report.id}
                        onClick={() => {
                          void handleResolveReport(report.id, "dismissed");
                        }}
                      >
                        Dismiss
                      </button>
                      <button
                        className="primary-button compact"
                        type="button"
                        disabled={preview || moderationBusyId === report.id}
                        onClick={() => {
                          void handleResolveReport(report.id, "resolved");
                        }}
                      >
                        {preview
                          ? "Preview mode only"
                          : moderationBusyId === report.id
                            ? "Saving..."
                            : "Resolve"}
                      </button>
                    </div>
                  </article>
                ))}

                {adminDashboard.deletionRequests.length === 0 ? (
                  <div className="empty-card">No account deletion requests in queue.</div>
                ) : null}

                {adminDashboard.deletionRequests.map((entry) => (
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
                        onChange={(event) =>
                          setDeletionNotes((current) => ({ ...current, [entry.id]: event.target.value }))
                        }
                        maxLength={1200}
                        disabled={preview || deletionBusyId === entry.id}
                      />
                    </label>
                    <div className="button-row">
                      <button
                        className="secondary-button compact"
                        type="button"
                        disabled={preview || deletionBusyId === entry.id}
                        onClick={() => {
                          void handleResolveDeletionRequest(entry.id, "cancelled");
                        }}
                      >
                        Cancel request
                      </button>
                      <button
                        className="primary-button compact"
                        type="button"
                        disabled={preview || deletionBusyId === entry.id}
                        onClick={() => {
                          void handleResolveDeletionRequest(entry.id, "resolved");
                        }}
                      >
                        {preview
                          ? "Preview mode only"
                          : deletionBusyId === entry.id
                            ? "Saving..."
                            : "Mark resolved"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
