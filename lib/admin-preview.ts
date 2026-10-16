import type { AdminDashboard } from "@/lib/supabase/types";

// Fictional UI fixtures. Only imported by the explicit, unconfigured test mode.
export const adminPreview: AdminDashboard = {
  overview: { usersTotal: 2, openRequests: 1, matchedRequests: 1, reportsOpen: 1, deletionRequestsOpen: 1 },
  reports: [
    { id: "demo-report-open", requestId: null, reason: "Repeated unwanted messages", details: "Fictional report for layout testing. A member describes harassment after a session.\n" + "LongUnbrokenText".repeat(24), status: "open", createdAt: "2026-10-01T10:00:00Z", reporterId: "demo-member", targetUserId: "demo-other", reporterDisplayName: "Example member", targetDisplayName: "Example other member" },
    { id: "demo-report-resolved", requestId: null, reason: "Example resolved report", details: "Fictional closed case.", status: "resolved", createdAt: "2026-10-01T10:00:00Z", reporterId: "demo-member", targetUserId: null, reporterDisplayName: "Example member", targetDisplayName: null },
  ],
  deletionRequests: [{ id: "demo-deletion", userId: "demo-member", reason: "Fictional deletion request. No real account is attached.", status: "pending", createdAt: "2026-10-01T10:00:00Z", displayName: "Example member" }],
  users: [
    { id: "demo-admin", displayName: "Example moderator", homeArea: "Example neighbourhood", role: "admin", verificationTier: "email", createdAt: "2026-10-01T10:00:00Z", trustScore: 50, requestCount: 0, openRequestCount: 0 },
    { id: "demo-member", displayName: "Example member", homeArea: "Example neighbourhood", role: "member", verificationTier: "email", createdAt: "2026-10-01T10:00:00Z", trustScore: 50, requestCount: 1, openRequestCount: 1 },
  ],
  moderationReviews: [],
};
