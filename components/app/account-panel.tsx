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

      <div className="action-stack">
        <div className="summary-callout">
          Download a copy of your profile, requests, messages, reports, and block records before deleting your account.
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
      </div>
    </section>
  );
}

