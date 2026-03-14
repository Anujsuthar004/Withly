import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { getExplorePageState } from "@/lib/supabase/queries";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const { feed, feedError } = await getExplorePageState(18);

  return (
    <main className="marketing-page">
      <section className="section-title">
        <p className="kicker">Explore</p>
        <h2>Browse open requests before you sign in.</h2>
        <p>
          You can read the basics publicly. To request to join or post your own plan,{" "}
          <Link href="/?next=%2Ffeed">sign in</Link>.
        </p>
      </section>

      {feedError ? (
        <section className="setup-banner" role="status" aria-live="polite">
          <p className="kicker">Explore</p>
          <h2>Requests are temporarily unavailable.</h2>
          <p>{feedError}</p>
        </section>
      ) : null}

      {feed.length > 0 ? (
        <section className="preview-section">
          <div className="preview-grid">
            {feed.map((request) => (
              <article key={request.id} className={`request-card lane-${request.lane}`}>
                <div className="request-card-top">
                  <div>
                    <span className="request-lane">{request.lane === "social" ? "Social" : "Errand"}</span>
                    <h3>
                      <Link href={`/explore/requests/${request.id}`}>{request.title}</Link>
                    </h3>
                  </div>
                  {request.verifiedOnly ? <span className="mini-chip">Verified only</span> : null}
                </div>
                <p className="request-description">{request.description}</p>
                {request.areaLabel || request.meetupAt || request.hostDisplayName ? (
                  <div className="request-meta">
                    {request.areaLabel ? <span>{request.areaLabel}</span> : null}
                    {request.meetupAt ? <span>{formatDateTime(request.meetupAt)}</span> : null}
                    {request.hostDisplayName ? <span>{request.hostDisplayName}</span> : null}
                  </div>
                ) : (
                  <p className="request-privacy-note">Exact meetup details are shared privately after both people are aligned.</p>
                )}
                <div className="tag-row">
                  {request.tags.map((tag) => (
                    <span key={tag} className="tag-chip">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <SiteFooter />
    </main>
  );
}
