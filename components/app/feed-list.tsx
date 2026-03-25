"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, MapPin, ShieldAlert, ShieldCheck, Star, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteRequestAction, submitJoinRequestAction } from "@/app/workspace/actions";
import type { FeedRequestCard, RequestLane } from "@/lib/supabase/types";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import { getFeedArtwork, getFeedPerson, getFeedVariant, getLaneLabel } from "@/lib/reference-content";

function formatEditorialSchedule(dateValue: string | null) {
  if (!dateValue) return "Flexible timing";

  const date = new Date(dateValue);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getLaneFilterLabel(lane: "all" | RequestLane) {
  if (lane === "all") return "All Requests";
  return lane === "social" ? "Social Plus-One" : "Errand Companion";
}

export function FeedList({
  feed,
  preview = false,
  ownerRequestIds = [],
  activeSessionRequestId = null,
  onStatus,
}: {
  feed: FeedRequestCard[];
  preview?: boolean;
  ownerRequestIds?: string[];
  activeSessionRequestId?: string | null;
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
    <section className="sanctuary-feed-shell">
      <div className="sanctuary-filter-bar">
        <div className="sanctuary-filter-pills" role="tablist" aria-label="Feed filters">
          {(["all", "errand", "social"] as const).map((lane) => (
            <button
              key={lane}
              type="button"
              className={`sanctuary-filter-pill ${laneFilter === lane ? "active" : ""}`}
              onClick={() => setLaneFilter(lane)}
            >
              {getLaneFilterLabel(lane)}
            </button>
          ))}
          <button
            type="button"
            className={`sanctuary-filter-pill ${showVerifiedOnly ? "active" : ""}`}
            onClick={() => setShowVerifiedOnly((current) => !current)}
          >
            Verified only
          </button>
          <button
            type="button"
            className={`sanctuary-filter-pill ${hideOwnRequests ? "active" : ""}`}
            onClick={() => setHideOwnRequests((current) => !current)}
          >
            Hide my posts
          </button>
        </div>

        <label className="sanctuary-search">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search requests by mood, area, or tag"
          />
        </label>
      </div>

      {popularTags.length > 0 ? (
        <div className="sanctuary-tag-row">
          {popularTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`sanctuary-tag ${activeTag === tag ? "active" : ""}`}
              onClick={() => setActiveTag((current) => (current === tag ? "" : tag))}
            >
              {tag}
            </button>
          ))}
          {(laneFilter !== "all" || showVerifiedOnly || hideOwnRequests || activeTag || search.trim()) && (
            <button type="button" className="sanctuary-tag clear" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>
      ) : null}

      {feedback ? <div className="withly-status-banner">{feedback}</div> : null}

      {visibleFeed.length === 0 ? (
        <div className="sanctuary-empty-card">
          <strong>{feed.length === 0 ? "No active requests yet." : "No requests match this view."}</strong>
          <p>
            {feed.length === 0
              ? "Be the first to post a clear, grounded request."
              : "Widen the filters a little and more options will surface."}
          </p>
          {feed.length === 0 ? (
            <Link className="withly-create-button subtle" href="/requests/new">
              Create Request
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="sanctuary-feed-grid">
          {visibleFeed.map((request, index) => {
            const variant = getFeedVariant(index);
            const isOwner = ownerRequestIdSet.has(request.id);
            const joinOpen = expandedJoinId === request.id && !isOwner;
            const submitBusy = joinBusyId === request.id;

            return (
              <article
                key={request.id}
                className={`request-card sanctuary-request-card sanctuary-request-card--${variant} lane-${request.lane}`}
              >
                {(variant === "feature" || variant === "wide") && (
                  <div className="sanctuary-request-art">
                    <Image
                      src={getFeedArtwork(index)}
                      alt={request.title}
                      fill
                      sizes={variant === "feature" ? "(max-width: 960px) 100vw, 34vw" : "(max-width: 960px) 100vw, 18vw"}
                    />
                    <span className={`sanctuary-lane-chip tone-${request.lane}`}>{getLaneLabel(request.lane)}</span>
                  </div>
                )}

                <div className="sanctuary-request-body">
                  <div className="sanctuary-request-head">
                    <div>
                      {variant !== "feature" && variant !== "wide" ? (
                        <span className={`sanctuary-lane-chip tone-${request.lane}`}>{getLaneLabel(request.lane)}</span>
                      ) : null}
                      <div className="sanctuary-request-kicker">
                        <CalendarDays size={14} />
                        <span>{formatEditorialSchedule(request.meetupAt)}</span>
                      </div>
                      <Link href={`/requests/${request.id}`} className="sanctuary-request-title">
                        {request.title}
                      </Link>
                    </div>
                    <div className="sanctuary-request-badges">
                      {isOwner ? <span className="sanctuary-chip">Your request</span> : null}
                      {request.verifiedOnly ? (
                        <span className="sanctuary-chip">
                          <ShieldAlert size={12} />
                          Verified only
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <p className="sanctuary-request-description">{request.description}</p>

                  <div className="sanctuary-request-meta">
                    <span>
                      <MapPin size={14} />
                      {request.areaLabel || "Exact landmark shared privately"}
                    </span>
                    <span>
                      <Clock3 size={14} />
                      {request.meetupAt ? formatDateTime(request.meetupAt) : "Timing shared in chat"}
                    </span>
                    <span>
                      <Star size={14} />
                      Trust score {request.hostTrustScore}
                    </span>
                  </div>

                  <div className="sanctuary-request-footer">
                    <div className="sanctuary-host-chip">
                      <div className="sanctuary-host-avatars">
                        {variant === "compact" ? (
                          <>
                            {[0, 1, 2].map((offset) => (
                              <span key={offset} className="sanctuary-avatar-stack">
                                <Image src={getFeedPerson(index + offset)} alt="" fill sizes="32px" />
                              </span>
                            ))}
                            <span className="sanctuary-avatar-more">+{Math.max(1, request.maxCompanions)}</span>
                          </>
                        ) : (
                          <span className="sanctuary-avatar-single">
                            <Image src={getFeedPerson(index)} alt="" fill sizes="40px" />
                          </span>
                        )}
                      </div>
                      <div>
                        <strong>{request.hostDisplayName || "Protected member"}</strong>
                        <small>
                          {request.hostVerificationTier === "id_verified"
                            ? "Certified companion"
                            : request.hostVerificationTier === "phone"
                              ? "Phone verified"
                              : "Email verified"}
                        </small>
                      </div>
                    </div>

                    <div className="sanctuary-action-row">
                      {request.compatibilityScore !== null ? <span className="sanctuary-fit-pill">{request.compatibilityScore}% fit</span> : null}
                      {request.maxCompanions > 1 ? (
                        <span className="sanctuary-fit-pill">
                          <Users size={12} />
                          Up to {request.maxCompanions}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {request.tags.length > 0 ? (
                    <div className="sanctuary-card-tags">
                      {request.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`sanctuary-inline-tag ${activeTag === tag ? "active" : ""}`}
                          onClick={() => setActiveTag((current) => (current === tag ? "" : tag))}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="sanctuary-card-actions">
                    {isOwner ? (
                      <>
                        <Link className="sanctuary-ghost-button" href={`/requests/${request.id}`}>
                          Open request
                        </Link>
                        <button
                          className="sanctuary-ghost-button danger"
                          type="button"
                          disabled={preview || deleteBusyId === request.id}
                          onClick={() => void handleDelete(request.id)}
                        >
                          <Trash2 size={14} />
                          {deleteBusyId === request.id ? "Deleting..." : "Delete"}
                        </button>
                      </>
                    ) : activeSessionRequestId === request.id ? (
                      <Link className="sanctuary-primary-button" href="/inbox">
                        Open chat
                      </Link>
                    ) : submittedJoinIds.has(request.id) ? (
                      <button className="sanctuary-ghost-button" type="button" disabled>
                        Join request sent
                      </button>
                    ) : (
                      <>
                        <button
                          className="sanctuary-primary-button"
                          type="button"
                          disabled={preview}
                          onClick={() => setExpandedJoinId((current) => (current === request.id ? null : request.id))}
                        >
                          {preview ? "Sign in to join" : joinOpen ? "Cancel" : variant === "compact" ? "Join Circle" : "Interested"}
                        </button>
                        <Link className="sanctuary-ghost-button" href={`/requests/${request.id}`}>
                          View details
                          <ArrowRight size={14} />
                        </Link>
                      </>
                    )}
                  </div>

                  {joinOpen ? (
                    <div className="sanctuary-join-box">
                      <textarea
                        rows={2}
                        value={joinDrafts[request.id] ?? ""}
                        onChange={(event) => setJoinDrafts((current) => ({ ...current, [request.id]: event.target.value }))}
                        placeholder="Add a short intro so the request owner knows why you're a fit."
                        maxLength={220}
                        disabled={preview || submitBusy}
                      />
                      <button
                        className="sanctuary-primary-button"
                        type="button"
                        disabled={preview || submitBusy}
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
                        {submitBusy ? "Sending..." : "Send join request"}
                      </button>
                    </div>
                  ) : null}

                  <div className="sanctuary-request-footnote">{formatRelativeTime(request.createdAt)}</div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {visibleFeed.length > 0 ? (
        <div className="sanctuary-load-more">
          <div className="sanctuary-load-line" />
          <button type="button" className="sanctuary-load-button">
            Explore More Requests
          </button>
        </div>
      ) : null}
    </section>
  );
}
