"use client";

import { useMemo, useState } from "react";
import { ShieldAlert, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteRequestAction, submitJoinRequestAction } from "@/app/workspace/actions";
import { JoinReviewPanel } from "@/components/app/join-review-panel";
import { StatusBadge } from "@/components/app/status-badge";
import type { FeedRequestCard, WorkspaceJoinReview, WorkspaceRequest } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";

type RequestDetail = {
  id: string;
  lane: "social" | "errand";
  title: string;
  description?: string;
  areaLabel: string | null;
  meetupAt: string | null;
  verifiedOnly: boolean;
  hostDisplayName?: string | null;
  tags?: string[];
};

export function RequestDetailPage({
  detail,
  preview,
  isOwner,
  myRequest,
  joinReviews,
  unavailableMessage = "",
}: {
  detail: RequestDetail;
  preview: boolean;
  isOwner: boolean;
  myRequest: WorkspaceRequest | null;
  joinReviews: WorkspaceJoinReview[];
  unavailableMessage?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("Open request ready.");
  const [intro, setIntro] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const titleMeta = useMemo(() => {
    const chips = [];
    if (detail.verifiedOnly) chips.push("Verified only");
    return chips;
  }, [detail.verifiedOnly]);

  const detailMeta = [
    detail.areaLabel,
    detail.meetupAt ? formatDateTime(detail.meetupAt) : null,
    detail.hostDisplayName ? `Hosted by ${detail.hostDisplayName}` : null,
  ].filter(Boolean);

  return (
    <div className="workspace-page">
      <section className="request-detail-status">
        <StatusBadge message={unavailableMessage || status} />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="kicker">{detail.lane === "social" ? "Social" : "Errand"}</p>
            <h3>{detail.title}</h3>
            <p>{detailMeta.length > 0 ? detailMeta.join(" · ") : "Exact meetup details are shared privately once both people decide to move forward."}</p>
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
          <div className="join-box request-detail-join">
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
          <div className="summary-callout summary-callout-row">
            <div>
              Status: <strong>{myRequest.status}</strong> · {myRequest.pendingJoinCount} pending join request(s)
              {myRequest.partnerDisplayName ? ` · Matched with ${myRequest.partnerDisplayName}` : ""}
            </div>
            <button
              className="secondary-button compact"
              type="button"
              disabled={preview || isDeleting}
              onClick={() => {
                if (preview) {
                  setStatus("This action is only available after sign-in.");
                  return;
                }
                if (!confirm("Are you sure you want to delete this request? This action cannot be undone.")) return;

                setIsDeleting(true);
                void (async () => {
                  const result = await deleteRequestAction({ requestId: detail.id });
                  setStatus(result.message);
                  setIsDeleting(false);
                  if (result.ok) {
                    router.push("/requests");
                    router.refresh();
                  }
                })();
              }}
            >
              <Trash2 size={16} />
              {isDeleting ? "..." : "Delete Request"}
            </button>
          </div>
        ) : null}
      </section>

      {isOwner ? <JoinReviewPanel entries={joinReviews} preview={preview} onStatus={setStatus} /> : null}
    </div>
  );
}
