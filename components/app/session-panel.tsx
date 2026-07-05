"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { submitCheckInAction, triggerSosAction } from "@/app/workspace/actions";
import { ChatRoom } from "@/components/chat-room";
import type { WorkspaceSession } from "@/lib/supabase/types";
import { SUPPORT_EMAIL } from "@/lib/env";

export function SessionPanel({
  session,
  currentUserId,
  onStatus,
}: {
  session: WorkspaceSession;
  currentUserId: string;
  onStatus: (message: string) => void;
}) {
  const [sos, setSos] = useState(false);

  return (
    <div className="wl-session" style={{ maxWidth: 820 }}>
      {/* SOS banner */}
      {sos && (
        <div className="wl-sos-banner">
          <AlertTriangle size={22} />
          <div className="wl-sos-body">
            <strong>SOS sent to your emergency contact</strong>
            <div>Your live location was shared. Stay on the line.</div>
          </div>
          <button type="button" className="wl-sos-cancel" onClick={() => setSos(false)}>
            Cancel
          </button>
        </div>
      )}

      {/* Chat card */}
      <div className="wl-chat-card">
        {/* Header */}
        <div className="wl-chat-header">
          <div className="wl-chat-partner">
            <div className="wl-chat-partner-avatar">
              <div className="wl-chat-avatar-circle" style={{ background: "linear-gradient(135deg,#3FA796,#2C7A6B)" }}>
                {session.partnerDisplayName?.[0]?.toUpperCase() ?? "?"}
              </div>
              <span className="wl-active-dot" />
            </div>
            <div className="wl-chat-partner-info">
              <strong>{session.partnerDisplayName}</strong>
              <div>{session.requestTitle} · {session.areaLabel}</div>
            </div>
          </div>
          <span className="wl-matched-pill">Matched</span>
        </div>

        {/* Check-in row */}
        <SessionSafetyActions session={session} onStatus={onStatus} onSos={() => setSos(true)} />

        {/* Chat room */}
        <ChatRoom
          requestId={session.requestId}
          currentUserId={currentUserId}
          initialMessages={session.messages}
          onStatus={onStatus}
        />
      </div>
    </div>
  );
}

function SessionSafetyActions({
  session,
  onStatus,
  onSos,
}: {
  session: WorkspaceSession;
  onStatus: (msg: string) => void;
  onSos: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [activeCheck, setActiveCheck] = useState<string | null>(null);

  function handleCheckIn(status: "ok" | "delayed" | "help") {
    setActiveCheck(status);
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
        onSos();
      } catch {
        onStatus("Failed to trigger SOS.");
      }
    });
  }

  const checks = [
    { key: "ok", label: "I'm OK" },
    { key: "delayed", label: "Running late" },
    { key: "help", label: "Need help" },
  ] as const;

  return (
    <div className="wl-checkin-row">
      <span className="wl-checkin-label">Check-in:</span>
      {checks.map((c) => (
        <button
          key={c.key}
          type="button"
          className={`wl-checkin-pill ${activeCheck === c.key ? "active" : ""}`}
          onClick={() => handleCheckIn(c.key)}
          disabled={isPending}
        >
          {c.label}
        </button>
      ))}
      <button
        type="button"
        className="wl-sos-btn"
        onClick={handleSos}
        disabled={isPending}
      >
        <AlertTriangle size={13} />
        SOS
      </button>
    </div>
  );
}
