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
        kicker="New companion journey"
        title="Post a request."
        intro="Define the tone first, then shape the practical details so the right companion recognises the fit quickly."
        status={status}
        meta={<span className="mini-chip">3-step flow</span>}
      />
      <RequestComposer preview={preview} onStatus={setStatus} />
    </div>
  );
}
