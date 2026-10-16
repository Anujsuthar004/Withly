"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin, MessageCircleMore, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteRequestAction, hideThreadAction, submitJoinRequestAction } from "@/app/workspace/actions";
import { JoinReviewPanel } from "@/components/app/join-review-panel";
import { SessionControls } from "@/components/app/session-controls";
import type { WorkspaceJoinReview, WorkspaceRequest } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";
import styles from "@/app/requests-design.module.css";
import shared from "@/app/inbox-design.module.css";

type RequestDetail = {
  id: string; lane: "social" | "errand"; title: string; description?: string;
  areaLabel: string | null; meetupAt: string | null; verifiedOnly: boolean;
  hostDisplayName?: string | null; tags?: string[];
};

export function RequestDetailPage({ detail, preview, myRequest, joinReviews, unavailableMessage = "" }: {
  detail: RequestDetail; preview: boolean; myRequest: WorkspaceRequest | null;
  joinReviews: WorkspaceJoinReview[]; unavailableMessage?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [intro, setIntro] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleJoin() {
    if (preview || isJoining) return;
    setIsJoining(true);
    try {
      const result = await submitJoinRequestAction({ requestId: detail.id, introMessage: intro });
      setStatus(result.message);
      if (result.ok) { setIntro(""); router.refresh(); }
    } catch { setStatus("Could not send your introduction. Please try again."); }
    finally { setIsJoining(false); }
  }

  async function handleDelete() {
    if (preview || isDeleting || !myRequest) return;
    const deletingChat = myRequest.status !== "open";
    if (!confirm(deletingChat
      ? "Delete this chat from your history? It disappears for you, but stays for the other participant."
      : "Are you sure you want to delete this request? This action cannot be undone.")) return;
    setIsDeleting(true);
    try {
      const result = deletingChat ? await hideThreadAction({ requestId: detail.id }) : await deleteRequestAction({ requestId: detail.id });
      setStatus(result.message);
      if (result.ok) { router.push("/requests"); router.refresh(); }
    } catch { setStatus("Could not remove this item. Please try again."); }
    finally { setIsDeleting(false); }
  }

  return (
    <div className={`${shared.page} ${styles.page}`}>
      <Link className={styles.back} href={myRequest ? "/requests" : "/feed"}><ArrowLeft size={15} />{myRequest ? "All your requests" : "Back to the company board"}</Link>
      {preview ? <p className={styles.previewNote}>Example request · Joining, review and deletion actions are disabled in this preview.</p> : null}
      {status || (!preview && unavailableMessage) ? <p className={styles.notice} role="status">{status || unavailableMessage}</p> : null}
      <div className={styles.detailLayout}>
        <div className={styles.detailMain}>
          <article className={styles.detailCard}>
            <div className={styles.cardTop}><span>{detail.lane === "social" ? "Coworking & Focus" : "Coffee Walk"}</span>{myRequest ? <span className={styles.state} data-state={myRequest.status}>{myRequest.status}</span> : <span className={styles.smallMark} aria-hidden="true" />}</div>
            <div className={styles.detailBody}>
              <p className={styles.kicker}>{detail.hostDisplayName ? `HOSTED BY ${detail.hostDisplayName}` : myRequest ? "IN YOUR PLANS" : "A LITTLE ROOM FOR COMPANY"}</p>
              <h1>{detail.title}</h1>
              <dl className={styles.facts}><div><dt><MapPin size={16} /> Area</dt><dd>{detail.areaLabel || "Agree in chat"}</dd></div><div><dt><CalendarDays size={16} /> When</dt><dd>{formatDateTime(detail.meetupAt)}</dd></div></dl>
              {detail.description ? <div className={styles.description}><h2>The plan</h2><p>{detail.description}</p></div> : null}
              {detail.tags?.length ? <ul className={styles.tags} aria-label="Request tags">{detail.tags.map((tag, index) => <li key={`${tag}-${index}`}>#{tag}</li>)}</ul> : null}
              {detail.verifiedOnly ? <p className={styles.verified}><ShieldCheck size={16} /> Email-confirmed members only</p> : null}
              <p className={styles.privacyHint}>Agree on the exact public meeting point in your private chat after a match.</p>
            </div>
          </article>
          {myRequest?.status === "open" ? <section id="request-replies" className={styles.replies}><JoinReviewPanel entries={joinReviews} preview={preview} onStatus={setStatus} /></section> : null}
          {myRequest && myRequest.status !== "open" ? <SessionControls requestId={detail.id} partnerId={myRequest.partnerId} status={myRequest.status} disabled={preview} onStatus={setStatus} /> : null}
        </div>
        <aside className={styles.rail} aria-label="Request actions">
          {!myRequest ? (
            <section className={styles.joinCard}>
              <span className={styles.smallMark} aria-hidden="true" /><h2>Could you be the +1?</h2><p>A short hello helps the host get to know you. They’ll review your request before a chat opens.</p>
              <label className={styles.introLabel} htmlFor="request-intro">Your introduction</label>
              <textarea id="request-intro" rows={4} value={intro} onChange={(event) => setIntro(event.target.value)} placeholder="What caught your eye about this plan?" maxLength={220} disabled={preview || isJoining} />
              <span className={styles.characterCount}>{intro.length}/220</span>
              <button className={styles.primary} type="button" disabled={preview || isJoining} onClick={() => void handleJoin()}>{preview ? "Preview mode only" : isJoining ? "Sending..." : "Request to join"}<ArrowUpRight size={16} /></button>
            </section>
          ) : (
            <section className={styles.manageCard}>
              <span className={styles.smallMark} aria-hidden="true" /><h2>Your plan, at a glance.</h2>
              <span className={styles.state} data-state={myRequest.status}>{myRequest.status}</span>
              <p>{myRequest.status === "open" ? `${myRequest.pendingJoinCount} pending ${myRequest.pendingJoinCount === 1 ? "reply" : "replies"}. Read their introductions below the plan.` : myRequest.partnerDisplayName ? `Connected with ${myRequest.partnerDisplayName}.` : `This request is ${myRequest.status}.`}</p>
              {myRequest.status === "matched" ? <Link className={styles.primary} href={`/sessions/${detail.id}`}><MessageCircleMore size={16} /> Open chat <ArrowUpRight size={16} /></Link> : null}
              {myRequest.status === "open" ? <a className={styles.secondary} href="#request-replies">Review replies <ArrowUpRight size={15} /></a> : null}
              <div className={styles.removeArea}><p>{myRequest.status === "open" ? "Deleting removes this request permanently." : "Deleting chat hides it from your history, not your companion’s."}</p><button className={styles.delete} type="button" disabled={preview || isDeleting} onClick={() => void handleDelete()}><Trash2 size={15} />{isDeleting ? "Removing..." : myRequest.status === "open" ? "Delete Request" : "Delete Chat"}</button></div>
            </section>
          )}
          <section className={styles.safety}><ShieldCheck size={23} aria-hidden="true" /><h2>Keep it comfortable.</h2><p>Meet in public and keep personal details private. Email confirmation isn’t an identity or safety guarantee.</p><Link href="/safety/reporting">Safety & reporting <ArrowUpRight size={15} /></Link></section>
        </aside>
      </div>
    </div>
  );
}
