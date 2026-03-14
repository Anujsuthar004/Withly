"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Compass, ShieldAlert, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteRequestAction, submitJoinRequestAction } from "@/app/workspace/actions";
import { StatusBadge } from "@/components/app/status-badge";
import type { FeedRequestCard } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";

export function FeedList({
  feed,
  preview = false,
  ownerRequestIds = [],
  onStatus,
}: {
  feed: FeedRequestCard[];
  preview?: boolean;
  ownerRequestIds?: string[];
  onStatus?: (message: string) => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [joinDrafts, setJoinDrafts] = useState<Record<string, string>>({});
  const [joinBusyId, setJoinBusyId] = useState<string | null>(null);
  const [expandedJoinId, setExpandedJoinId] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [dismissedRequestIds, setDismissedRequestIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const ownerRequestIdSet = useMemo(() => new Set(ownerRequestIds), [ownerRequestIds]);

  const filteredFeed = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return feed;

    return feed.filter((entry) => {
      const haystack = [entry.title, entry.description, entry.areaLabel ?? "", entry.hostDisplayName ?? "", entry.tags.join(" ")]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [deferredSearch, feed]);

  const visibleFeed = useMemo(
    () => filteredFeed.filter((entry) => !dismissedRequestIds.includes(entry.id)),
    [dismissedRequestIds, filteredFeed]
  );

  async function handleDelete(requestId: string) {
    if (preview) {
      const message = "This action is only available after sign-in.";
      setFeedback(message);
      onStatus?.(message);
      return;
    }

    if (!confirm("Are you sure you want to delete this request? This action cannot be undone.")) {
      return;
    }

    setDeleteBusyId(requestId);

    try {
      const result = await deleteRequestAction({ requestId });
      setFeedback(result.message);
      onStatus?.(result.message);
      if (result.ok) {
        setDismissedRequestIds((current) => [...current, requestId]);
        router.refresh();
      }
    } catch {
      const message = "Could not delete this request right now. Please try again.";
      setFeedback(message);
      onStatus?.(message);
    } finally {
      setDeleteBusyId(null);
    }
  }

  return (
    <section className="panel feed-panel">
      <div className="panel-heading">
        <div>
          <p className="kicker">Discovery Feed</p>
          <h3>Discover requests nearby.</h3>
        </div>
        <span className="status-dot">
          <Compass size={16} />
          {visibleFeed.length} live requests
        </span>
      </div>

      {feed.length > 0 ? (
        <label className="search-input">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by mood, area, or tags"
          />
        </label>
      ) : null}

      {feedback ? <StatusBadge message={feedback} /> : null}

      <div className="feed-list">
        {visibleFeed.length === 0 ? (
          <div className="empty-card">No matching requests. Try a broader search.</div>
        ) : null}

        {visibleFeed.map((request) => (
          <article key={request.id} className={`request-card lane-${request.lane}`}>
            <div className="request-card-top">
              <div>
                <span className="request-lane">{request.lane === "social" ? "Social" : "Errand"}</span>
                <h4>{request.title}</h4>
              </div>
              <div className="card-chip-row">
                {ownerRequestIdSet.has(request.id) ? <span className="mini-chip">Your request</span> : null}
                {request.verifiedOnly ? (
                  <span className="mini-chip">
                    <ShieldAlert size={14} />
                    Verified only
                  </span>
                ) : null}
              </div>
            </div>

            <p className="request-description">{request.description}</p>

            {request.areaLabel || request.meetupAt || request.hostDisplayName ? (
              <div className="request-meta">
                {request.areaLabel ? <span>{request.areaLabel}</span> : null}
                {request.meetupAt ? <span>{formatDateTime(request.meetupAt)}</span> : null}
                {request.hostDisplayName ? <span>{request.hostDisplayName}</span> : null}
              </div>
            ) : (
              <p className="request-privacy-note">Exact meetup details are shared privately after both people are aligned.</p>
            )}

            <div className="tag-row">
              {request.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                </span>
              ))}
            </div>

            {ownerRequestIdSet.has(request.id) ? (
              <div className="button-row">
                <Link className="secondary-button compact" href={`/requests/${request.id}`}>
                  Open request
                </Link>
                <button
                  className="ghost-button compact danger-button"
                  type="button"
                  disabled={preview || deleteBusyId === request.id}
                  onClick={() => void handleDelete(request.id)}
                >
                  <Trash2 size={16} />
                  {deleteBusyId === request.id ? "Deleting..." : "Delete request"}
                </button>
              </div>
            ) : (
              <div className="button-row">
                <button
                  className="primary-button compact"
                  type="button"
                  disabled={preview}
                  onClick={() => {
                    setExpandedJoinId((current) => (current === request.id ? null : request.id));
                  }}
                >
                  {preview ? "Sign in to join" : expandedJoinId === request.id ? "Cancel" : "Request to join"}
                </button>
              </div>
            )}

            {expandedJoinId === request.id && !ownerRequestIdSet.has(request.id) ? (
              <div className="join-box">
                <textarea
                  rows={2}
                  value={joinDrafts[request.id] ?? ""}
                  onChange={(event) =>
                    setJoinDrafts((current) => ({ ...current, [request.id]: event.target.value }))
                  }
                  placeholder="Add a short intro so the request owner knows why you're a fit."
                  maxLength={220}
                  disabled={preview || joinBusyId === request.id}
                />
                <button
                  className="primary-button compact"
                  type="button"
                  disabled={preview || joinBusyId === request.id}
                  onClick={() => {
                    setJoinBusyId(request.id);
                    void (async () => {
                      try {
                        const result = await submitJoinRequestAction({
                          requestId: request.id,
                          introMessage: joinDrafts[request.id] ?? "",
                        });
                        onStatus?.(result.message);
                        if (result.ok) {
                          setJoinDrafts((current) => ({ ...current, [request.id]: "" }));
                          setExpandedJoinId(null);
                          router.refresh();
                        }
                      } catch {
                        onStatus?.("Something went wrong. Please try again.");
                      } finally {
                        setJoinBusyId(null);
                      }
                    })();
                  }}
                >
                  {joinBusyId === request.id ? "Sending..." : "Send join request"}
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
