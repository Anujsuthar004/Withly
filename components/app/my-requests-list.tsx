"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CalendarDays, MapPin, MessageCircleMore, Trash2 } from "lucide-react";

import { deleteRequestAction, hideThreadAction } from "@/app/workspace/actions";

import type { RequestStatus, WorkspaceRequest } from "@/lib/supabase/types";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import styles from "@/app/requests-design.module.css";

export function MyRequestsList({ requests, preview = false }: { requests: WorkspaceRequest[]; preview?: boolean }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>("all");
  const [feedback, setFeedback] = useState("");

  const visibleRequests = useMemo(
    () => requests.filter((request) => statusFilter === "all" || request.status === statusFilter),
    [requests, statusFilter]
  );

  async function handleDelete(requestId: string) {
    if (preview || busyId) return;
    if (!confirm("Are you sure you want to delete this request? This action cannot be undone.")) return;

    setBusyId(requestId);
    try {
      const result = await deleteRequestAction({ requestId });
      setFeedback(result.message);
      if (result.ok) router.refresh();
    } catch {
      setFeedback("Could not delete this request. Please try again.");
    } finally { setBusyId(null); }
  }

  async function handleHideThread(requestId: string) {
    if (preview || busyId) return;
    if (!confirm("Delete this chat from your history? It disappears for you, but stays for the other participant.")) return;

    setBusyId(requestId);
    try {
      const result = await hideThreadAction({ requestId });
      setFeedback(result.message);
      if (result.ok) router.refresh();
    } catch {
      setFeedback("Could not hide this chat. Please try again.");
    } finally { setBusyId(null); }
  }

  return (
    <section aria-label="Your requests" className={styles.list}>
      <div className={styles.listHeading}><h2>Your requests & matches</h2><span>{requests.length} tracked</span></div>
      {feedback ? <p className={styles.notice} role="status">{feedback}</p> : null}

      {requests.length > 0 ? (
        <div className={styles.filters} role="group" aria-label="Filter requests by status">
          <button type="button" aria-pressed={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
            All
          </button>
          {(["open", "matched", "completed", "cancelled"] as const).map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      ) : null}

      <p className={styles.resultCount} role="status">{visibleRequests.length} {visibleRequests.length === 1 ? "request" : "requests"}{statusFilter !== "all" ? ` · ${statusFilter}` : " · all statuses"}</p>
      <div className={styles.cards}>
        {requests.length === 0 ? (
          <div className={styles.empty}><span className={styles.smallMark} aria-hidden="true" /><h3>It starts with a little plan.</h3><p>Nothing posted yet. Make room for someone in your day.</p><Link className={styles.primary} href="/requests/new">Create a request <ArrowUpRight size={16} /></Link></div>
        ) : null}

        {requests.length > 0 && visibleRequests.length === 0 ? (
          <div className={styles.empty}>
            <h3>No {statusFilter} requests yet.</h3>
            <p>Switch the filter to see the rest of your request history.</p>
            <button className={styles.secondary} type="button" onClick={() => setStatusFilter("all")}>Show all requests</button>
          </div>
        ) : null}

        {visibleRequests.map((request) => (
          <article key={request.id} className={styles.card} aria-label={request.title}>
            <div className={styles.cardTop}><span>{request.lane === "social" ? "Coworking & Focus" : "Coffee Walk"}</span><span className={styles.state} data-state={request.status}>{request.status}</span></div>
            <div className={styles.cardBody}>
            <div>
              <div>
                <h3>
                  <Link href={`/requests/${request.id}`}>{request.title}</Link>
                </h3>
              </div>
            </div>
            <div className={styles.meta}><span><MapPin size={15} />{request.areaLabel || "Agree in chat"}</span><span><CalendarDays size={15} />{formatDateTime(request.meetupAt)}</span></div>
            <div className={styles.planNote}>
              <MessageCircleMore size={17} aria-hidden="true" /><span>{request.status === "open" ? `${request.pendingJoinCount} pending ${request.pendingJoinCount === 1 ? "reply" : "replies"}` : request.partnerDisplayName ? `With ${request.partnerDisplayName}` : `This plan is ${request.status}`}</span>
            </div>
            <small className={styles.updated}>Updated {formatRelativeTime(request.lastActivityAt)}{preview ? " · Example plan" : ""}</small>
            <div className={styles.actions}>
              <Link className={styles.secondary} href={`/requests/${request.id}`}>
                View details
              </Link>
              {request.status === "matched" ? (
                <Link className={styles.primary} href={`/sessions/${request.id}`}>
                  Open chat
                </Link>
              ) : null}
              <button
                className={styles.delete}
                type="button"
                disabled={preview || busyId !== null}
                onClick={() => void (request.status === "open" ? handleDelete(request.id) : handleHideThread(request.id))}
                title={request.status === "open" ? "Delete request" : "Delete chat"}
              >
                {busyId === request.id ? <span className="btn-spinner" /> : <Trash2 size={16} />}
                {busyId === request.id ? "Deleting..." : request.status === "open" ? "Delete" : "Delete chat"}
              </button>
            </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
