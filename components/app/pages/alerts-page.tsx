"use client";

import { useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";

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

export function AlertsPage({ notifications }: { notifications: Notification[] }) {
  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

  useEffect(() => {
    if (unreadIds.length === 0) return;
    const formData = new FormData();
    formData.set("notificationIds", JSON.stringify(unreadIds));
    void markNotificationsReadAction(null as never, formData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sanctuary-page">
      <section className="sanctuary-page-intro">
        <div>
          <p className="sanctuary-kicker">Alerts</p>
          <h1>Stay in the loop.</h1>
          <p>Updates on your requests, connections, and activity — all in one place.</p>
        </div>
        {unreadIds.length > 0 ? (
          <span className="sanctuary-chip">{unreadIds.length} unread</span>
        ) : (
          <span className="sanctuary-chip">All caught up</span>
        )}
      </section>

      <div className="alerts-list">
        {notifications.length === 0 ? (
          <div className="empty-card">No alerts yet. Activity from your requests will show up here.</div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`alerts-item panel sanctuary-panel ${n.read ? "read" : "unread"}`}>
              <span className="alerts-item-icon">
                <Bell size={16} />
              </span>
              <div className="alerts-item-body">
                <strong>{n.title}</strong>
                <p>{n.body}</p>
              </div>
              <div className="alerts-item-meta">
                <span className="kicker">{timeAgo(n.createdAt)}</span>
                {n.read ? <CheckCheck size={14} className="alerts-read-icon" /> : <span className="alerts-unread-dot" />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
