"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { reviewJoinRequestAction } from "@/app/workspace/actions";
import type { WorkspaceJoinReview } from "@/lib/supabase/types";
import { formatRelativeTime } from "@/lib/utils";

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function getGradient(name: string) {
  const GRADIENTS = [
    "linear-gradient(135deg,#6C7BD6,#9A6CD6)",
    "linear-gradient(135deg,#3FA796,#2C7A6B)",
    "linear-gradient(135deg,#E0864B,#C65D3B)",
    "linear-gradient(135deg,#B37FE0,#8C4FC4)",
    "linear-gradient(135deg,#D6497E,#B32E63)",
  ];
  const hash = [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
}

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

  return (
    <div className="wl-inbox" style={{ maxWidth: 820 }}>
      {/* Join requests */}
      <section>
        <h2 className="wl-section-title">Join requests</h2>
        <div className="wl-inbox-list">
          {entries.length === 0 ? (
            <div className="wl-empty-card">
              <strong>No pending join requests</strong>
              <span>When someone wants to join your request, it will show up here.</span>
            </div>
          ) : null}

          {entries.map((entry) => {
            const initials = getInitials(entry.joinerDisplayName);
            const grad = getGradient(entry.joinerDisplayName);

            return (
              <article key={entry.id} className="wl-join-card" aria-label={`Introduction from ${entry.joinerDisplayName}`}>
                <div className="wl-join-header">
                  <div className="wl-join-avatar-wrap">
                    <div className="wl-join-avatar" style={{ background: grad }}>
                      {initials}
                    </div>
                  </div>
                  <div className="wl-join-info">
                    <div className="wl-join-name-row">
                      <strong>{entry.joinerDisplayName}</strong>
                      {preview ? <span className="wl-join-preview">Example reply</span> : null}
                    </div>
                    <div className="wl-join-meta">
                      wants to join · {entry.requestTitle} · {formatRelativeTime(entry.createdAt)}
                    </div>
                  </div>
                </div>

                <p className="wl-join-intro">&quot;{entry.introMessage || "No intro included."}&quot;</p>
                {entry.joinerAboutMe ? <p className="wl-join-about"><strong>A little about them</strong> {entry.joinerAboutMe}</p> : null}

                {cardErrors[entry.id] ? (
                  <div className="inline-error" role="alert">
                    {cardErrors[entry.id]}
                  </div>
                ) : null}

                <div className="wl-join-actions">
                  <button
                    className="wl-btn-teal"
                    type="button"
                    disabled={preview || busyId === entry.id}
                    onClick={() => void handleReview(entry.id, "accepted")}
                  >
                    {busyId === entry.id ? "Working..." : "Accept & open chat"}
                  </button>
                  <button
                    className="wl-btn-ghost"
                    type="button"
                    disabled={preview || busyId === entry.id}
                    onClick={() => void handleReview(entry.id, "declined")}
                  >
                    {busyId === entry.id ? "Working..." : "Decline"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

    </div>
  );
}
