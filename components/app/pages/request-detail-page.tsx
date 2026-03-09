"use client";

import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import { submitJoinRequestAction } from "@/app/workspace/actions";
import { JoinReviewPanel } from "@/components/app/join-review-panel";
import { StatusBadge } from "@/components/app/status-badge";
import type { FeedRequestCard, WorkspaceJoinReview, WorkspaceRequest } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";

type RequestDetail = {
  id: string;
  lane: "social" | "errand";
  title: string;
  description?: string;
  areaLabel: string;
  meetupAt: string | null;
  verifiedOnly: boolean;
  hostDisplayName?: string;
  tags?: string[];
};

export function RequestDetailPage({
  detail,
  preview,
  isOwner,
  myRequest,
  joinReviews,
}: {
  detail: RequestDetail;
  preview: boolean;
  isOwner: boolean;
  myRequest: WorkspaceRequest | null;
  joinReviews: WorkspaceJoinReview[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState("Open request ready.");
  const [intro, setIntro] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const titleMeta = useMemo(() => {
    const chips = [];
    if (detail.verifiedOnly) chips.push("Verified only");
    return chips;
  }, [detail.verifiedOnly]);

  return (
    <div className="workspace-page">
      <section className="workspace-hero-actions" style={{ padding: 0, background: "transparent", border: 0, boxShadow: "none" }}>
        <StatusBadge message={status} />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="kicker">{detail.lane === "social" ? "Social" : "Errand"}</p>
            <h3>{detail.title}</h3>
            <p>
              {detail.areaLabel} · {formatDateTime(detail.meetupAt)}
              {detail.hostDisplayName ? ` · Hosted by ${detail.hostDisplayName}` : ""}
            </p>
          </div>
          {titleMeta.length > 0 ? (
            <span className="mini-chip">
              <ShieldAlert size={14} />
              {titleMeta.join(", ")}
            </span>
          ) : null}
        </div>

        {detail.description ? <p className="request-description">{detail.description}</p> : null}

        {detail.tags && detail.tags.length > 0 ? (
          <div className="tag-row">
            {detail.tags.map((tag) => (
              <span key={tag} className="tag-chip">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {!isOwner ? (
          <div className="join-box" style={{ marginTop: 16 }}>
            <textarea
              rows={3}
              value={intro}
              onChange={(event) => setIntro(event.target.value)}
              placeholder="Add a short intro so the request owner knows why you're a fit."
              maxLength={220}
              disabled={preview || isJoining}
            />
            <button
              className="primary-button"
              type="button"
              disabled={preview || isJoining}
              onClick={() => {
                if (preview) {
                  setStatus("This action is only available after sign-in.");
                  return;
                }

                setIsJoining(true);
                void (async () => {
                  const result = await submitJoinRequestAction({ requestId: detail.id, introMessage: intro });
                  setStatus(result.message);
                  setIsJoining(false);
                  if (result.ok) {
                    setIntro("");
                    router.refresh();
                  }
                })();
              }}
            >
              {preview ? "Preview mode only" : isJoining ? "Sending..." : "Request to join"}
            </button>
          </div>
        ) : null}

        {isOwner && myRequest ? (
          <div className="summary-callout" style={{ marginTop: 16 }}>
            Status: <strong>{myRequest.status}</strong> · {myRequest.pendingJoinCount} pending join request(s)
            {myRequest.partnerDisplayName ? ` · Matched with ${myRequest.partnerDisplayName}` : ""}
          </div>
        ) : null}
      </section>

      {isOwner ? <JoinReviewPanel entries={joinReviews} preview={preview} onStatus={setStatus} /> : null}
    </div>
  );
}

