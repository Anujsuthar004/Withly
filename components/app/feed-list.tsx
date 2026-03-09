"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Compass } from "lucide-react";

import type { FeedRequestCard } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";

export function FeedList({ feed }: { feed: FeedRequestCard[] }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filteredFeed = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return feed;

    return feed.filter((entry) => {
      const haystack = [entry.title, entry.description, entry.areaLabel, entry.hostDisplayName, entry.tags.join(" ")]
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
                <h4>
                  <Link href={`/requests/${request.id}`}>{request.title}</Link>
                </h4>
              </div>
              {request.verifiedOnly ? <span className="mini-chip">Verified only</span> : null}
            </div>

            <p className="request-description">{request.description}</p>

            <div className="request-meta">
              <span>{request.areaLabel}</span>
              <span>{formatDateTime(request.meetupAt)}</span>
              <span>{request.hostDisplayName}</span>
            </div>

            <div className="tag-row">
              {request.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                </span>
              ))}
            </div>

            <div className="button-row">
              <Link className="secondary-button compact" href={`/requests/${request.id}`}>
                View details
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

