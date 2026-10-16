"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, MessageCircleMore, ShieldCheck, UsersRound } from "lucide-react";
import { JoinReviewPanel } from "@/components/app/join-review-panel";
import { SessionPanel } from "@/components/app/session-panel";
import type { WorkspaceSnapshot } from "@/lib/supabase/types";
import styles from "@/app/inbox-design.module.css";

export function InboxPage({ snapshot, preview, initialStatus }: {
  snapshot: WorkspaceSnapshot;
  preview: boolean;
  initialStatus?: string;
}) {
  const [status, setStatus] = useState(initialStatus ?? "");
  const hasSession = Boolean(snapshot.activeSession);
  const pendingCount = snapshot.incomingJoinRequests.length;

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="inbox-title">
        <div>
          <p className={styles.kicker}>GOOD COMPANY STARTS WITH HELLO.</p>
          <h1 id="inbox-title">A little hello.<br /><span>A possible +1.</span></h1>
          <p className={styles.intro}>Meet the people behind the replies. Find your fit, then make a plan together.</p>
        </div>
        <div className={styles.helloArt} aria-hidden="true">
          <span className={styles.youBubble}>Hey, you.</span>
          <span className={styles.plusBubble}>Hey, +1!</span>
          <span className={styles.artCaption}>Two people. One little plan.</span>
        </div>
      </section>
      {preview ? <p className={styles.previewNote}>Preview inbox · These are example introductions and a sample chat. Replies and session actions are disabled.</p> : null}
      {!preview && status ? <div className={styles.notice} role="status">{status}</div> : null}
      <nav className={styles.shortcuts} aria-label="Inbox sections">
        <Link href="#join-review" className={styles.shortcut}>
          <span className={styles.shortcutIcon}><UsersRound size={21} /></span>
          <span><strong>{pendingCount} {pendingCount === 1 ? "introduction" : "introductions"}</strong><small>{pendingCount ? "Waiting for your review" : "All caught up for now"}</small></span>
          <ArrowDown size={18} aria-hidden="true" />
        </Link>
        <Link href="#active-session" className={`${styles.shortcut} ${styles.chatShortcut}`}>
          <span className={styles.shortcutIcon}><MessageCircleMore size={21} /></span>
          <span><strong>{hasSession ? "Your current chat" : "Your next conversation"}</strong><small>{hasSession ? `With ${snapshot.activeSession?.partnerDisplayName || "your companion"}` : "Opens after a match"}</small></span>
          <ArrowDown size={18} aria-hidden="true" />
        </Link>
      </nav>
      <div className={styles.layout}>
        <div className={styles.main}>
          <section id="join-review" className={styles.section} aria-label="Introductions">
            <JoinReviewPanel entries={snapshot.incomingJoinRequests} preview={preview} onStatus={setStatus} />
          </section>
          <section id="active-session" className={styles.section} aria-labelledby="conversation-title">
            <div className={styles.sectionHeading}><h2 id="conversation-title">Your conversation</h2><span>{preview ? "SAMPLE CHAT" : hasSession ? "CONFIRMED PLAN" : "ROOM FOR A +1"}</span></div>
            {snapshot.activeSession ? (
              <fieldset className={styles.session} disabled={preview} aria-label={preview ? "Sample session (read only)" : "Current session"}>
                <SessionPanel session={snapshot.activeSession} currentUserId={snapshot.profile.id} onStatus={setStatus} />
              </fieldset>
            ) : (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}><MessageCircleMore size={28} /></span>
                <h3>A shared plan. A shared chat.</h3>
                <p>Once a join request is accepted, your private conversation will appear here. Agree on a public meeting point and a time that works for both of you.</p>
                <Link href="/feed">Find a plan <ArrowUpRight size={16} /></Link>
              </div>
            )}
          </section>
        </div>
        <aside className={styles.rail} aria-label="Making a plan together">
          <section className={styles.guide}>
            <span className={styles.pair} aria-hidden="true"><i /><i /></span>
            <h2>From hello to<br />“see you there.”</h2>
            <ol>
              <li><span>01</span><div><strong>Find your fit</strong><p>Read their introduction. There’s no pressure to accept.</p></div></li>
              <li><span>02</span><div><strong>Make it a plan</strong><p>Accept a reply to open your private session chat.</p></div></li>
              <li><span>03</span><div><strong>Sort the little details</strong><p>Agree on the time, public meeting point, and check-ins.</p></div></li>
            </ol>
          </section>
          <section className={styles.safety}>
            <ShieldCheck size={23} aria-hidden="true" />
            <h2>Your comfort comes first.</h2>
            <p>Keep personal contact details private. You can report a concern or block a companion whenever you need to.</p>
            <Link href="/safety/reporting">Safety & reporting <ArrowUpRight size={15} /></Link>
          </section>
          <Link className={styles.newPlan} href="/requests/new">Another idea in mind? <strong>Post a plan <ArrowUpRight size={15} /></strong></Link>
        </aside>
      </div>
    </div>
  );
}
