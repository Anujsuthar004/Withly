"use client";

import { useState, useTransition } from "react";
import { Download, Trash2, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteAccountAction } from "@/app/workspace/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/env";

export function AccountPanel({ preview, onStatus }: { preview: boolean; onStatus: (message: string) => void }) {
  const router = useRouter();
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <section className="panel account-panel">
      <div className="panel-heading">
        <div>
          <p className="kicker">Account</p>
          <h3>Account data and deletion.</h3>
        </div>
        <span className="status-dot">
          <UserMinus size={16} />
          Data rights
        </span>
      </div>
      <p className="panel-intro">Use this page for one-time account actions: keep a copy of your data, or close the account cleanly when you need to.</p>

      <div className="action-stack">
        <section className="panel-section">
          <div className="form-section-head">
            <h4>Download your data</h4>
            <p>Keep a copy of your profile, requests, messages, reports, and block records before making bigger changes.</p>
          </div>

          <div className="summary-callout">
            Download a snapshot of your account history as JSON so you can keep your own record before deleting your account.
          </div>

          <button
            className="ghost-button"
            type="button"
            disabled={preview}
            onClick={() => {
              if (preview) {
                onStatus("This action is only available after sign-in.");
                return;
              }

              window.location.href = "/api/account/export";
            }}
          >
            <Download size={16} />
            {preview ? "Preview mode only" : "Download account export"}
          </button>
        </section>

        <section className="panel-section danger-panel">
          <div className="form-section-head">
            <h4>Delete your account</h4>
            <p>This permanently removes the account. Take the export first if you might want your records later.</p>
          </div>

          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();

              if (preview) {
                onStatus("This action is only available after sign-in.");
                return;
              }

              startTransition(async () => {
                const result = await deleteAccountAction({
                  confirmationText: deleteConfirmation,
                  reason: deleteReason,
                });

                onStatus(result.message);
                if (!result.ok) return;

                if (result.accountDeleted) {
                  if (hasSupabaseEnv) {
                    const supabase = createSupabaseBrowserClient();
                    await supabase.auth.signOut();
                  }

                  router.push("/");
                  router.refresh();
                  return;
                }

                setDeleteReason("");
                setDeleteConfirmation("");
                router.refresh();
              });
            }}
          >
            <label>
              Why are you leaving?
              <textarea
                rows={3}
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                maxLength={600}
                placeholder="Optional context for support or compliance follow-up."
                disabled={preview || isPending}
              />
            </label>

            <label>
              Type DELETE MY ACCOUNT to confirm
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder="DELETE MY ACCOUNT"
                disabled={preview || isPending}
              />
            </label>

            <button className="primary-button" type="submit" disabled={preview || isPending}>
              <Trash2 size={16} />
              {preview ? "Preview mode only" : isPending ? "Processing..." : "Delete my account"}
            </button>
          </form>
        </section>
      </div>
    </section>
  );
}
