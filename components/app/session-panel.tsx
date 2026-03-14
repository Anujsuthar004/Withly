"use client";

import Link from "next/link";
import { MessageCircleMore } from "lucide-react";

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

      <ChatRoom
        requestId={session.requestId}
        currentUserId={currentUserId}
        initialMessages={session.messages}
        onStatus={onStatus}
      />
    </section>
  );
}
