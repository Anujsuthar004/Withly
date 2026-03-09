"use client";

import { useState } from "react";

import { JoinReviewPanel } from "@/components/app/join-review-panel";
import { SessionPanel } from "@/components/app/session-panel";
import { StatusBadge } from "@/components/app/status-badge";
import type { WorkspaceSnapshot } from "@/lib/supabase/types";

export function InboxPage({
  snapshot,
  preview,
}: {
  snapshot: WorkspaceSnapshot;
  preview: boolean;
}) {
  const [status, setStatus] = useState(
    preview ? "Preview mode is active. Sign in to review replies and chat." : "Inbox ready."
  );

  return (
    <div className="workspace-page">
      <section className="workspace-hero-actions" style={{ padding: 0, background: "transparent", border: 0, boxShadow: "none" }}>
        <StatusBadge message={status} />
      </section>

      <div className="workspace-content" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
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

