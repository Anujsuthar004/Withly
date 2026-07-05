"use client";

import { useState } from "react";
import { Bell, MessageCircle, ShieldCheck, Star } from "lucide-react";
import { useRouter } from "next/navigation";

import { reviewJoinRequestAction } from "@/app/workspace/actions";
import type { WorkspaceJoinReview } from "@/lib/supabase/types";
import { formatRelativeTime } from "@/lib/utils";

/* Static notification data for the redesign */
const NOTIFICATIONS = [
  { icon: "chat", text: "Aarav sent a message in Passport office morning run", time: "3m", unread: true },
  { icon: "bell", text: "Mira requested to join Gallery opening with a short dinner after", time: "11m", unread: true },
  { icon: "star", text: "Your trust score rose to 68 after a completed session", time: "2h", unread: false },
  { icon: "shield", text: "Phone verification approved — you can now post verified-only requests", time: "1d", unread: false },
];

function NotifIcon({ type }: { type: string }) {
  switch (type) {
    case "chat":
      return <MessageCircle size={17} />;
    case "star":
      return <Star size={17} />;
    case "shield":
      return <ShieldCheck size={17} />;
    default:
      return <Bell size={17} />;
  }
}

function getNotifStyle(type: string) {
  switch (type) {
    case "chat":
      return { color: "var(--accent2)", bg: "var(--accent-soft)" };
    case "star":
      return { color: "var(--gold)", bg: "rgba(224,154,79,0.14)" };
    case "shield":
      return { color: "var(--teal)", bg: "var(--teal-soft)" };
    default:
      return { color: "var(--teal)", bg: "var(--teal-soft)" };
  }
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function getGradient(name: string) {
  const GRADIENTS = [
    "linear-gradient(135deg,#6C7BD6,#9A6CD6)",
    "linear-gradient(135deg,#3FA796,#2C7A6B)",
    "linear-gradient(135deg,#E0864B,#C65D3B)",
    "linear-gradient(135deg,#B37FE0,#8C4FC4)",
    "linear-gradient(135deg,#D6497E,#B32E63)",
  ];
  const hash = [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
}

export function JoinReviewPanel({
  entries,
  preview,
  onStatus,
}: {
  entries: WorkspaceJoinReview[];
  preview: boolean;
  onStatus: (message: string) => void;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  async function handleReview(entryId: string, decision: "accepted" | "declined") {
    if (preview) {
      onStatus("This action is only available after sign-in.");
      return;
    }

    setBusyId(entryId);
    setCardErrors((current) => ({ ...current, [entryId]: "" }));

    try {
      const result = await reviewJoinRequestAction({ joinRequestId: entryId, decision });
      onStatus(result.message);

      if (result.ok) {
        router.refresh();
      } else {
        setCardErrors((current) => ({ ...current, [entryId]: result.message }));
      }
    } catch {
      const errorMessage = "Something went wrong. Please refresh and try again.";
      onStatus(errorMessage);
      setCardErrors((current) => ({ ...current, [entryId]: errorMessage }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="wl-inbox" style={{ maxWidth: 820 }}>
      {/* Join requests */}
      <section>
        <h3 className="wl-section-title">Join requests</h3>
        <div className="wl-inbox-list">
          {entries.length === 0 ? (
            <div className="wl-empty-card">
              <strong>No pending join requests</strong>
              <span>When someone wants to join your request, it will show up here.</span>
            </div>
          ) : null}

          {entries.map((entry) => {
            const initials = getInitials(entry.joinerDisplayName);
            const grad = getGradient(entry.joinerDisplayName);

            return (
              <article key={entry.id} className="wl-join-card">
                <div className="wl-join-header">
                  <div className="wl-join-avatar-wrap">
                    <div className="wl-join-avatar" style={{ background: grad }}>
                      {initials}
                    </div>
                    <span className="wl-active-dot" />
                  </div>
                  <div className="wl-join-info">
                    <div className="wl-join-name-row">
                      <strong>{entry.joinerDisplayName}</strong>
                      <span className="wl-trust-pill">Trust 72</span>
                    </div>
                    <div className="wl-join-meta">
                      wants to join · {entry.requestTitle} · {formatRelativeTime(entry.createdAt)}
                    </div>
                  </div>
                </div>

                <p className="wl-join-intro">&quot;{entry.introMessage || "No intro included."}&quot;</p>

                {cardErrors[entry.id] ? (
                  <div className="inline-error" role="alert">
                    {cardErrors[entry.id]}
                  </div>
                ) : null}

                <div className="wl-join-actions">
                  <button
                    className="wl-btn-teal"
                    type="button"
                    disabled={preview || busyId === entry.id}
                    onClick={() => void handleReview(entry.id, "accepted")}
                  >
                    {busyId === entry.id ? "Working..." : "Accept & open chat"}
                  </button>
                  <button
                    className="wl-btn-ghost"
                    type="button"
                    disabled={preview || busyId === entry.id}
                    onClick={() => void handleReview(entry.id, "declined")}
                  >
                    {busyId === entry.id ? "Working..." : "Decline"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Notifications */}
      <section>
        <h3 className="wl-section-title">Notifications</h3>
        <div className="wl-notif-card">
          {NOTIFICATIONS.map((n, i) => {
            const style = getNotifStyle(n.icon);
            return (
              <div key={i} className={`wl-notif-row ${n.unread ? "wl-notif-unread" : ""}`}>
                <span
                  className="wl-notif-icon"
                  style={{ color: style.color, background: style.bg }}
                >
                  <NotifIcon type={n.icon} />
                </span>
                <div className="wl-notif-text">{n.text}</div>
                <span className="wl-notif-time">{n.time}</span>
                {n.unread && <span className="wl-notif-dot" />}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
