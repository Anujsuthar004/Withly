"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, HeartHandshake, MapPin, Mail, ShieldAlert, Share2 } from "lucide-react";

import { submitCheckInAction, triggerSosAction } from "@/app/workspace/actions";
import { ChatRoom } from "@/components/chat-room";
import { SUPPORT_EMAIL } from "@/lib/env";
import { referenceMedia, referenceSessionChecklist } from "@/lib/reference-content";
import type { WorkspaceSession } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils";

export function SessionPanel({
  session,
  currentUserId,
  onStatus,
  embedded = false,
}: {
  session: WorkspaceSession;
  currentUserId: string;
  onStatus: (message: string) => void;
  embedded?: boolean;
}) {
  const checklist = session.checkInEnabled ? referenceSessionChecklist : referenceSessionChecklist.slice(0, 2);

  return (
    <section className={`workspace-session-shell ${embedded ? "embedded" : ""}`}>
      {!embedded ? (
        <aside className="workspace-session-rail">
          <div className="workspace-session-rail-card workspace-session-rail-profile">
            <div className="workspace-session-rail-avatar">W</div>
            <div>
              <strong>The Curator</strong>
              <span>Intentional Quietude</span>
            </div>
          </div>

          <nav className="workspace-session-rail-nav" aria-label="Workspace sections">
            <Link href="/profile" className="workspace-session-rail-link">
              Trust Dashboard
            </Link>
            <Link href={`/sessions/${session.requestId}`} className="workspace-session-rail-link active">
              Active Workspace
            </Link>
          </nav>

          <Link href="/requests/new" className="workspace-session-rail-cta">
            New Companion
          </Link>

          <div className="workspace-session-rail-footer">
            <Link href="/safety/reporting">Help</Link>
            <Link href="/requests">Archive</Link>
          </div>
        </aside>
      ) : null}

      <div className="workspace-session-main">
        <div className="workspace-session-header">
          <div>
            <p className="sanctuary-kicker">Workspace / R-1042</p>
            <h2>{session.requestTitle}</h2>
          </div>

          <div className="workspace-session-status">
            <span className="active">Planning</span>
            <span>Confirmed</span>
            <span>In Progress</span>
          </div>
        </div>

        <div className="workspace-session-layout">
          <div className="workspace-session-chat-column">
            <ChatRoom
              requestId={session.requestId}
              currentUserId={currentUserId}
              initialMessages={session.messages}
              onStatus={onStatus}
            />
          </div>

          <aside className="workspace-session-side-column">
            <section className="workspace-side-card">
              <h3>Trip Details</h3>
              <div className="workspace-side-detail">
                <div>
                  <span>Location</span>
                  <strong>{session.areaLabel}</strong>
                </div>
                <MapPin size={16} />
              </div>
              <div className="workspace-side-detail">
                <div>
                  <span>Time & date</span>
                  <strong>{formatDateTime(session.meetupAt)}</strong>
                </div>
                <CalendarDays size={16} />
              </div>
              <div className="workspace-side-detail">
                <div>
                  <span>Companion</span>
                  <strong>{session.partnerDisplayName}</strong>
                </div>
                <HeartHandshake size={16} />
              </div>

              <div className="workspace-side-map">
                <Image src={referenceMedia.workspaceMap} alt={session.areaLabel} fill sizes="(max-width: 960px) 100vw, 320px" />
              </div>
            </section>

            <section className="workspace-side-card">
              <div className="workspace-side-card-head">
                <h3>Shared Checklist</h3>
                <span>Add Item</span>
              </div>
              <ul className="workspace-session-checklist">
                {checklist.map((item, index) => (
                  <li key={item} className={index === 0 ? "done" : ""}>
                    <span />
                    <p>{item}</p>
                  </li>
                ))}
              </ul>
            </section>

            <div className="workspace-side-actions-grid">
              <a className="workspace-side-action-card tone-peach" href={`mailto:${SUPPORT_EMAIL}`}>
                <Mail size={20} />
                <div>
                  <strong>Email support</strong>
                  <span>Get help fast</span>
                </div>
              </a>
              <Link className="workspace-side-action-card tone-green" href={`/requests/${session.requestId}`}>
                <Share2 size={20} />
                <div>
                  <strong>Open request</strong>
                  <span>Review the plan</span>
                </div>
              </Link>
            </div>

            <div className="workspace-side-gallery">
              <Image src={referenceMedia.workspaceGallery} alt="Workspace reference" fill sizes="(max-width: 960px) 100vw, 320px" />
            </div>

            <SessionSafetyActions session={session} onStatus={onStatus} />
          </aside>
        </div>
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
    <section className="workspace-side-card workspace-safety-card">
      <h3>Safety actions</h3>
      <div className="workspace-safety-actions">
        {session.checkInEnabled ? (
          <button type="button" className="sanctuary-ghost-button" onClick={() => handleCheckIn("ok")} disabled={isPending}>
            <HeartHandshake size={14} />
            Send I&apos;m OK
          </button>
        ) : null}
        <button type="button" className="sanctuary-primary-button danger" onClick={handleSos} disabled={isPending}>
          <ShieldAlert size={14} />
          Trigger SOS
        </button>
      </div>
    </section>
  );
}
