import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicPageShell } from "@/components/public-page-shell";
import styles from "@/app/public-design.module.css";
import { getPublicRequestDetail } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function ExploreRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { request, requestError } = await getPublicRequestDetail(id);

  if (!request && !requestError) {
    notFound();
  }

  if (!request) {
    return (
      <PublicPageShell><div className={styles.page}>
        <section className="setup-banner" role="status" aria-live="polite">
          <p className="kicker">Request</p>
          <h1>Request details are temporarily unavailable.</h1>
          <p>{requestError}</p>
        </section>

        <Link className="ghost-button" href="/explore">Back to explore</Link>
      </div></PublicPageShell>
    );
  }

  return (
    <PublicPageShell><div className={styles.page}>
      <section className="section-title">
        <p className="kicker">Request</p>
        <h1>{request.title}</h1>
        <p>Exact meetup details stay private until both people decide to continue.</p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="kicker">Public preview</p>
            <h2>What’s shared before sign-in</h2>
          </div>
        </div>

        <p className="request-description">{request.description}</p>
        <div className="tag-row">
          {request.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              {tag}
            </span>
          ))}
        </div>

        <div className="button-row request-detail-actions">
          <Link className="primary-button" href={`/?next=${encodeURIComponent(`/requests/${request.id}`)}#join`}>
            Sign in to request to join
          </Link>
          <Link className="ghost-button" href="/explore">
            Back to explore
          </Link>
        </div>
      </section>

      </div></PublicPageShell>
  );
}
