export type RequestLane = "social" | "errand";
export type RequestStatus = "open" | "matched" | "completed" | "cancelled";

export interface FeedRequestCard {
  id: string;
  lane: RequestLane;
  title: string;
  description: string;
  areaLabel: string | null;
  meetupAt: string | null;
  createdAt: string;
  verifiedOnly: boolean;
  hostDisplayName: string | null;
  hostVerified: boolean;
  tags: string[];
}

export interface WorkspaceProfile {
  id: string;
  displayName: string;
  aboutMe: string;
  homeArea: string;
  role: "member" | "admin";
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
}

export interface WorkspaceSnapshot {
  profile: WorkspaceProfile;
  myRequests: WorkspaceRequest[];
  incomingJoinRequests: WorkspaceJoinReview[];
  activeSession: WorkspaceSession | null;
}
