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
        <p>
          Need to post something new? <Link href="/requests/new">Create a request</Link>.
        </p>
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
