"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { HeartHandshake, MessageCircleMore, ShieldAlert } from "lucide-react";

import { submitCheckInAction, triggerSosAction } from "@/app/workspace/actions";
import { ChatRoom } from "@/components/chat-room";
import type { WorkspaceSession } from "@/lib/supabase/types";
import { SUPPORT_EMAIL } from "@/lib/env";
import { formatDateTime } from "@/lib/utils";

export function SessionPanel({
  session,
  currentUserId,
  onStatus,
}: {
  session: WorkspaceSession;
  currentUserId: string;
  onStatus: (message: string) => void;
}) {
  return (
    <section className="panel session-panel">
      <div className="panel-heading">
        <div>
          <p className="kicker">Active workspace</p>
          <h3>{session.requestTitle}</h3>
        </div>
        <span className="status-dot">
          <MessageCircleMore size={16} />
          Planning live
        </span>
      </div>
      <p className="panel-intro">Keep the details, updates, and safety check-ins in one private thread without losing the practical context around the plan.</p>

      <div className="session-layout">
        <div className="session-main-column">
          <div className="summary-callout summary-callout-teal">
            <p>Keep first meetups in public places, confirm an exact landmark in chat, and reach out quickly if you need moderation help.</p>
          </div>

          <div className="session-summary">
            <div>
              <h4>{session.partnerDisplayName}</h4>
              <p>
                {session.areaLabel} • {formatDateTime(session.meetupAt)}
              </p>
            </div>
            <Link className="ghost-button compact" href={`/requests/${session.requestId}`}>
              View request
            </Link>
          </div>

          <SessionSafetyActions session={session} onStatus={onStatus} />

          <ChatRoom
            requestId={session.requestId}
            currentUserId={currentUserId}
            initialMessages={session.messages}
            onStatus={onStatus}
          />
        </div>

        <aside className="session-side-column">
          <section className="session-side-card">
            <p className="kicker">Trip details</p>
            <div className="session-side-list">
              <div>
                <span>Location</span>
                <strong>{session.areaLabel}</strong>
              </div>
              <div>
                <span>Time & date</span>
                <strong>{formatDateTime(session.meetupAt)}</strong>
              </div>
              <div>
                <span>Companion</span>
                <strong>{session.partnerDisplayName}</strong>
              </div>
            </div>
          </section>

          <section className="session-side-card">
            <p className="kicker">Shared checklist</p>
            <ul className="session-checklist">
              <li>Confirm the exact landmark in chat</li>
              <li>Share an ETA before you leave</li>
              {session.checkInEnabled ? <li>Send an arrival check-in once you meet</li> : null}
            </ul>
          </section>

          <section className="session-side-card session-side-actions">
            <a className="ghost-button compact" href={`mailto:${SUPPORT_EMAIL}`}>
              Email support
            </a>
            <Link className="secondary-button compact" href={`/requests/${session.requestId}`}>
              Open request
            </Link>
          </section>
        </aside>
      </div>
    </section>
  );
}

function SessionSafetyActions({ session, onStatus }: { session: WorkspaceSession; onStatus: (msg: string) => void }) {
  const [isPending, startTransition] = useTransition();

  function handleCheckIn(status: "ok" | "delayed" | "help") {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("requestId", session.requestId);
      formData.set("status", status);
      formData.set("note", "Automated UI check-in");

      try {
        const result = await submitCheckInAction({ ok: false, message: "" }, formData);
        onStatus(result.message);
      } catch {
        onStatus("Failed to submit check-in.");
      }
    });
  }

  function handleSos() {
    if (!confirm("Are you sure you want to trigger an SOS? This notifies your emergency contact.")) return;
    
    startTransition(async () => {
      const formData = new FormData();
      formData.set("requestId", session.requestId);
      formData.set("locationText", "Live location not tracked. User requested SOS from UI.");

      try {
        const result = await triggerSosAction({ ok: false, message: "" }, formData);
        onStatus(result.message);
      } catch {
        onStatus("Failed to trigger SOS.");
      }
    });
  }

  return (
    <div className="summary-callout session-safety-card">
      <p className="session-safety-title">Safety actions</p>
      <div className="button-row">
        {session.checkInEnabled && (
          <button 
            type="button" 
            className="secondary-button compact" 
            onClick={() => handleCheckIn("ok")}
            disabled={isPending}
          >
            <HeartHandshake size={14} /> Send I&apos;m OK
          </button>
        )}
        <button 
          type="button" 
          className="danger-button compact primary-button" 
          onClick={handleSos}
          disabled={isPending}
        >
          <ShieldAlert size={14} /> Trigger SOS
        </button>
      </div>
    </div>
  );
}
