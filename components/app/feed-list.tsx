"use client";

import { useDeferredValue, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Clock, Search, ShieldCheck, Star, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteRequestAction, submitJoinRequestAction } from "@/app/workspace/actions";
import { StatusBadge } from "@/components/app/status-badge";
import type { FeedRequestCard, RequestLane, WorkspaceProfile } from "@/lib/supabase/types";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

type FeedTab = "foryou" | "expiring";

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function getAvatarGradient(name: string) {
  const GRADIENTS = [
    "linear-gradient(135deg,#6C7BD6,#9A6CD6)",
    "linear-gradient(135deg,#3FA796,#2C7A6B)",
    "linear-gradient(135deg,#E0864B,#C65D3B)",
    "linear-gradient(135deg,#B37FE0,#8C4FC4)",
    "linear-gradient(135deg,#D6497E,#B32E63)",
    "linear-gradient(135deg,#5B6CE0,#3F4FC4)",
    "linear-gradient(135deg,#E0A84B,#C68A2A)",
  ];
  const hash = [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
}

export function FeedList({
  feed,
  preview = false,
  ownerRequestIds = [],
  viewerProfile,
  onStatus,
}: {
  feed: FeedRequestCard[];
  preview?: boolean;
  ownerRequestIds?: string[];
  viewerProfile: WorkspaceProfile;
  onStatus?: (message: string) => void;
}) {
  const router = useRouter();
  const [feedTab, setFeedTab] = useState<FeedTab>("foryou");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [laneFilter, setLaneFilter] = useState<"all" | RequestLane>("all");
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [activeTag, setActiveTag] = useState("");
  const [joinDrafts, setJoinDrafts] = useState<Record<string, string>>({});
  const [joinBusyId, setJoinBusyId] = useState<string | null>(null);
  const [expandedJoinId, setExpandedJoinId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [dismissedRequestIds, setDismissedRequestIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const ownerRequestIdSet = useMemo(() => new Set(ownerRequestIds), [ownerRequestIds]);

  const filteredFeed = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return feed.filter((entry) => {
      if (feedTab === "expiring" && !entry.expiresAt) return false;

      if (laneFilter !== "all" && entry.lane !== laneFilter) return false;
      if (showVerifiedOnly && !entry.verifiedOnly) return false;
      if (activeTag && !entry.tags.includes(activeTag)) return false;

      if (!query) return true;

      const haystack = [entry.title, entry.description, entry.areaLabel ?? "", entry.hostDisplayName ?? "", entry.tags.join(" ")]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeTag, deferredSearch, feed, feedTab, laneFilter, showVerifiedOnly]);

  const visibleFeed = useMemo(
    () => filteredFeed.filter((entry) => !dismissedRequestIds.includes(entry.id)),
    [dismissedRequestIds, filteredFeed]
  );
  const expiringRequests = useMemo(() => feed.filter((entry) => entry.expiresAt).slice(0, 6), [feed]);

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
    setFeedTab("foryou");
    setLaneFilter("all");
    setShowVerifiedOnly(false);
    setActiveTag("");
    setSearch("");
  }

  return (
    <div className="wl-feed-grid">
      {/* ========= FEED COLUMN ========= */}
      <div className="wl-feed-col">
        {/* Feed source tabs */}
        <div className="wl-feed-tabs">
          {(["foryou", "expiring"] as FeedTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`wl-feed-tab ${feedTab === tab ? "active" : ""}`}
              onClick={() => setFeedTab(tab)}
            >
              {tab === "foryou" ? "For you" : "Expiring soon"}
            </button>
          ))}
        </div>

        {/* Stories rail */}
        <section className="wl-stories-section">
          <div className="wl-stories-head">
            <h3>Ephemeral &amp; live</h3>
            <span>Expire fast — reply now</span>
          </div>
          <div className="wl-stories-rail">
            <Link href="/requests/new" className="wl-story-post">
              <div className="wl-story-post-circle">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <span>Post</span>
            </Link>
            {expiringRequests.length === 0 ? <span>No expiring requests right now.</span> : null}
            {expiringRequests.map((request) => {
              const name = request.hostDisplayName ?? "Member";
              return (
              <button key={request.id} type="button" className="wl-story" onClick={() => router.push(`/requests/${request.id}`)}>
                <div className="wl-story-ring">
                  <div className="wl-story-avatar" style={{ background: getAvatarGradient(name) }}>
                    {getInitials(name)}
                  </div>
                </div>
                <span className="wl-story-name">{request.title}</span>
              </button>
              );
            })}
          </div>
        </section>

        {/* Filter chips */}
        <div className="wl-filter-row">
          <div className="wl-filter-chips">
            {(["all", "social", "errand"] as const).map((lane) => (
              <button
                key={lane}
                type="button"
                className={`wl-chip ${laneFilter === lane ? "active" : ""}`}
                onClick={() => setLaneFilter(lane)}
              >
                {lane === "all" ? "All" : lane === "social" ? "Coworking & Focus" : "Coffee Walk"}
              </button>
            ))}
            <button
              type="button"
              className={`wl-chip wl-chip-verified ${showVerifiedOnly ? "active" : ""}`}
              onClick={() => setShowVerifiedOnly((c) => !c)}
            >
              <ShieldCheck size={14} />
              Email-confirmed only
            </button>
          </div>
          <span className="wl-filter-count">{visibleFeed.length} live requests</span>
        </div>

        {feedback ? <StatusBadge message={feedback} /> : null}

        {/* Feed cards */}
        <div className="wl-card-list">
          {visibleFeed.length === 0 ? (
            <div className="wl-empty-card">
              <div className="wl-empty-icon">
                <Search size={24} />
              </div>
              <strong>No requests match this view</strong>
              <span>Try another tab, clear a filter, or widen your search so more plans can surface.</span>
              <button type="button" className="wl-empty-action" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          ) : null}

          {visibleFeed.map((request) => {
            const isSocial = request.lane === "social";
            const accentBar = isSocial
              ? "linear-gradient(90deg, var(--accent), var(--gold))"
              : "linear-gradient(90deg, var(--teal), #4FC4A8)";
            const ring = isSocial
              ? "linear-gradient(135deg, var(--accent), var(--gold))"
              : "linear-gradient(135deg, var(--teal), #4FC4A8)";
            const hostName = request.hostDisplayName ?? "Host";
            const initials = getInitials(hostName);
            const avatarGrad = getAvatarGradient(hostName);
            const isOwner = ownerRequestIdSet.has(request.id);
            const isExpanded = expandedJoinId === request.id;
            const isJoined = joinedIds.has(request.id);

            const tierLabel =
              request.hostVerificationTier === "id_verified"
                ? "ID verified"
                : request.hostVerificationTier === "phone"
                  ? "Phone verified"
                  : "Email confirmed";

            return (
              <article key={request.id} className="wl-card">

                <div className="wl-card-body">
                  {/* Header row */}
                  <div className="wl-card-header">
                    <div className="wl-card-avatar-wrap">
                      <div className="wl-card-avatar-ring" style={{ background: ring }}>
                        <div className="wl-card-avatar" style={{ background: avatarGrad }}>
                          {initials}
                        </div>
                      </div>
                    </div>
                    <div className="wl-card-header-info">
                      <div className="wl-card-name-row">
                        <strong>{hostName}</strong>
                        <span className="wl-verified-pill">
                          <ShieldCheck size={11} />
                          {tierLabel}
                        </span>
                      </div>
                      <div className="wl-card-meta-line">
                        <span>{isSocial ? "Coworking & Focus" : "Coffee Walk"}</span>
                        <span className="wl-meta-dot" />
                        <span>{formatRelativeTime(request.createdAt)}</span>
                        {request.expiresAt && (
                          <>
                            <span className="wl-meta-dot" />
                            <span className="wl-ephemeral-tag">
                              <Clock size={11} />
                              expires {formatRelativeTime(request.expiresAt)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {request.compatibilityScore !== null && (
                      <div className="wl-match">
                        <div
                          className="wl-match-ring"
                          style={{ "--match": `${request.compatibilityScore}%` } as CSSProperties}
                        >
                          <span>{request.compatibilityScore}</span>
                        </div>
                        <div className="wl-match-label">Match</div>
                      </div>
                    )}
                  </div>

                  {/* Title + description */}
                  <div>
                    <h4 className="wl-card-title">{request.title}</h4>
                    <p className="wl-card-desc">{request.description}</p>
                  </div>

                  {/* Meta chips */}
                  <div className="wl-card-chips">
                    <span className="wl-meta-chip">
                      <Star size={12} stroke="var(--gold)" />
                      Trust {request.hostTrustScore}
                    </span>
                    {request.maxCompanions > 1 && (
                      <span className="wl-meta-chip">
                        <Users size={12} />
                        Up to {request.maxCompanions} others
                      </span>
                    )}
                    {request.tags.map((tag) => (
                      <span key={tag} className="wl-tag-chip">#{tag}</span>
                    ))}
                  </div>

                  {/* Action row */}
                  {isOwner ? (
                    <div className="wl-card-actions">
                      <Link className="wl-action-btn wl-action-primary" href={`/requests/${request.id}`}>
                        Open request
                      </Link>
                      <button
                        className="wl-action-btn wl-action-ghost wl-action-danger"
                        type="button"
                        disabled={preview || deleteBusyId === request.id}
                        onClick={() => void handleDelete(request.id)}
                      >
                        <Trash2 size={16} />
                        {deleteBusyId === request.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  ) : (
                    <div className="wl-card-actions">
                      <button
                        className={`wl-action-btn wl-action-primary ${isJoined ? "wl-action-sent" : ""}`}
                        type="button"
                        disabled={preview || isJoined}
                        onClick={() => {
                          if (isJoined) return;
                          setExpandedJoinId((c) => (c === request.id ? null : request.id));
                        }}
                      >
                        {preview ? "Sign in to join" : isJoined ? "Request sent ✓" : isExpanded ? "Cancel" : "Request to join"}
                      </button>
                    </div>
                  )}

                  {/* Join draft */}
                  {isExpanded && !isOwner && (
                    <div className="wl-join-draft">
                      <textarea
                        rows={2}
                        value={joinDrafts[request.id] ?? ""}
                        onChange={(e) =>
                          setJoinDrafts((c) => ({ ...c, [request.id]: e.target.value }))
                        }
                        placeholder="Add a short intro so they know why you're a fit…"
                        maxLength={220}
                        disabled={preview || joinBusyId === request.id}
                      />
                      <button
                        className="wl-join-send"
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
                                setJoinDrafts((c) => ({ ...c, [request.id]: "" }));
                                setExpandedJoinId(null);
                                setJoinedIds((c) => new Set(c).add(request.id));
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
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* ========= RIGHT RAIL ========= */}
      <aside className="wl-feed-rail">
        {/* Trust card */}
        <div className="wl-trust-card">
          <div className="wl-trust-deco" />
          <span className="wl-trust-label">Your trust</span>
          <div className="wl-trust-score">
            <strong>{viewerProfile.trustScore}</strong>
            <span>/100</span>
          </div>
          <p>Your score reflects completed sessions, mutual meet-again choices, issues, and reviewed reports.</p>
          <Link href="/profile" className="wl-trust-btn">View profile</Link>
        </div>

        {/* Safety note */}
        <div className="wl-rail-card">
          <div className="wl-rail-head">
            <ShieldCheck size={18} />
            <h3>Meet safely</h3>
          </div>
          <p>Keep first meetings public, agree on timing in chat, and contact local emergency services directly if you are in danger.</p>
          <Link href="/safety/reporting" className="wl-trust-btn">Safety guidance</Link>
        </div>
      </aside>
    </div>
  );
}
