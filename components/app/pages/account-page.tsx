"use client";

import { useState } from "react";

import { AccountPanel } from "@/components/app/account-panel";
import { WorkspacePageHeader } from "@/components/app/workspace-page-header";

export function AccountPage({ preview, initialStatus }: { preview: boolean; initialStatus?: string }) {
  const [status, setStatus] = useState(initialStatus ?? (preview ? "Preview mode is active. Sign in to manage your account." : "Account ready."));

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        kicker="Account"
        title="Keep your data and account controls in reach."
        intro="Export what belongs to you, review the impact of deletion, and handle account changes without surprises."
        status={status}
      />
      <AccountPanel preview={preview} onStatus={setStatus} />
    </div>
  );
}
