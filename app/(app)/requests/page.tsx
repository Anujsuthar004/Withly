import Link from "next/link";

import { MyRequestsList } from "@/components/app/my-requests-list";
import { WorkspacePageHeader } from "@/components/app/workspace-page-header";
import { getMyRequestsPageState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function MyRequestsPage() {
  const { snapshot, preview, setupError } = await getMyRequestsPageState();

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        kicker="My requests"
        title="Track the plans you already put into motion."
        intro="See which requests are still open, which ones drew replies, and which conversations are moving toward a match."
        status={setupError && !preview ? setupError : undefined}
        actions={
          <Link className="secondary-button compact" href="/requests/new">
            Create a request
          </Link>
        }
      />
      {setupError && !preview ? null : <MyRequestsList requests={snapshot.myRequests} />}
    </div>
  );
}
