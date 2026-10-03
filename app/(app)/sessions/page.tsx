import Link from "next/link";

import { getWorkspaceSnapshot } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const { snapshot, setupError } = await getWorkspaceSnapshot();
  const sessions = snapshot.myRequests.filter((request) => request.status === "matched");

  return (
    <div className="workspace-page">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="kicker">Sessions</p>
            <h1>Your confirmed plans.</h1>
            <p>Open a session to coordinate with your companion.</p>
          </div>
        </div>
        {setupError ? <p role="status">{setupError}</p> : null}
        {sessions.length === 0 ? <p className="empty-card">No active sessions yet.</p> : (
          <div className="action-stack">
            {sessions.map((session) => (
              <Link className="inbox-queue-card" key={session.id} href={`/sessions/${session.id}`}>
                <strong>{session.title}</strong>
                <span>{session.partnerDisplayName || "Companion"}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
