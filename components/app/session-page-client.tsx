"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin, ShieldCheck } from "lucide-react";

import { SessionPanel } from "@/components/app/session-panel";
import type { WorkspaceSession } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";
import styles from "@/app/sessions-design.module.css";
import chatStyles from "@/app/inbox-design.module.css";

export function SessionPageClient({
  session,
  currentUserId,
  preview = false,
}: {
  session: WorkspaceSession;
  currentUserId: string;
  preview?: boolean;
}) {
  const [status, setStatus] = useState("");

  return (
    <div className={`${chatStyles.page} ${styles.page}`}>
      <Link className={styles.back} href="/sessions"><ArrowLeft size={15} /> All sessions</Link>
      <section className={styles.sessionIntro}>
        <p className={styles.kicker}>YOUR SHARED PLAN</p>
        <h1>{session.requestTitle}</h1>
        <p>With {session.partnerDisplayName || "your companion"}. A little coordination, then you’re good to go.</p>
        <div className={styles.sessionMeta}><span><MapPin size={16} /> {session.areaLabel || "Agree in chat"}</span><span><CalendarDays size={16} /> {formatDateTime(session.meetupAt)}</span><Link href={`/requests/${session.requestId}`}>View request <ArrowUpRight size={15} /></Link></div>
      </section>
      {preview ? <p className={styles.previewNote}>Example session · Displayed with sample data.</p> : null}
      {status ? <div className={styles.notice} role="status">{status}</div> : null}
      <div className={styles.sessionLayout}>
        <section className={styles.conversation} aria-label="Session chat and controls">
          <SessionPanel session={session} currentUserId={currentUserId} onStatus={setStatus} />
        </section>
        <aside className={styles.rail} aria-label="Session reminders">
          <section className={styles.guide}><p className={styles.kicker}>A QUICK CHECK BEFORE YOU GO</p><h2>Same place.<br />Same plan.</h2><ul className={styles.reminders}><li>Confirm the exact public meeting point.</li><li>Agree on the time and share your ETA.</li><li>Let your companion know if plans change.</li></ul></section>
          <section className={styles.safety}><ShieldCheck size={24} aria-hidden="true" /><h2>Check in. Look out.</h2><p>Use “I’m OK” to check in. SOS sends an in-app alert to your companion; it does not contact emergency services.</p><Link href="/safety/reporting">Safety & reporting <ArrowUpRight size={15} /></Link></section>
          <p className={styles.finishNote}>After you meet, both people submit session feedback to close the plan. You’ll find feedback and reporting below the chat.</p>
        </aside>
      </div>
    </div>
  );
}
