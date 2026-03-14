import Link from "next/link";

import { FeedList } from "@/components/app/feed-list";
import { StatusBadge } from "@/components/app/status-badge";
import { getFeedPageState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { feed, feedError, hasSupabaseEnv } = await getFeedPageState(24);
  const preview = !hasSupabaseEnv;

  return (
    <div className="workspace-page">
      {feedError ? (
        <section className="workspace-hero-actions" style={{ padding: 0, background: "transparent", border: 0, boxShadow: "none" }}>
          <StatusBadge message={feedError} />
        </section>
      ) : null}

      <section className="section-title">
        <p className="kicker">Feed</p>
        <h2>Browse requests and open the ones you can support.</h2>
        <p>
          Want to post instead? <Link href="/requests/new">Create a request</Link>.
        </p>
      </section>

      {feedError ? null : <FeedList feed={feed} preview={preview} />}
    </div>
  );
}
