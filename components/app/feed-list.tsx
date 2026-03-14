"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Compass, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import { submitJoinRequestAction } from "@/app/workspace/actions";
import type { FeedRequestCard } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";

export function FeedList({
  feed,
  preview = false,
  onStatus,
}: {
  feed: FeedRequestCard[];
  preview?: boolean;
  onStatus?: (message: string) => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [joinDrafts, setJoinDrafts] = useState<Record<string, string>>({});
  const [joinBusyId, setJoinBusyId] = useState<string | null>(null);
  const [expandedJoinId, setExpandedJoinId] = useState<string | null>(null);

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

  return (
    <section className="panel feed-panel">
      <div className="panel-heading">
        <div>
          <p className="kicker">Discovery Feed</p>
          <h3>Discover requests nearby.</h3>
        </div>
        <span className="status-dot">
          <Compass size={16} />
          {filteredFeed.length} live requests
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

      <div className="feed-list">
        {filteredFeed.length === 0 ? (
          <div className="empty-card">No matching requests. Try a broader search.</div>
        ) : null}

        {filteredFeed.map((request) => (
          <article key={request.id} className={`request-card lane-${request.lane}`}>
            <div className="request-card-top">
              <div>
                <span className="request-lane">{request.lane === "social" ? "Social" : "Errand"}</span>
                <h4>{request.title}</h4>
              </div>
              {request.verifiedOnly ? (
                <span className="mini-chip">
                  <ShieldAlert size={14} />
                  Verified only
                </span>
              ) : null}
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

            {expandedJoinId === request.id ? (
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
