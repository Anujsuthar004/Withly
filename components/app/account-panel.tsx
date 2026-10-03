"use client";

import { useState, useTransition } from "react";
import { Download, ShieldAlert, Trash2, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";

import { 
  deleteAccountAction, 
  setEmergencyContactAction,
  joinCommunityAction,
  createCommunityAction
} from "@/app/workspace/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/env";

export function AccountPanel({ preview, onStatus }: { preview: boolean; onStatus: (message: string) => void }) {
  const router = useRouter();
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();

  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecEmail, setEcEmail] = useState("");
  const [isEcPending, startEcTransition] = useTransition();

  const [communityId, setCommunityId] = useState("");
  const [commName, setCommName] = useState("");
  const [commDesc, setCommDesc] = useState("");
  const [isCommPending, startCommTransition] = useTransition();

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

          <a
            className="ghost-button"
            href={preview ? undefined : "/api/account/export"}
            aria-disabled={preview}
            onClick={(event) => {
              if (preview) {
                event.preventDefault();
                onStatus("This action is only available after sign-in.");
              }
            }}
          >
            <Download size={16} />
            {preview ? "Preview mode only" : "Download account export"}
          </a>
        </section>

        <section className="panel-section">
          <div className="form-section-head">
            <h4>Emergency Contact</h4>
            <p>Store a trusted contact for your own safety planning. Withly does not currently send SMS, email, or contact emergency services.</p>
          </div>

          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();

              if (preview) {
                onStatus("This action is only available after sign-in.");
                return;
              }

              startEcTransition(async () => {
                const formData = new FormData();
                formData.set("contactName", ecName);
                formData.set("contactPhone", ecPhone);
                if (ecEmail) formData.set("contactEmail", ecEmail);

                const result = await setEmergencyContactAction({ ok: false, message: "" }, formData);
                onStatus(result.message);
                
                if (result.ok) {
                  setEcName("");
                  setEcPhone("");
                  setEcEmail("");
                  router.refresh();
                }
              });
            }}
          >
            <div className="grid-two">
              <label>
                Contact Name *
                <input
                  type="text"
                  value={ecName}
                  onChange={(event) => setEcName(event.target.value)}
                  placeholder="Jane Doe"
                  required
                  disabled={preview || isEcPending}
                />
              </label>
              <label>
                Phone Number *
                <input
                  type="tel"
                  value={ecPhone}
                  onChange={(event) => setEcPhone(event.target.value)}
                  placeholder="+15551234567"
                  required
                  disabled={preview || isEcPending}
                />
              </label>
            </div>
            <label>
              Email Address (Optional)
              <input
                type="email"
                value={ecEmail}
                onChange={(event) => setEcEmail(event.target.value)}
                placeholder="jane@example.com"
                disabled={preview || isEcPending}
              />
            </label>

            <button className="secondary-button" type="submit" disabled={preview || isEcPending || !ecName || !ecPhone}>
              {!preview && isEcPending ? <span className="btn-spinner" /> : <ShieldAlert size={16} />}
              {preview ? "Preview mode only" : isEcPending ? "Saving..." : "Save Emergency Contact"}
            </button>
          </form>
        </section>

        <section className="panel-section">
          <div className="form-section-head">
            <h4>Trust Communities</h4>
            <p>Create a public community or join one using its community ID. Private invitations are not available yet.</p>
          </div>
          
          <div className="grid-two">
            <form className="stack-form" onSubmit={(e) => {
              e.preventDefault();
              startCommTransition(async () => {
                const formData = new FormData();
                formData.set("communityId", communityId);
                const result = await joinCommunityAction({ ok: false, message: "" }, formData);
                onStatus(result.message);
                if (result.ok) setCommunityId("");
              });
            }}>
              <label>
                Join with a Community ID
                <input 
                  type="text" 
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={communityId}
                  onChange={(e) => setCommunityId(e.target.value)}
                  disabled={preview || isCommPending}
                  required
                />
              </label>
              <button className="ghost-button compact" type="submit" disabled={preview || isCommPending}>
                Join Community
              </button>
            </form>

            <form className="stack-form" onSubmit={(e) => {
              e.preventDefault();
              startCommTransition(async () => {
                const formData = new FormData();
                formData.set("name", commName);
                formData.set("description", commDesc);
                formData.set("isPrivate", "false");
                const result = await createCommunityAction({ ok: false, message: "" }, formData);
                onStatus(result.message);
                if (result.ok) {
                  setCommName("");
                  setCommDesc("");
                }
              });
            }}>
              <label>
                Create Community
                <input 
                  type="text" 
                  placeholder="Community Name" 
                  value={commName} 
                  onChange={(e) => setCommName(e.target.value)}
                  disabled={preview || isCommPending}
                  required
                />
              </label>
              <button className="secondary-button compact" type="submit" disabled={preview || isCommPending}>
                {isCommPending ? "Creating..." : "Create New Community"}
              </button>
            </form>
          </div>
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
              {!preview && isPending ? <span className="btn-spinner" /> : <Trash2 size={16} />}
              {preview ? "Preview mode only" : isPending ? "Processing..." : "Delete my account"}
            </button>
          </form>
        </section>
      </div>
    </section>
  );
}
