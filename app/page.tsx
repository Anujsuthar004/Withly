import { ArrowRight, ShieldCheck, Sparkles, Waves } from "lucide-react";
import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/auth-panel";
import { SiteFooter } from "@/components/site-footer";
import { getLandingPageState } from "@/lib/supabase/queries";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { user, feed, hasSupabaseEnv } = await getLandingPageState();

  if (user) {
    redirect("/workspace");
  }

  return (
    <main className="marketing-page">
      <section className="hero-shell">
        <div className="hero-copy">
          <div className="eyebrow-row">
            <span className="eyebrow-pill">
              <ShieldCheck size={16} />
              Privacy-first rebuild
            </span>
            <span className="eyebrow-pill muted">
              <Waves size={16} />
              Next.js + Supabase
            </span>
          </div>

          <h1>
            Company for the moments you want to enjoy,
            <br />
            and the ones you would rather not do alone.
          </h1>
          <p>
            Tag Along now runs on managed auth, private RLS-protected sessions, and secure realtime chat. Public
            discovery stays minimal; participant identity and session details stay private.
          </p>

          <div className="bullet-grid">
            <article>
              <Sparkles size={18} />
              <strong>Managed identity</strong>
              <span>Email verification and OAuth move to Supabase Auth.</span>
            </article>
            <article>
              <ShieldCheck size={18} />
              <strong>Private by default</strong>
              <span>No public request history or matched participant IDs in the feed.</span>
            </article>
            <article>
              <ArrowRight size={18} />
              <strong>Realtime coordination</strong>
              <span>Session chat updates over managed realtime instead of a custom WebSocket server.</span>
            </article>
          </div>
        </div>

        <AuthPanel />
      </section>

      <section className="preview-section">
        <div className="section-title">
          <p className="kicker">Preview Feed</p>
          <h2>Only safe public fields are shown before sign-in.</h2>
          <p>
            {hasSupabaseEnv
              ? "This preview is sourced from the database via a sanitized RPC."
              : "Supabase keys are not configured yet, so this page is rendering a safe local preview."}
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
              <div className="request-meta">
                <span>{request.areaLabel}</span>
                <span>{formatDateTime(request.meetupAt)}</span>
                <span>{request.hostDisplayName}</span>
              </div>
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

      <SiteFooter />
    </main>
  );
}
