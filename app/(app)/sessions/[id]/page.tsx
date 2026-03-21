import Link from "next/link";

import { SessionPageClient } from "@/components/app/session-page-client";
import { getInboxPageState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function SessionRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let snapshot;
  try {
    const state = await getInboxPageState();
    snapshot = state.snapshot;
  } catch {
    return (
      <div className="workspace-page">
        <section className="panel">
          <p className="kicker">Session</p>
          <h3>Session unavailable</h3>
          <p>Could not load session data. Please try again.</p>
          <Link className="primary-button compact" href="/inbox" style={{ marginTop: "1rem" }}>Go to inbox</Link>
        </section>
      </div>
    );
  }

  if (!snapshot.activeSession || snapshot.activeSession.requestId !== id) {
    return (
      <div className="workspace-page">
        <section className="panel">
          <p className="kicker">Session</p>
          <h3>No active session for this request</h3>
          <p>This session may not have started yet, or it has ended. Check your inbox for the latest status.</p>
          <Link className="primary-button compact" href="/inbox" style={{ marginTop: "1rem" }}>Go to inbox</Link>
        </section>
      </div>
    );
  }

  return <SessionPageClient session={snapshot.activeSession} currentUserId={snapshot.profile.id} />;
}

