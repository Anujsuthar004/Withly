"use client";

import { useState } from "react";

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

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        kicker="Inbox"
        title="Keep replies moving toward a confident yes."
        intro="Review introductions, confirm the right fit, and keep any matched plan coordinated in one place."
        status={status}
      />

      <div className="workspace-content workspace-content-single">
        {snapshot.activeSession ? (
          <SessionPanel session={snapshot.activeSession} currentUserId={snapshot.profile.id} onStatus={setStatus} />
        ) : (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">Sessions</p>
                <h3>Chat for confirmed plans.</h3>
              </div>
            </div>
            <div className="empty-card">Your next confirmed plan will appear here with chat access.</div>
          </section>
        )}

        <JoinReviewPanel entries={snapshot.incomingJoinRequests} preview={preview} onStatus={setStatus} />
      </div>
    </div>
  );
}
