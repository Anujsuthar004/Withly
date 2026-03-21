"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Compass, ShieldAlert, ShieldCheck, Star, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteRequestAction, submitJoinRequestAction } from "@/app/workspace/actions";
import { StatusBadge } from "@/components/app/status-badge";
import type { FeedRequestCard, RequestLane } from "@/lib/supabase/types";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

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
  const [laneFilter, setLaneFilter] = useState<"all" | RequestLane>("all");
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [hideOwnRequests, setHideOwnRequests] = useState(false);
  const [activeTag, setActiveTag] = useState("");
  const [joinDrafts, setJoinDrafts] = useState<Record<string, string>>({});
  const [joinBusyId, setJoinBusyId] = useState<string | null>(null);
  const [expandedJoinId, setExpandedJoinId] = useState<string | null>(null);
  const [submittedJoinIds, setSubmittedJoinIds] = useState<Set<string>>(new Set());
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [dismissedRequestIds, setDismissedRequestIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const ownerRequestIdSet = useMemo(() => new Set(ownerRequestIds), [ownerRequestIds]);

  const popularTags = useMemo(() => {
    const counts = new Map<string, number>();

    for (const entry of feed) {
      for (const tag of entry.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 6)
      .map(([tag]) => tag);
  }, [feed]);

  const filteredFeed = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return feed.filter((entry) => {
      if (laneFilter !== "all" && entry.lane !== laneFilter) return false;
      if (showVerifiedOnly && !entry.verifiedOnly) return false;
      if (hideOwnRequests && ownerRequestIdSet.has(entry.id)) return false;
      if (activeTag && !entry.tags.includes(activeTag)) return false;

      if (!query) return true;

      const haystack = [entry.title, entry.description, entry.areaLabel ?? "", entry.hostDisplayName ?? "", entry.tags.join(" ")]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeTag, deferredSearch, feed, hideOwnRequests, laneFilter, ownerRequestIdSet, showVerifiedOnly]);

  const visibleFeed = useMemo(
    () => filteredFeed.filter((entry) => !dismissedRequestIds.includes(entry.id)),
    [dismissedRequestIds, filteredFeed]
  );

  const activeFilterCount = [
    laneFilter !== "all",
    showVerifiedOnly,
    hideOwnRequests,
    Boolean(activeTag),
    Boolean(search.trim()),
  ].filter(Boolean).length;

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

  function clearFilters() {
    setLaneFilter("all");
    setShowVerifiedOnly(false);
    setHideOwnRequests(false);
    setActiveTag("");
    setSearch("");
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
      <p className="panel-intro">Search by mood, narrow the list fast, and open only the requests that feel like a real fit.</p>

      <div className="feed-toolbar">
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

        <div className="feed-filter-row">
          <div className="filter-pill-group" role="tablist" aria-label="Lane filters">
            <button type="button" className={`filter-pill ${laneFilter === "all" ? "active" : ""}`} onClick={() => setLaneFilter("all")}>
              All
            </button>
            <button type="button" className={`filter-pill ${laneFilter === "social" ? "active" : ""}`} onClick={() => setLaneFilter("social")}>
              Social
            </button>
            <button type="button" className={`filter-pill ${laneFilter === "errand" ? "active" : ""}`} onClick={() => setLaneFilter("errand")}>
              Errand
            </button>
          </div>

          <div className="filter-pill-group">
            <button
              type="button"
              className={`filter-pill ${showVerifiedOnly ? "active" : ""}`}
              onClick={() => setShowVerifiedOnly((current) => !current)}
            >
              Verified only
            </button>
            <button
              type="button"
              className={`filter-pill ${hideOwnRequests ? "active" : ""}`}
              onClick={() => setHideOwnRequests((current) => !current)}
            >
              Hide my posts
            </button>
            {activeFilterCount > 0 ? (
              <button type="button" className="filter-pill" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        {popularTags.length > 0 ? (
          <div className="filter-tag-row">
            {popularTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`filter-tag ${activeTag === tag ? "active" : ""}`}
                onClick={() => setActiveTag((current) => (current === tag ? "" : tag))}
              >
                {tag}
              </button>
            ))}
          </div>
        ) : null}

        <div className="feed-toolbar-meta">
          <span>
            Showing {visibleFeed.length} of {feed.length} requests
          </span>
          {activeFilterCount > 0 ? <span>{activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active</span> : null}
        </div>
      </div>

      {feedback ? <StatusBadge message={feedback} /> : null}

      <div className="feed-list">
        {visibleFeed.length === 0 ? (
          <div className="empty-card">
            {feed.length === 0 ? (
              <>
                <strong>No active requests yet.</strong>
                <span>Be the first to post one — a clear, specific request is all it takes to get the ball rolling.</span>
                <Link className="primary-button compact" href="/requests/new" style={{ marginTop: "0.75rem" }}>
                  Post a request
                </Link>
              </>
            ) : (
              <>
                <strong>No requests match this view.</strong>
                <span>Try clearing one filter or widening the search so more options can surface.</span>
              </>
            )}
          </div>
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
                <span className="mini-chip">{formatRelativeTime(request.createdAt)}</span>
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

            <div className="card-chip-row" style={{ marginTop: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap", opacity: 0.9 }}>
              <span className="mini-chip" title="Host Trust Score">
                <Star size={12} /> {request.hostTrustScore}/100 Trust
              </span>
              <span className="mini-chip" title={`Host Verification: ${request.hostVerificationTier}`}>
                <ShieldCheck size={12} /> {request.hostVerificationTier === "id_verified" ? "ID Verified" : request.hostVerificationTier === "phone" ? "Phone" : "Email"}
              </span>
              {request.compatibilityScore !== null ? (
                <span className="mini-chip" title="Companion Compatibility Score">
                  {request.compatibilityScore}% Match
                </span>
              ) : null}
              {request.maxCompanions > 1 ? (
                <span className="mini-chip" title="Group Request">
                  <Users size={12} /> Up to {request.maxCompanions} others
                </span>
              ) : null}
              {request.expiresAt ? (
                <span className="mini-chip" title={`Expires at ${formatDateTime(request.expiresAt)}`}>
                  <Clock size={12} /> Ephemeral
                </span>
              ) : null}
            </div>

            <div className="tag-row">
              {request.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-chip ${activeTag === tag ? "active" : ""}`}
                  onClick={() => setActiveTag((current) => (current === tag ? "" : tag))}
                >
                  {tag}
                </button>
              ))}
            </div>

            {ownerRequestIdSet.has(request.id) ? (
              <div className="button-row request-card-actions">
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
              <div className="button-row request-card-actions">
                {submittedJoinIds.has(request.id) ? (
                  <button className="secondary-button compact" type="button" disabled>
                    Join request sent
                  </button>
                ) : (
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
                )}
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
                          setSubmittedJoinIds((current) => new Set([...current, request.id]));
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
