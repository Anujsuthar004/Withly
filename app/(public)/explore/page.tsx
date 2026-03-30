import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { getExplorePageState } from "@/lib/supabase/queries";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const { feed, feedError, isSampleFeed } = await getExplorePageState(18);

  return (
    <main className="marketing-page">
      <section className="section-title">
        <p className="kicker">Explore</p>
        {isSampleFeed ? (
          <>
            <h2>Here is what the feed looks like.</h2>
            <p>No active requests right now — these are samples. Sign up to be among the first to post.</p>
          </>
        ) : (
          <>
            <h2>Browse open requests before you sign in.</h2>
            <p>You can browse the public basics here, then step into your private feed when you want to respond or post.</p>
          </>
        )}
        <div className="section-action-row">
          <Link className="primary-button compact" href="/?next=%2Ffeed">
            Sign in to respond
          </Link>
          <Link className="ghost-button compact" href="/">
            Back home
          </Link>
        </div>
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
                {!isSampleFeed ? (
                  <div className="button-row card-action-row">
                    <Link className="ghost-button compact" href={`/explore/requests/${request.id}`}>
                      View details
                    </Link>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <SiteFooter />
    </main>
  );
}
