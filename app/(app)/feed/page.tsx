import Link from "next/link";

import { FeedList } from "@/components/app/feed-list";
import { WorkspacePriorityBoard } from "@/components/app/workspace-priority-board";
import { WorkspacePageHeader } from "@/components/app/workspace-page-header";
import { getFeedPageState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { feed, feedError, ownerRequestIds, preview, snapshot } = await getFeedPageState(24);

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        kicker="Feed"
        title="Find requests worth replying to."
        intro="Start with what needs your attention, then browse active requests with sharper filters and calmer signals."
        status={feedError || undefined}
        meta={<span className="mini-chip">{feed.length} visible in feed</span>}
        actions={
          <Link className="primary-button compact" href="/requests/new">
            Create a request
          </Link>
        }
      />

      {!feedError ? <WorkspacePriorityBoard snapshot={snapshot} preview={preview} feedCount={feed.length} /> : null}
      {feedError ? null : <FeedList feed={feed} preview={preview} ownerRequestIds={ownerRequestIds} />}
    </div>
  );
}
