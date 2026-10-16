"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bell, CheckCheck, MessageCircleMore } from "lucide-react";
import styles from "@/app/settings-design.module.css";

import { markNotificationsReadAction } from "@/app/workspace/actions";
import type { z } from "zod";
import type { notificationSchema } from "@/lib/validators";

type Notification = z.infer<typeof notificationSchema>;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AlertsPage({ notifications, preview = false, error = "" }: { notifications: Notification[]; preview?: boolean; error?: string }) {
  const [acknowledged, setAcknowledged] = useState<Notification["id"][]>([]);
  const [readError, setReadError] = useState("");
  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
  const unreadKey = JSON.stringify(unreadIds);
  const unreadCount = unreadIds.filter((id) => !acknowledged.includes(id)).length;

  useEffect(() => {
    if (preview || unreadKey === "[]") return;
    let active = true;
    const formData = new FormData();
    formData.set("notificationIds", unreadKey);
    void markNotificationsReadAction({ ok: false, message: "" }, formData).then((result) => {
      if (!active) return;
      if (result.ok) { setAcknowledged(JSON.parse(unreadKey) as Notification["id"][]); setReadError(""); }
      else setReadError("Your updates are here, but we couldn’t mark them as read. Refresh to try again.");
    }).catch(() => { if (active) setReadError("Your updates are here, but we couldn’t mark them as read. Refresh to try again."); });
    return () => { active = false; };
  }, [preview, unreadKey]);

  return (
    <div className={styles.page}>
      <section className={`${styles.hero} ${styles.alertHero}`}>
        <div>
          <p className={styles.kicker}>THE LITTLE THINGS THAT KEEP YOU CONNECTED</p>
          <h1>Stay in<br /><span>the loop.</span></h1>
          <p className={styles.intro}>Updates on your requests, connections and activity. A little less checking, a little more together.</p>
        </div>
        <div className={styles.heroIcon} aria-hidden="true"><Bell size={68} strokeWidth={1.5} /><span>YOUR LATEST UPDATES</span></div>
      </section>
      {preview ? <p className={styles.previewNote}>Preview notifications · Your own updates will appear after sign-in.</p> : null}
      {error || readError ? <p className={styles.notice} role="status">{error || readError}</p> : null}
      <div className={styles.alertLayout}>
      <section aria-label="Recent notifications" className={styles.updates}>
        <div className={styles.sectionHeading}><h2>Your updates</h2>{!error ? <span role="status">{unreadCount ? `${unreadCount} unread` : notifications.length ? "All caught up" : "No updates yet"}</span> : null}</div>
      <div className={styles.alertsList}>
        {error ? null : notifications.length === 0 ? (
          <div className={styles.empty}><span className={styles.emptyIcon}><CheckCheck size={29} /></span><h3>A quiet moment.</h3><p>No alerts yet. Activity from your requests will show up here. In the meantime, there’s room for a new plan.</p><Link className={styles.primary} href="/feed">Explore the feed <ArrowUpRight size={16} /></Link></div>
        ) : (
          notifications.map((n) => (
            <article key={n.id} className={styles.alertItem} data-unread={!n.read && !acknowledged.includes(n.id)}>
              <span className={styles.notificationIcon} aria-hidden="true">
                <Bell size={18} />
              </span>
              <div className={styles.alertBody}>
                <h3>{n.title}</h3>
                <p>{n.body}</p>
              <div className={styles.alertMeta}>
                <time dateTime={n.createdAt}>{timeAgo(n.createdAt)}</time>
                <span>{n.read || acknowledged.includes(n.id) ? <><CheckCheck size={13} aria-hidden="true" /> Read</> : <><i aria-hidden="true" /> Unread</>}</span>
              </div>
              </div>
            </article>
          ))
        )}
      </div>
      </section>
      <aside className={styles.rail}><section className={styles.help}><MessageCircleMore size={29} aria-hidden="true" /><h2>A hello might be waiting.</h2><p>Head to your inbox for join requests, introductions and your active conversations.</p><Link href="/inbox">Open your inbox <ArrowUpRight size={15} /></Link></section><Link className={styles.profileLink} href="/requests">Already made a plan? <strong>View your requests <ArrowUpRight size={14} /></strong></Link></aside>
      </div>
    </div>
  );
}
