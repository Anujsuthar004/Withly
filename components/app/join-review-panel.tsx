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
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  async function handleReview(entryId: string, decision: "accepted" | "declined") {
    if (preview) {
      onStatus("This action is only available after sign-in.");
      return;
    }

    setBusyId(entryId);
    setCardErrors((current) => ({ ...current, [entryId]: "" }));

    try {
      const result = await reviewJoinRequestAction({ joinRequestId: entryId, decision });
      onStatus(result.message);

      if (result.ok) {
        router.refresh();
      } else {
        setCardErrors((current) => ({ ...current, [entryId]: result.message }));
      }
    } catch {
      const errorMessage = "Something went wrong. Please refresh and try again.";
      onStatus(errorMessage);
      setCardErrors((current) => ({ ...current, [entryId]: errorMessage }));
    } finally {
      setBusyId(null);
    }
  }

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
        <p className="panel-intro">Replies stay in one place so you can look for alignment, clarity, and any safety signals before deciding.</p>
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
          {entries.length} pending
        </span>
      </div>
      <p className="panel-intro">Read each introduction with enough context to make a quick, confident decision without losing the thread.</p>

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

            {cardErrors[entry.id] ? (
              <div className="inline-error" role="alert">
                {cardErrors[entry.id]}
              </div>
            ) : null}

            <div className="button-row">
              <button
                className="secondary-button compact"
                type="button"
                disabled={preview || busyId === entry.id}
                onClick={() => void handleReview(entry.id, "declined")}
              >
                {!preview && busyId === entry.id && <span className="btn-spinner" />}
                {preview ? "Preview mode only" : busyId === entry.id ? "Working..." : "Decline"}
              </button>
              <button
                className="primary-button compact"
                type="button"
                disabled={preview || busyId === entry.id}
                onClick={() => void handleReview(entry.id, "accepted")}
              >
                {!preview && busyId === entry.id && <span className="btn-spinner" />}
                {preview ? "Preview mode only" : busyId === entry.id ? "Working..." : "Accept"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
