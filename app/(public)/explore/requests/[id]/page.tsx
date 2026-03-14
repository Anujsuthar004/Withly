import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
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
      <main className="marketing-page">
        <section className="setup-banner" role="status" aria-live="polite">
          <p className="kicker">Request</p>
          <h2>Request details are temporarily unavailable.</h2>
          <p>{requestError}</p>
        </section>

        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="marketing-page">
      <section className="section-title">
        <p className="kicker">Request</p>
        <h2>{request.title}</h2>
        <p>Exact meetup details stay private until both people decide to continue.</p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="kicker">Public preview</p>
            <h3>What’s shared before sign-in</h3>
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
          <Link className="primary-button" href={`/?next=${encodeURIComponent(`/requests/${request.id}`)}`}>
            Sign in to request to join
          </Link>
          <Link className="ghost-button" href="/explore">
            Back to explore
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
