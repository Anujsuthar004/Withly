import { notFound } from "next/navigation";
import Link from "next/link";
import styles from "@/app/requests-design.module.css";

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
      <div className={styles.page}>
        <Link className={styles.back} href="/requests">Back to your requests</Link>
        <section className={styles.empty}>
          <h1>We couldn’t load this plan.</h1>
          <p role="status">{publicRequest.requestError}</p>
          <Link className={styles.secondary} href="/feed">Browse other requests</Link>
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

  const joinReviews = workspace.snapshot.incomingJoinRequests.filter((entry) => entry.requestId === id);

  return (
    <RequestDetailPage
      detail={detail}
      preview={workspace.preview}
      myRequest={myRequest}
      joinReviews={joinReviews}
      unavailableMessage={workspace.setupError || undefined}
    />
  );
}
