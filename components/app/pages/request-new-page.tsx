"use client";

import { useState } from "react";

import { RequestComposer } from "@/components/request-composer";
import { WorkspacePageHeader } from "@/components/app/workspace-page-header";

export function RequestNewPage({ preview, initialStatus }: { preview: boolean; initialStatus?: string }) {
  const [status, setStatus] = useState(
    initialStatus ?? (preview ? "Preview mode is active. Sign in to post a request." : "Share a clear plan with strong defaults.")
  );

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        kicker="Post"
        title="Write a plan that feels easy to trust."
        intro="Good requests feel specific without oversharing. Set the tone, logistics, and safety defaults in one pass."
        status={status}
        meta={<span className="mini-chip">3-step flow</span>}
      />
      <RequestComposer preview={preview} onStatus={setStatus} />
    </div>
  );
}
