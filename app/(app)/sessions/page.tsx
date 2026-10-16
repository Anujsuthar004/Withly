import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, MessageCircleMore, ShieldCheck } from "lucide-react";
import { getWorkspaceSnapshot } from "@/lib/supabase/queries";
import { formatDateTime } from "@/lib/utils";
import styles from "@/app/sessions-design.module.css";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const { snapshot, setupError, preview } = await getWorkspaceSnapshot();
  const sessions = snapshot.myRequests.filter((request) => request.status === "matched");

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>LESS SOMEDAY. MORE SEE YOU THERE.</p>
          <h1>It’s a plan.<br /><span>Better with a +1.</span></h1>
          <p className={styles.intro}>Your confirmed plans, all in one place. Sort the details, say hello, and make a little time together.</p>
        </div>
        <div className={styles.planArt} aria-hidden="true"><span><CalendarDays size={34} /><small>YOUR PLAN</small></span><span>+1<small>GOOD COMPANY</small></span></div>
      </section>
      {preview ? <p className={styles.previewNote}>Preview sessions · These are example plans, not real bookings or people.</p> : setupError ? <p className={styles.notice} role="status">{setupError}</p> : null}
      <div className={styles.heading}>
        <h2>Ready to coordinate <span>{sessions.length}</span></h2>
        <Link href="/requests">All requests & history <ArrowUpRight size={15} /></Link>
      </div>
      <div className={styles.layout}>
        <div className={styles.cards}>
          {sessions.length === 0 ? (
            <section className={styles.empty}>
              <span className={styles.emptyIcon}><MessageCircleMore size={30} /></span>
              <h3>A little room for your next plan.</h3>
              <p>No active sessions yet. When a join request is accepted, the confirmed plan and its private chat will appear here.</p>
              <Link className={styles.primary} href="/feed">Find a plan <ArrowUpRight size={16} /></Link>
              <Link className={styles.textLink} href="/inbox">Review your replies</Link>
            </section>
          ) : sessions.map((session) => (
            <article key={session.id} className={styles.card} aria-label={`Session: ${session.title}`}>
              <div className={styles.cardTop}><span><i aria-hidden="true" /> Confirmed plan</span>{preview ? <small>EXAMPLE</small> : null}</div>
              <div className={styles.cardBody}>
                <div className={styles.companion}><span className={styles.avatar} aria-hidden="true">{session.partnerDisplayName?.trim().charAt(0).toUpperCase() || "+1"}</span><div><small>YOU’RE MEETING</small><strong>{session.partnerDisplayName || "Your companion"}</strong></div></div>
                <h3>{session.title}</h3>
                <dl className={styles.details}>
                  <div><dt><MapPin size={16} /> Area</dt><dd>{session.areaLabel || "Agree in chat"}</dd></div>
                  <div><dt><CalendarDays size={16} /> When</dt><dd>{formatDateTime(session.meetupAt)}</dd></div>
                </dl>
                <p className={styles.cardHint}>A quick hello goes a long way. Confirm your meeting point and timing in chat.</p>
                <div className={styles.actions}>
                  <Link className={styles.primary} href={`/sessions/${session.id}`}><MessageCircleMore size={16} /> Open chat <ArrowUpRight size={16} /></Link>
                  <Link className={styles.textLink} href={`/requests/${session.id}`}>View request</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        <aside className={styles.rail} aria-label="Before you meet">
          <section className={styles.guide}>
            <p className={styles.kicker}>THE LITTLE DETAILS MATTER</p>
            <h2>Before “on my way.”</h2>
            <ol><li><span>01</span><div><strong>Pick a public spot</strong><p>Agree on an easy-to-find landmark.</p></div></li><li><span>02</span><div><strong>Confirm the timing</strong><p>Share your ETA and any change of plans.</p></div></li><li><span>03</span><div><strong>Keep each other posted</strong><p>Use the check-ins in your session chat.</p></div></li></ol>
          </section>
          <section className={styles.safety}><ShieldCheck size={24} aria-hidden="true" /><h2>Good company. Clear boundaries.</h2><p>You decide what to share. Reporting and blocking remain available inside your session.</p><Link href="/safety/reporting">Safety & reporting <ArrowUpRight size={15} /></Link></section>
          <Link className={styles.newPlan} href="/requests/new">Have another plan in mind?<strong>Make room for a +1 <ArrowUpRight size={15} /></strong></Link>
        </aside>
      </div>
    </div>
  );
}
