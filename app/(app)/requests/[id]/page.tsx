import { notFound } from "next/navigation";

import { RequestDetailPage } from "@/components/app/pages/request-detail-page";
import { getPublicRequestDetail, getWorkspaceSnapshot } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function RequestDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [publicRequest, workspace] = await Promise.all([getPublicRequestDetail(id), getWorkspaceSnapshot()]);

  const feedCard = publicRequest.request;
  const myRequest = workspace.snapshot.myRequests.find((entry) => entry.id === id) ?? null;

  if (!feedCard && !myRequest && !publicRequest.requestError) {
    notFound();
  }

  if (!feedCard && !myRequest) {
    return (
      <div className="workspace-page">
        <section className="workspace-hero-actions" style={{ padding: 0, background: "transparent", border: 0, boxShadow: "none" }}>
          <div className="setup-banner" role="status" aria-live="polite">
            <p className="kicker">Request</p>
            <p>{publicRequest.requestError}</p>
          </div>
        </section>
      </div>
    );
  }

  const detail = {
    id,
    lane: (myRequest?.lane ?? feedCard?.lane ?? "social") as "social" | "errand",
    title: myRequest?.title ?? feedCard?.title ?? "Request",
    description: feedCard?.description,
    areaLabel: myRequest?.areaLabel ?? feedCard?.areaLabel ?? null,
    meetupAt: myRequest?.meetupAt ?? feedCard?.meetupAt ?? null,
    verifiedOnly: myRequest?.verifiedOnly ?? feedCard?.verifiedOnly ?? true,
    hostDisplayName: feedCard?.hostDisplayName,
    tags: feedCard?.tags,
  };

  const isOwner = Boolean(myRequest);
  const joinReviews = workspace.snapshot.incomingJoinRequests.filter((entry) => entry.requestId === id);

  return (
    <RequestDetailPage
      detail={detail}
      preview={workspace.preview}
      isOwner={isOwner}
      myRequest={myRequest}
      joinReviews={joinReviews}
      unavailableMessage={workspace.setupError || undefined}
    />
  );
}
