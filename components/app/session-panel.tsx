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
          <p className="kicker">Session</p>
          <h3>Chat for confirmed plans.</h3>
        </div>
        <span className="status-dot">
          <MessageCircleMore size={16} />
          Live chat
        </span>
      </div>
      <p className="panel-intro">Once a plan is confirmed, keep the details, updates, and safety check-ins in one private thread.</p>

      <div className="summary-callout summary-callout-teal">
        <p>Keep first meetups in public places, confirm an exact landmark in chat, and reach out quickly if you need moderation help.</p>
        <div className="summary-callout-actions">
          <a className="ghost-button compact" href={`mailto:${SUPPORT_EMAIL}`}>
            Email support
          </a>
        </div>
      </div>

      <div className="session-summary">
        <div>
          <h4>{session.requestTitle}</h4>
          <p>
            {session.partnerDisplayName} • {session.areaLabel} • {formatDateTime(session.meetupAt)}
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
    <div className="summary-callout" style={{ marginBottom: "1.5rem", padding: "1rem" }}>
      <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>Safety Actions</p>
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
