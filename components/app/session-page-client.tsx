"use client";

import { useState } from "react";

import { SessionPanel } from "@/components/app/session-panel";
import type { WorkspaceSession } from "@/lib/supabase/types";

export function SessionPageClient({
  session,
  currentUserId,
}: {
  session: WorkspaceSession;
  currentUserId: string;
}) {
  const [status, setStatus] = useState("");

  return (
    <div className="sanctuary-page sanctuary-session-page">
      {status ? <div className="withly-status-banner">{status}</div> : null}
      <SessionPanel session={session} currentUserId={currentUserId} onStatus={setStatus} />
    </div>
  );
}
