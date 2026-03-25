import Link from "next/link";

import { FeedList } from "@/components/app/feed-list";
import { getFeedPageState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { feed, feedError, ownerRequestIds, preview, snapshot } = await getFeedPageState(24);

  return (
    <div className="sanctuary-page sanctuary-feed-page">
      <section className="sanctuary-page-intro">
        <div>
          <p className="sanctuary-kicker">Curation Hub</p>
          <h1>Find requests worth replying to.</h1>
          <p>
            A calmer feed of requests looking for steady company, practical help, and clear plans.
          </p>
        </div>
        <div className="sanctuary-page-actions">
          {snapshot.activeSession ? <span className="sanctuary-chip">1 live plan</span> : null}
          <span className="sanctuary-chip">{feed.length} open requests</span>
          <Link className="withly-create-button subtle" href="/requests/new">
            Create Request
          </Link>
        </div>
      </section>

      {feedError ? (
        <section className="withly-status-banner" role="status" aria-live="polite">
          {feedError}
        </section>
      ) : (
        <FeedList
          feed={feed}
          preview={preview}
          ownerRequestIds={ownerRequestIds}
          activeSessionRequestId={snapshot.activeSession?.requestId ?? null}
        />
      )}
    </div>
  );
}
