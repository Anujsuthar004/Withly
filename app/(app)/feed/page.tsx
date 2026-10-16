import Link from "next/link";
import { ArrowUpRight, Coffee, Headphones } from "lucide-react";
import styles from "@/app/feed-design.module.css";

import { FeedList } from "@/components/app/feed-list";
import { getFeedPageState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { feed, feedError, ownerRequestIds, preview, snapshot } = await getFeedPageState(24);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>A LITTLE COMPANY. A BETTER DAY.</p>
          <h1>Find your next <span>+1.</span></h1>
          <p className={styles.intro}>A focus sprint. A coffee break. Your everyday plans, with someone alongside.</p>
          <Link className={styles.create} href="/requests/new">Create Request <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <div className={styles.focusDisc}><Headphones size={35} strokeWidth={1.6} /><span>YOUR THING</span></div>
          <div className={styles.coffeeDisc}><Coffee size={35} strokeWidth={1.6} /><span>GOOD COMPANY</span></div>
          <span className={styles.together}>Better, together.</span>
        </div>
      </section>
      <div className={styles.feedHeading}>
        <h2><span className={styles.pairMark} aria-hidden="true" />The company board</h2>
        <span>{preview ? "Example requests" : `${feed.length} open requests`}</span>
        {snapshot.activeSession && !preview ? <Link href={`/sessions/${snapshot.activeSession.requestId}`}>Your active session →</Link> : null}
      </div>
      {preview ? <p className={styles.previewNote}>You’re exploring a preview. These are example plans, not live meetups.</p> : null}

      {feedError ? (
        <section className="withly-status-banner" role="status" aria-live="polite">
          {feedError}
        </section>
      ) : (
        <FeedList feed={feed} preview={preview} ownerRequestIds={ownerRequestIds} viewerProfile={snapshot.profile} />
      )}
    </div>
  );
}
