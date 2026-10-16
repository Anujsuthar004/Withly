import { ArrowDown, ArrowRight, BookOpen, Check, Coffee, Headphones, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/auth-panel";
import { SiteFooter } from "@/components/site-footer";
import { WithlyWorld } from "@/components/withly-world";
import { normalizeNextPath } from "@/lib/navigation";
import { getLandingPageState } from "@/lib/supabase/queries";
import { formatDateTime } from "@/lib/utils";
import styles from "./landing.module.css";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const params = await searchParams;
  const { user, feed, feedError, isSampleFeed } = await getLandingPageState();
  const nextPath = normalizeNextPath(params.next);
  if (user) redirect(nextPath);

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="Withly home">
            <span><Image src="/withly-logo.svg" alt="" width={30} height={30} /></span>
            withly<span className={styles.brandDot}>.</span>
          </Link>
          <nav className={styles.nav} aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <Link href="/safety/reporting">Stay safe</Link>
          </nav>
          <a href="#join" className={styles.navButton}>Let’s go <ArrowRight size={17} /></a>
        </header>

        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}><span className={styles.pairMark} aria-hidden="true" /> LESS SOLO. MORE WITHLY.</span>
            <h1 id="hero-title">Your everyday.<br />With a <span className={styles.headlinePlus}>+1.</span></h1>
            <p>Your next focus sprint, study session, or coffee break doesn’t have to be a solo mission. Find someone nearby and make a plan.</p>
            <div className={styles.actions}>
              <a className={styles.primary} href="#open-requests">Find your next session <ArrowRight size={19} /></a>
              <a className={styles.textLink} href="#how-it-works">How does it work? <ArrowDown size={16} /></a>
            </div>
            <div className={styles.heroNotes}><span><Check size={16} /> Real-world meetups</span><span><Check size={16} /> Zero dating pressure</span></div>
          </div>

          <WithlyWorld />
        </section>

        <div className={styles.activityStrip} aria-label="Ways to meet">
          <span><Headphones size={20} /> Find your focus</span><span className={styles.pairMark} aria-hidden="true" />
          <span><BookOpen size={20} /> Study together</span><span className={styles.pairMark} aria-hidden="true" />
          <span><Coffee size={20} /> Make time for coffee</span><span className={styles.pairMark} aria-hidden="true" />
          <span><MessageCircle size={20} /> Meet someone new</span>
        </div>

        <section className={styles.sessions} id="open-requests" aria-labelledby="sessions-title">
          <div className={styles.sectionHead}>
            <div><p className={styles.kicker}>PICK YOUR NEXT PLAN</p><h2 id="sessions-title">Small plans. <span>Good possibilities.</span></h2></div>
            <span className={styles.count}>{isSampleFeed ? "Example sessions" : `${feed.length} open ${feed.length === 1 ? "session" : "sessions"}`}</span>
          </div>
          <p className={styles.sectionDescription}>{isSampleFeed ? "A peek at the kind of plans you can make. These are examples, not live sessions." : "Explore public session previews. Sign in to request to join and coordinate privately."}</p>
          {feedError ? <p className={styles.notice} role="status">Open requests are temporarily unavailable. {feedError}</p> : null}
          {!feedError && !isSampleFeed && feed.length === 0 ? <p className={styles.notice}>No open sessions right now. Sign in and be the first to make a plan.</p> : null}
          <div className={styles.sessionGrid}>
            {feed.map((request) => (
              <article key={request.id} className={`${styles.sessionCard} ${request.lane === "social" ? "" : styles.coffeeSession}`}>
                <div className={styles.sessionTop}><span className={styles.sessionIcon}>{request.lane === "social" ? <Headphones size={23} /> : <Coffee size={23} />}</span><span>{request.lane === "social" ? "Coworking & Focus" : "Coffee Walk"}</span>{isSampleFeed ? <small>EXAMPLE</small> : null}</div>
                <h3>{request.title}</h3><p>{request.description}</p>
                <div className={styles.tags}>{request.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                {request.areaLabel || request.meetupAt || request.hostDisplayName ? <div className={styles.meta}>
                  {request.areaLabel ? <span><MapPin size={14} /> {request.areaLabel}</span> : null}
                  {request.meetupAt ? <span>{formatDateTime(request.meetupAt)}</span> : null}
                  {request.hostDisplayName ? <span>{request.hostDisplayName}</span> : null}
                </div> : <p className={styles.privacyNote}>Exact meetup details are shared privately after both people agree.</p>}
                {request.verifiedOnly ? <span className={styles.verified}><ShieldCheck size={14} /> Email-confirmed replies only</span> : null}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.how} id="how-it-works" aria-labelledby="how-title">
          <div className={styles.sectionHead}><div><p className={styles.kicker}>NO GRAND PLANS REQUIRED</p><h2 id="how-title">From “maybe” to <span>“see you there.”</span></h2></div></div>
          <ol className={styles.steps}>
            <li><span className={styles.stepNumber}>01</span><h3>Find your kind of plan.</h3><p>Browse a focus session or coffee walk. Nothing nearby? Post your own.</p></li>
            <li><span className={styles.stepNumber}>02</span><h3>Say hey. Get aligned.</h3><p>Request to join. Once the host approves, work out the details in a private chat.</p></li>
            <li><span className={styles.stepNumber}>03</span><h3>Show up. Do your thing.</h3><p>Meet in a public space, check in, and enjoy a little company along the way.</p></li>
          </ol>
        </section>

        <section className={styles.join} id="join" aria-label="Join Withly">
          <div className={styles.joinCopy}><span className={styles.joinIcon}><span className={styles.pairMark} aria-hidden="true" /></span><p className={styles.kicker}>YOUR NEXT CHAPTER STARTS SMALL</p><h2>Same to-do list.<br /><span>New +1.</span></h2><p>Make room for a little company. Your first plan starts here.</p>
            <div className={styles.safetyNote}><ShieldCheck size={23} /><div><h3>Fun plans. Thoughtful boundaries.</h3><p>Meet in public. Keep personal details private. Block or report when you need to. Email confirmation isn’t identity or venue verification.</p><Link href="/safety/reporting">How safety works <ArrowRight size={15} /></Link></div></div>
          </div>
          <AuthPanel nextPath={nextPath} />
        </section>
        <SiteFooter />
      </div>
    </main>
  );
}
