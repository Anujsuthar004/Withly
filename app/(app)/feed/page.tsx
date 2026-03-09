import Link from "next/link";

import { FeedList } from "@/components/app/feed-list";
import { getFeedPageState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { feed } = await getFeedPageState(24);

  return (
    <div className="workspace-page">
      <section className="section-title">
        <p className="kicker">Feed</p>
        <h2>Browse requests and open the ones you can support.</h2>
        <p>
          Want to post instead? <Link href="/requests/new">Create a request</Link>.
        </p>
      </section>

      <FeedList feed={feed} />
    </div>
  );
}

