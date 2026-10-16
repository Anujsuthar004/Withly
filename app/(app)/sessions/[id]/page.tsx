import Link from "next/link";

import { SessionPageClient } from "@/components/app/session-page-client";
import { getSessionPageState } from "@/lib/supabase/queries";
import { hasSupabaseEnv, isProduction } from "@/lib/env";
import styles from "@/app/sessions-design.module.css";

export const dynamic = "force-dynamic";

export default async function SessionRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let state;
  try {
    state = await getSessionPageState(id);
  } catch {
    return (
      <div className={styles.page}>
        <section className={styles.empty}>
          <p className={styles.kicker}>Session</p>
          <h1>Session unavailable</h1>
          <p>Could not load session data. Please try again.</p>
          <Link className={styles.primary} href="/inbox">Go to inbox</Link>
        </section>
      </div>
    );
  }

  if (!state.session) {
    return (
      <div className={styles.page}>
        <section className={styles.empty}>
          <p className={styles.kicker}>Session</p>
          <h1>No active session for this request</h1>
          <p>This session may not have started yet, or it has ended. Check your inbox for the latest status.</p>
          <Link className={styles.primary} href="/inbox">Go to inbox</Link>
        </section>
      </div>
    );
  }

  return <SessionPageClient session={state.session} currentUserId={state.currentUserId} preview={!hasSupabaseEnv && !isProduction} />;
}
