"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import { reviewJoinRequestAction } from "@/app/workspace/actions";
import type { WorkspaceJoinReview } from "@/lib/supabase/types";
import { formatRelativeTime } from "@/lib/utils";

export function JoinReviewPanel({
  entries,
  preview,
  onStatus,
}: {
  entries: WorkspaceJoinReview[];
  preview: boolean;
  onStatus: (message: string) => void;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <section className="panel review-panel">
        <div className="panel-heading">
          <div>
            <p className="kicker">Join review</p>
            <h3>Review the people who want to join.</h3>
          </div>
          <span className="status-dot">
            <ShieldAlert size={16} />
            No pending
          </span>
        </div>
        <div className="empty-card">No pending join requests right now.</div>
      </section>
    );
  }

  return (
    <section className="panel review-panel">
      <div className="panel-heading">
        <div>
          <p className="kicker">Join Review</p>
          <h3>Review the people who want to join.</h3>
        </div>
        <span className="status-dot">
          <ShieldAlert size={16} />
          Pending replies
        </span>
      </div>

      <div className="review-list">
        {entries.map((entry) => (
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
                disabled={preview || busyId === entry.id}
                onClick={() => {
                  setBusyId(entry.id);
                  void (async () => {
                    const result = await reviewJoinRequestAction({ joinRequestId: entry.id, decision: "declined" });
                    onStatus(result.message);
                    setBusyId(null);
                    if (result.ok) router.refresh();
                  })();
                }}
              >
                {preview ? "Preview mode only" : busyId === entry.id ? "Working..." : "Decline"}
              </button>
              <button
                className="primary-button compact"
                type="button"
                disabled={preview || busyId === entry.id}
                onClick={() => {
                  setBusyId(entry.id);
                  void (async () => {
                    const result = await reviewJoinRequestAction({ joinRequestId: entry.id, decision: "accepted" });
                    onStatus(result.message);
                    setBusyId(null);
                    if (result.ok) router.refresh();
                  })();
                }}
              >
                {preview ? "Preview mode only" : busyId === entry.id ? "Working..." : "Accept"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

