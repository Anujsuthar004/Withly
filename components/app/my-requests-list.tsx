"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, Trash2 } from "lucide-react";

import { deleteRequestAction } from "@/app/workspace/actions";

import type { WorkspaceRequest } from "@/lib/supabase/types";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

export function MyRequestsList({ requests }: { requests: WorkspaceRequest[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(requestId: string) {
    if (!confirm("Are you sure you want to delete this request? This action cannot be undone.")) return;

    setBusyId(requestId);
    const result = await deleteRequestAction({ requestId });
    setBusyId(null);

    if (result.ok) {
      router.refresh();
    } else {
      alert(result.message);
    }
  }

  return (
    <section className="panel request-list-panel">
      <div className="panel-heading">
        <div>
          <p className="kicker">Your Requests</p>
          <h3>Your requests and matches.</h3>
        </div>
        <span className="status-dot">
          <BellRing size={16} />
          {requests.length} tracked
        </span>
      </div>

      <div className="summary-list">
        {requests.length === 0 ? (
          <div className="empty-card">Nothing posted yet. Use “Post” to publish your first request.</div>
        ) : null}

        {requests.map((request) => (
          <article key={request.id} className="summary-card">
            <div className="summary-head">
              <div>
                <span className="request-lane">{request.lane === "social" ? "Social" : "Errand"}</span>
                <h4>
                  <Link href={`/requests/${request.id}`}>{request.title}</Link>
                </h4>
              </div>
              <span className={`status-pill status-${request.status}`}>{request.status}</span>
            </div>

            <p>{request.areaLabel}</p>

            <div className="summary-meta">
              <span>{formatDateTime(request.meetupAt)}</span>
              <span>{formatRelativeTime(request.lastActivityAt)}</span>
              <span>{request.pendingJoinCount} pending</span>
              {request.partnerDisplayName ? <span>with {request.partnerDisplayName}</span> : null}
            </div>

            <div className="button-row">
              <Link className="secondary-button compact" href={`/requests/${request.id}`}>
                View details
              </Link>
              {request.status === "matched" ? (
                <Link className="primary-button compact" href={`/sessions/${request.id}`}>
                  Open chat
                </Link>
              ) : null}
              <button
                className="secondary-button compact"
                type="button"
                disabled={busyId === request.id}
                onClick={() => void handleDelete(request.id)}
                title="Delete request"
              >
                <Trash2 size={16} />
                {busyId === request.id ? "..." : "Delete"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

