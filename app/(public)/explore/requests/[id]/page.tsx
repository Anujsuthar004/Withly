import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { getLandingFeed } from "@/lib/supabase/queries";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExploreRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const feed = await getLandingFeed(60);
  const request = feed.find((entry) => entry.id === id);

  if (!request) {
    notFound();
  }

  return (
    <main className="marketing-page">
      <section className="section-title">
        <p className="kicker">Request</p>
        <h2>{request.title}</h2>
        <p>
          {request.areaLabel} · {formatDateTime(request.meetupAt)} · Hosted by {request.hostDisplayName}
        </p>
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

        <div className="button-row" style={{ marginTop: 18 }}>
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

