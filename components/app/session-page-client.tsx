"use client";

import { useState } from "react";

import { SessionPanel } from "@/components/app/session-panel";
import { StatusBadge } from "@/components/app/status-badge";
import { WorkspacePageHeader } from "@/components/app/workspace-page-header";
import type { WorkspaceSession } from "@/lib/supabase/types";

export function SessionPageClient({
  session,
  currentUserId,
}: {
  session: WorkspaceSession;
  currentUserId: string;
}) {
  const [status, setStatus] = useState("Session ready.");

  return (
    <div className="workspace-page">
      <WorkspacePageHeader kicker="Workspace" title="Your confirmed plan." intro="Keep the details, updates, and safety check-ins in one private thread." status={status} />
      <SessionPanel session={session} currentUserId={currentUserId} onStatus={setStatus} />
    </div>
  );
}
