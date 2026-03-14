import { ArrowRight, ShieldCheck, Sparkles, Waves } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/auth-panel";
import { SiteFooter } from "@/components/site-footer";
import { normalizeNextPath } from "@/lib/navigation";
import { getLandingPageState } from "@/lib/supabase/queries";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const params = await searchParams;
  const { user, feed, feedError, hasSupabaseEnv } = await getLandingPageState();
  const nextPath = normalizeNextPath(params.next);

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="marketing-page">
      <section className="hero-shell">
        <div className="hero-copy">
          <div className="eyebrow-row">
            <span className="eyebrow-pill">
              <ShieldCheck size={16} />
              Private by default
            </span>
            <span className="eyebrow-pill muted">
              <Waves size={16} />
              Verified members
            </span>
          </div>

          <h1>
            Company for the moments you want to enjoy,
            <br />
            and the ones you would rather not do alone.
          </h1>
          <p>
            Find company for plans, errands, and in-between moments without sharing more than you need. Browse the
            basics first, then move into a private space once a plan is confirmed.
          </p>

          <div className="hero-action-row">
            <a className="primary-button compact" href="#open-requests">
              Browse open requests
            </a>
            <Link className="ghost-button compact" href="/safety/reporting">
              How safety works
            </Link>
          </div>

          <div className="bullet-grid">
            <article>
              <Sparkles size={18} />
              <strong>Verified profiles</strong>
              <span>Confirmed accounts help keep the community accountable and easier to trust.</span>
            </article>
            <article>
              <ShieldCheck size={18} />
              <strong>Private by default</strong>
              <span>Only the essentials are visible before sign-in so personal details stay protected.</span>
            </article>
            <article>
              <ArrowRight size={18} />
              <strong>Easy coordination</strong>
              <span>Once a plan is confirmed, you can keep messages and timing in one place.</span>
            </article>
          </div>
        </div>

        <AuthPanel nextPath={nextPath} />
      </section>

      {feedError ? (
        <section className="setup-banner" role="status" aria-live="polite">
          <p className="kicker">Open Requests</p>
          <h2>Open requests are temporarily unavailable.</h2>
          <p>{feedError}</p>
        </section>
      ) : null}

      {feed.length > 0 ? (
        <section className="preview-section" id="open-requests">
          <div className="section-title">
            <p className="kicker">Open Requests</p>
            <h2>A small public window into what is active right now.</h2>
            <p>
              {hasSupabaseEnv
                ? "Only the basic request details are shown before sign-in."
                : "A sample preview is showing right now while account services are offline."}
            </p>
          </div>

          <div className="preview-grid">
            {feed.map((request) => (
              <article key={request.id} className={`request-card lane-${request.lane}`}>
                <div className="request-card-top">
                  <div>
                    <span className="request-lane">{request.lane === "social" ? "Social" : "Errand"}</span>
                    <h3>{request.title}</h3>
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
