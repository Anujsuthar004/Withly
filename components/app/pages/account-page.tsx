"use client";

import { useState } from "react";

import { AccountPanel } from "@/components/app/account-panel";
import { StatusBadge } from "@/components/app/status-badge";

export function AccountPage({ preview, initialStatus }: { preview: boolean; initialStatus?: string }) {
  const [status, setStatus] = useState(initialStatus ?? (preview ? "Preview mode is active. Sign in to manage your account." : "Account ready."));

  return (
    <div className="workspace-page">
      <section className="workspace-hero-actions" style={{ padding: 0, background: "transparent", border: 0, boxShadow: "none" }}>
        <StatusBadge message={status} />
      </section>
      <AccountPanel preview={preview} onStatus={setStatus} />
    </div>
  );
}
