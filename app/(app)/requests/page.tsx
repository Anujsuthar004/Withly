import Link from "next/link";

import { MyRequestsList } from "@/components/app/my-requests-list";
import { getMyRequestsPageState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function MyRequestsPage() {
  const { snapshot, preview, setupError } = await getMyRequestsPageState();

  return (
    <div className="workspace-page">
      <section className="section-title">
        <p className="kicker">My requests</p>
        <h2>Track what you’ve posted and who responded.</h2>
        <p>See what is live, who replied, and which plans are moving toward confirmation.</p>
        <div className="section-action-row">
          <Link className="secondary-button compact" href="/requests/new">
            Create a request
          </Link>
        </div>
      </section>
      {setupError && !preview ? (
        <section className="setup-banner" role="status" aria-live="polite">
          <p className="kicker">My requests</p>
          <p>{setupError}</p>
        </section>
      ) : (
        <MyRequestsList requests={snapshot.myRequests} />
      )}
    </div>
  );
}
