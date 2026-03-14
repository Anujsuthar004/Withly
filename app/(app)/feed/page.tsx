import Link from "next/link";

import { FeedList } from "@/components/app/feed-list";
import { WorkspacePageHeader } from "@/components/app/workspace-page-header";
import { getFeedPageState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { feed, feedError, hasSupabaseEnv, ownerRequestIds } = await getFeedPageState(24);
  const preview = !hasSupabaseEnv;

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        kicker="Feed"
        title="Find requests worth replying to."
        intro="Look through active plans, filter by mood or context, and respond quickly when a fit feels real."
        status={feedError || undefined}
        actions={
          <Link className="secondary-button compact" href="/requests/new">
            Create a request
          </Link>
        }
      />

      {feedError ? null : <FeedList feed={feed} preview={preview} ownerRequestIds={ownerRequestIds} />}
    </div>
  );
}
