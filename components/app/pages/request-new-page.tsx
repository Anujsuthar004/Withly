"use client";

import { useState } from "react";

import { RequestComposer } from "@/components/request-composer";

export function RequestNewPage({ preview, initialStatus }: { preview: boolean; initialStatus?: string }) {
  const [status, setStatus] = useState(initialStatus ?? (preview ? "Preview mode is active. Sign in to post a request." : ""));

  return (
    <div className="sanctuary-page sanctuary-request-page">
      <section className="sanctuary-page-intro sanctuary-request-intro">
        <div>
          <p className="sanctuary-kicker">New companion journey</p>
          <h1>Post a Request</h1>
        </div>
        <span className="sanctuary-chip">3 step flow</span>
      </section>
      {status ? <div className="withly-status-banner">{status}</div> : null}
      <RequestComposer preview={preview} onStatus={setStatus} />
    </div>
  );
}
