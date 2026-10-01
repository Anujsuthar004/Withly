"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { blockUserAction, completeRequestAction, createReportAction } from "@/app/workspace/actions";
import type { RequestStatus } from "@/lib/supabase/types";

export function SessionControls({ requestId, partnerId, status, onStatus, disabled = false }: {
  requestId: string;
  partnerId: string | null;
  status: RequestStatus;
  onStatus: (message: string) => void;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<"completed" | "issue">("completed");
  const [meetAgain, setMeetAgain] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [blockTarget, setBlockTarget] = useState(false);
  const busy = disabled || pending;

  function run(action: () => Promise<{ ok: boolean; message: string }>, afterSuccess?: () => void) {
    startTransition(async () => {
      try {
        const result = await action();
        onStatus(result.message);
        if (result.ok) {
          afterSuccess?.();
          router.refresh();
        }
      } catch {
        onStatus("Could not save this action. Please try again.");
      }
    });
  }

  return (
    <section className="panel" aria-label="Session feedback and safety">
      {(status === "matched" || status === "completed") && (
        <form className="stack-form" onSubmit={(event) => {
          event.preventDefault();
          run(() => completeRequestAction({ requestId, outcome, meetAgain }));
        }}>
          <h3>Session feedback</h3>
          <p>Both participants must submit feedback to close the session. Issues can also be reported below.</p>
          <label>How did the session go?
            <select value={outcome} onChange={(event) => setOutcome(event.target.value as "completed" | "issue")} disabled={busy}>
              <option value="completed">Completed</option>
              <option value="issue">There was an issue</option>
            </select>
          </label>
          <label><input type="checkbox" checked={meetAgain} onChange={(event) => setMeetAgain(event.target.checked)} disabled={busy} /> I would meet this person again</label>
          <button className="primary-button" type="submit" disabled={busy}>Save session feedback</button>
        </form>
      )}
      <form className="stack-form" onSubmit={(event) => {
        event.preventDefault();
        run(() => createReportAction({ requestId, targetUserId: partnerId, reason, details, blockTarget }), () => {
          setReason(""); setDetails(""); setBlockTarget(false);
        });
      }}>
        <h3>Report a concern</h3>
        <p>Reports go to moderators. For immediate danger, contact local emergency services.</p>
        <label>Reason<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={4} maxLength={80} required disabled={busy} /></label>
        <label>What happened?<textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1200} rows={3} disabled={busy} /></label>
        {partnerId && <label><input type="checkbox" checked={blockTarget} onChange={(event) => setBlockTarget(event.target.checked)} disabled={busy} /> Also block this person and end active sessions together</label>}
        <button className="secondary-button" type="submit" disabled={busy}>Submit report</button>
      </form>
      {partnerId && <button className="secondary-button" type="button" disabled={busy} onClick={() => {
        if (confirm("Block this person? Active sessions together will end and no new messages can be sent between you.")) {
          run(() => blockUserAction({ userId: partnerId }));
        }
      }}>Block companion</button>}
    </section>
  );
}
