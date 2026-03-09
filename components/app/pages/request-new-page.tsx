"use client";

import { useState } from "react";

import { RequestComposer } from "@/components/request-composer";
import { StatusBadge } from "@/components/app/status-badge";

export function RequestNewPage({ preview }: { preview: boolean }) {
  const [status, setStatus] = useState(
    preview ? "Preview mode is active. Sign in to post a request." : "Share a clear plan with strong defaults."
  );

  return (
    <div className="workspace-page">
      <section className="workspace-hero-actions" style={{ padding: 0, background: "transparent", border: 0, boxShadow: "none" }}>
        <StatusBadge message={status} />
      </section>

      <RequestComposer preview={preview} onStatus={setStatus} />
    </div>
  );
}

