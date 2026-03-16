"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, MessageCircleMore, ShieldAlert } from "lucide-react";

import { JoinReviewPanel } from "@/components/app/join-review-panel";
import { SessionPanel } from "@/components/app/session-panel";
import { WorkspacePageHeader } from "@/components/app/workspace-page-header";
import type { WorkspaceSnapshot } from "@/lib/supabase/types";

export function InboxPage({
  snapshot,
  preview,
  initialStatus,
}: {
  snapshot: WorkspaceSnapshot;
  preview: boolean;
  initialStatus?: string;
}) {
  const [status, setStatus] = useState(
    initialStatus ?? (preview ? "Preview mode is active. Sign in to review replies and chat." : "Inbox ready.")
  );
  const hasSession = Boolean(snapshot.activeSession);
  const pendingCount = snapshot.incomingJoinRequests.length;

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        kicker="Inbox"
        title="Keep replies moving toward a confident yes."
        intro="Review introductions, confirm the right fit, and keep any matched plan coordinated in one place."
        status={status}
        meta={<span className="mini-chip">{pendingCount + (hasSession ? 1 : 0)} active threads</span>}
      />

      <div className="workspace-content inbox-layout">
        <aside className="workspace-left">
          <section className="panel inbox-command-panel">
            <div className="form-section-head">
              <h4>Action queue</h4>
              <p>Start with anything waiting on you, then move into the thread that needs the most clarity.</p>
            </div>

            <div className="inbox-queue-list">
              <Link className={`inbox-queue-card ${hasSession ? "active" : ""}`} href="#active-session">
                <div>
                  <span className="kicker">Session</span>
                  <strong>{hasSession ? snapshot.activeSession?.requestTitle : "No active chat yet"}</strong>
                </div>
                <span className="mini-chip">
                  <MessageCircleMore size={14} />
                  {hasSession ? "Live" : "Waiting"}
                </span>
              </Link>

              <Link className={`inbox-queue-card ${pendingCount > 0 ? "active" : ""}`} href="#join-review">
                <div>
                  <span className="kicker">Join review</span>
                  <strong>{pendingCount > 0 ? `${pendingCount} introductions waiting` : "No pending introductions"}</strong>
                </div>
                <span className="mini-chip">
                  <ShieldAlert size={14} />
                  {pendingCount}
                </span>
              </Link>

              <div className="summary-callout summary-callout-teal">
                <p>Reply quickly, keep expectations explicit, and move only the clearest fit toward confirmation.</p>
              </div>
            </div>
          </section>
        </aside>

        <div className="workspace-main">
          <section id="active-session">
            {snapshot.activeSession ? (
              <SessionPanel session={snapshot.activeSession} currentUserId={snapshot.profile.id} onStatus={setStatus} />
            ) : (
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="kicker">Sessions</p>
                    <h3>Chat for confirmed plans.</h3>
                  </div>
                  <span className="status-dot">
                    <CheckCircle2 size={16} />
                    Nothing live
                  </span>
                </div>
                <p className="panel-intro">As soon as a request turns into a confirmed plan, the conversation will appear here.</p>
                <div className="empty-card">Your next confirmed plan will appear here with chat access.</div>
              </section>
            )}
          </section>

          <section id="join-review">
            <JoinReviewPanel entries={snapshot.incomingJoinRequests} preview={preview} onStatus={setStatus} />
          </section>
        </div>
      </div>
    </div>
  );
}
