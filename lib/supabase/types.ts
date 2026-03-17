export type RequestLane = "social" | "errand";
export type RequestStatus = "open" | "matched" | "completed" | "cancelled";
export type VerificationTier = "email" | "phone" | "id_verified";
export type CheckInStatus = "ok" | "missed" | "sos";
export type SosStatus = "active" | "resolved" | "false_alarm";
export type ModerationVerdict = "safe" | "flagged" | "rejected";
export type CommunityRole = "owner" | "moderator" | "member";
export type NotificationKind =
  | "join_request_received"
  | "join_request_accepted"
  | "join_request_declined"
  | "message_received"
  | "check_in_due"
  | "check_in_missed"
  | "session_completed"
  | "meet_again_mutual"
  | "sos_triggered"
  | "verification_upgraded"
  | "community_invite"
  | "moderation_flag";

export interface FeedRequestCard {
  id: string;
  lane: RequestLane;
  title: string;
  description: string;
  areaLabel: string | null;
  meetupAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  verifiedOnly: boolean;
  hostDisplayName: string | null;
  hostVerified: boolean;
  hostTrustScore: number;
  hostVerificationTier: VerificationTier;
  tags: string[];
  compatibilityScore: number | null;
  maxCompanions: number;
}

export interface WorkspaceProfile {
  id: string;
  displayName: string;
  aboutMe: string;
  homeArea: string;
  role: "member" | "admin";
  avatarUrl: string;
  verificationTier: VerificationTier;
  trustScore: number;
}

export interface WorkspaceRequest {
  id: string;
  lane: RequestLane;
  title: string;
  areaLabel: string;
  meetupAt: string | null;
  status: RequestStatus;
  verifiedOnly: boolean;
  pendingJoinCount: number;
  partnerDisplayName: string | null;
  partnerId: string | null;
  createdAt: string;
  lastActivityAt: string;
  completedAt: string | null;
  userOutcome: "completed" | "issue" | null;
  userMeetAgain: boolean | null;
  maxCompanions: number;
  companionIds: string[];
}

export interface WorkspaceJoinReview {
  id: string;
  requestId: string;
  requestTitle: string;
  requestLane: RequestLane;
  joinerId: string;
  joinerDisplayName: string;
  joinerAboutMe: string;
  introMessage: string;
  createdAt: string;
}

export interface SessionMessage {
  id: number;
  requestId: string;
  senderType: "user" | "system";
  senderId: string | null;
  senderName: string;
  body: string;
  createdAt: string;
}

export interface WorkspaceSession {
  requestId: string;
  requestTitle: string;
  lane: RequestLane;
  areaLabel: string;
  meetupAt: string | null;
  checkInEnabled: boolean;
  partnerDisplayName: string;
  partnerId: string;
  messages: SessionMessage[];
}

export interface ModerationReport {
  id: string;
  requestId: string | null;
  reason: string;
  details: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
  reporterId: string;
  targetUserId: string | null;
  reporterDisplayName: string | null;
  targetDisplayName: string | null;
}

export interface AccountDeletionRequest {
  id: string;
  userId: string;
  reason: string;
  status: "pending" | "resolved" | "cancelled";
  createdAt: string;
  displayName: string | null;
}

export interface AdminDashboard {
  overview: {
    usersTotal: number;
    openRequests: number;
    matchedRequests: number;
    reportsOpen: number;
    deletionRequestsOpen: number;
  };
  reports: ModerationReport[];
  deletionRequests: AccountDeletionRequest[];
  moderationReviews?: ModerationReviewEntry[];
}

export interface WorkspaceSnapshot {
  profile: WorkspaceProfile;
  myRequests: WorkspaceRequest[];
  incomingJoinRequests: WorkspaceJoinReview[];
  activeSession: WorkspaceSession | null;
}

// --- New feature types ---

export interface SessionCheckIn {
  id: number;
  requestId: string;
  userId: string;
  status: CheckInStatus;
  note: string;
  createdAt: string;
}

export interface AppNotification {
  id: number;
  kind: NotificationKind;
  title: string;
  body: string;
  refId: string | null;
  read: boolean;
  createdAt: string;
}

export interface TrustScore {
  userId: string;
  sessionsCompleted: number;
  sessionsWithIssues: number;
  meetAgainYes: number;
  meetAgainNo: number;
  reportsReceived: number;
  score: number;
  updatedAt: string;
}

export interface AvailabilityWindow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label: string;
}

export interface EmergencyContact {
  id: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
}

export interface SosAlert {
  id: string;
  requestId: string;
  triggeredBy: string;
  status: SosStatus;
  locationText: string;
  resolvedAt: string | null;
  createdAt: string;
}

export interface TrustedCompanion {
  id: string;
  companionId: string;
  companionName: string;
  companionTrustScore: number;
  requestId: string;
  createdAt: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  role: CommunityRole;
  memberCount: number;
  joinedAt: string;
}

export interface ModerationReviewEntry {
  id: string;
  contentType: "request" | "message" | "profile" | "report";
  contentId: string;
  contentText: string;
  verdict: ModerationVerdict;
  confidence: number;
  flags: string[];
  reviewedBy: string;
  createdAt: string;
}
