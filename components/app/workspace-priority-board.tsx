"use client";

import Link from "next/link";
import { ArrowRight, Compass, MessageCircleMore, PlusCircle, Sparkles, UserRound } from "lucide-react";

import type { WorkspaceSnapshot } from "@/lib/supabase/types";
import { formatDateTime, getProfileCompletion } from "@/lib/utils";

export function WorkspacePriorityBoard({
  snapshot,
  preview,
  feedCount,
}: {
  snapshot: WorkspaceSnapshot;
  preview: boolean;
  feedCount: number;
}) {
  const openRequests = snapshot.myRequests.filter((request) => request.status === "open");
  const profileProgress = getProfileCompletion(snapshot.profile);
  const pendingReplies = snapshot.incomingJoinRequests.length;
  const activeSession = snapshot.activeSession;

  const nextTask = activeSession
    ? {
        kicker: "Active now",
        title: `Keep ${activeSession.partnerDisplayName} in the loop.`,
        description: `Your next confirmed plan is set for ${formatDateTime(activeSession.meetupAt)}. Use the inbox to keep the details crisp and easy to follow.`,
        primaryHref: "/inbox",
        primaryLabel: "Open inbox",
        secondaryHref: `/requests/${activeSession.requestId}`,
        secondaryLabel: "View request",
      }
    : pendingReplies > 0
      ? {
          kicker: "Needs attention",
          title: `${pendingReplies} ${pendingReplies === 1 ? "reply is" : "replies are"} waiting for review.`,
          description: "Start with the introductions that sound aligned, then move the best fit toward a confident yes.",
          primaryHref: "/inbox",
          primaryLabel: "Review replies",
          secondaryHref: "/requests",
          secondaryLabel: "Open my requests",
        }
      : openRequests.length > 0
        ? {
            kicker: "Keep momentum",
            title: `${openRequests.length} ${openRequests.length === 1 ? "request is" : "requests are"} live right now.`,
            description: "Refresh your request details, tighten tags, and keep an eye on the feed for people who match the tone you want.",
            primaryHref: "/requests",
            primaryLabel: "Manage requests",
            secondaryHref: "/requests/new",
            secondaryLabel: "Post another request",
          }
        : preview
          ? {
              kicker: "Preview mode",
              title: "Explore the workspace before posting.",
              description: "You can browse the layout now. Sign in when you are ready to publish, review replies, and move into chat.",
              primaryHref: "/requests/new",
              primaryLabel: "Create a request",
              secondaryHref: "/profile",
              secondaryLabel: "Finish profile",
            }
          : profileProgress.percentage < 100
          ? {
              kicker: "Get started",
              title: "Complete your profile before posting a request.",
              description: "A complete profile builds trust before anyone replies. Add a photo, a short bio, and your area — it takes less than two minutes.",
              primaryHref: "/profile",
              primaryLabel: "Complete profile",
              secondaryHref: "/requests/new",
              secondaryLabel: "Skip to posting",
            }
          : {
              kicker: "Fresh start",
              title: "Post your first request and start the conversation.",
              description: "A clear first request is the fastest way to make the app feel useful. Keep it specific, calm, and easy to trust.",
              primaryHref: "/requests/new",
              primaryLabel: "Create a request",
              secondaryHref: "/profile",
              secondaryLabel: "View profile",
            };

  return (
    <section className="priority-board">
      <section className="panel priority-spotlight">
        <div className="priority-spotlight-top">
          <div className="priority-spotlight-copy">
            <p className="kicker">{nextTask.kicker}</p>
            <h2>{nextTask.title}</h2>
            <p>{nextTask.description}</p>
          </div>
          <div className="priority-spotlight-badge">
            <Sparkles size={18} />
            Right now
          </div>
        </div>

        <div className="priority-action-row">
          <Link className="primary-button compact" href={nextTask.primaryHref}>
            {nextTask.primaryLabel}
            <ArrowRight size={16} />
          </Link>
          <Link className="ghost-button compact" href={nextTask.secondaryHref}>
            {nextTask.secondaryLabel}
          </Link>
        </div>

        <div className="priority-metrics-grid">
          <article className="priority-metric-card">
            <span>Open requests</span>
            <strong>{openRequests.length}</strong>
            <p>Plans you currently have out in the world.</p>
          </article>
          <article className="priority-metric-card">
            <span>Pending replies</span>
            <strong>{pendingReplies}</strong>
            <p>Introductions waiting for your review.</p>
          </article>
          <article className="priority-metric-card">
            <span>Active sessions</span>
            <strong>{activeSession ? 1 : 0}</strong>
            <p>Confirmed plans with a private chat thread.</p>
          </article>
          <article className="priority-metric-card">
            <span>Fresh feed fits</span>
            <strong>{feedCount}</strong>
            <p>Public requests you can browse right now.</p>
          </article>
        </div>
      </section>

      <div className="priority-side-grid">
        <section className="panel priority-quick-actions">
          <div className="form-section-head">
            <h4>Quick actions</h4>
            <p>Keep the high-value tasks within one tap, especially on mobile.</p>
          </div>
          <div className="quick-action-stack">
            <Link className="ghost-button compact" href="/requests/new">
              <PlusCircle size={16} />
              Post a request
            </Link>
            <Link className="ghost-button compact" href="/inbox">
              <MessageCircleMore size={16} />
              Review inbox
            </Link>
            <Link className="ghost-button compact" href="/profile">
              <UserRound size={16} />
              Update profile
            </Link>
            <Link className="ghost-button compact" href="/explore">
              <Compass size={16} />
              Public explore
            </Link>
          </div>
        </section>

        <section className="panel priority-profile-progress">
          <div className="form-section-head">
            <h4>Profile strength</h4>
            <p>Complete profiles get quicker trust and fewer back-and-forth questions.</p>
          </div>

          <div className="profile-strength-meter" aria-label={`Profile ${profileProgress.percentage}% complete`}>
            <div className="profile-strength-bar">
              <span style={{ width: `${profileProgress.percentage}%` }} />
            </div>
            <strong>{profileProgress.percentage}% complete</strong>
          </div>

          <div className="profile-strength-checklist">
            {profileProgress.steps.map((step) => (
              <div key={step.id} className={`profile-strength-item ${step.done ? "done" : ""}`}>
                <span>{step.label}</span>
                <strong>{step.done ? "Done" : "Add it"}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
