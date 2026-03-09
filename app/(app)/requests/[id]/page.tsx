import { notFound } from "next/navigation";

import { RequestDetailPage } from "@/components/app/pages/request-detail-page";
import { getLandingFeed, getWorkspaceSnapshot } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function RequestDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [feed, workspace] = await Promise.all([getLandingFeed(60), getWorkspaceSnapshot()]);

  const feedCard = feed.find((entry) => entry.id === id) ?? null;
  const myRequest = workspace.snapshot.myRequests.find((entry) => entry.id === id) ?? null;

  if (!feedCard && !myRequest) {
    notFound();
  }

  const detail = {
    id,
    lane: (myRequest?.lane ?? feedCard?.lane ?? "social") as "social" | "errand",
    title: myRequest?.title ?? feedCard?.title ?? "Request",
    description: feedCard?.description,
    areaLabel: myRequest?.areaLabel ?? feedCard?.areaLabel ?? "",
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
    />
  );
}

