import { z } from "zod";

export const feedRequestCardSchema = z.object({
  id: z.string().uuid(),
  lane: z.enum(["social", "errand"]),
  title: z.string(),
  description: z.string(),
  areaLabel: z.string(),
  meetupAt: z.string().nullable(),
  createdAt: z.string(),
  verifiedOnly: z.boolean(),
  hostDisplayName: z.string(),
  hostVerified: z.boolean(),
  tags: z.array(z.string()),
});

export const sessionMessageSchema = z.object({
  id: z.number(),
  requestId: z.string().uuid(),
  senderType: z.enum(["user", "system"]),
  senderId: z.string().uuid().nullable(),
  senderName: z.string(),
  body: z.string(),
  createdAt: z.string(),
});

export const workspaceSnapshotSchema = z.object({
  profile: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    aboutMe: z.string(),
    homeArea: z.string(),
    role: z.enum(["member", "admin"]),
  }),
  myRequests: z.array(
    z.object({
      id: z.string().uuid(),
      lane: z.enum(["social", "errand"]),
      title: z.string(),
      areaLabel: z.string(),
      meetupAt: z.string().nullable(),
      status: z.enum(["open", "matched", "completed", "cancelled"]),
      verifiedOnly: z.boolean(),
      pendingJoinCount: z.number(),
      partnerDisplayName: z.string().nullable(),
      partnerId: z.string().uuid().nullable(),
      createdAt: z.string(),
      lastActivityAt: z.string(),
      completedAt: z.string().nullable(),
      userOutcome: z.enum(["completed", "issue"]).nullable(),
      userMeetAgain: z.boolean().nullable(),
    })
  ),
  incomingJoinRequests: z.array(
    z.object({
      id: z.string().uuid(),
      requestId: z.string().uuid(),
      requestTitle: z.string(),
      requestLane: z.enum(["social", "errand"]),
      joinerId: z.string().uuid(),
      joinerDisplayName: z.string(),
      joinerAboutMe: z.string(),
      introMessage: z.string(),
      createdAt: z.string(),
    })
  ),
  activeSession: z
    .object({
      requestId: z.string().uuid(),
      requestTitle: z.string(),
      lane: z.enum(["social", "errand"]),
      areaLabel: z.string(),
      meetupAt: z.string().nullable(),
      checkInEnabled: z.boolean(),
      partnerDisplayName: z.string(),
      partnerId: z.string().uuid(),
      messages: z.array(sessionMessageSchema),
    })
    .nullable(),
});

export const adminDashboardSchema = z.object({
  overview: z.object({
    usersTotal: z.number(),
    openRequests: z.number(),
    matchedRequests: z.number(),
    reportsOpen: z.number(),
    deletionRequestsOpen: z.number(),
  }),
  reports: z.array(
    z.object({
      id: z.string().uuid(),
      requestId: z.string().uuid().nullable(),
      reason: z.string(),
      details: z.string(),
      status: z.enum(["open", "reviewing", "resolved", "dismissed"]),
      createdAt: z.string(),
      reporterId: z.string().uuid(),
      targetUserId: z.string().uuid().nullable(),
      reporterDisplayName: z.string().nullable(),
      targetDisplayName: z.string().nullable(),
    })
  ),
  deletionRequests: z.array(
    z.object({
      id: z.string().uuid(),
      userId: z.string().uuid(),
      reason: z.string(),
      status: z.enum(["pending", "resolved", "cancelled"]),
      createdAt: z.string(),
      displayName: z.string().nullable(),
    })
  ),
});

export const createRequestSchema = z.object({
  lane: z.enum(["social", "errand"]),
  title: z.string().trim().min(6).max(120),
  description: z.string().trim().min(24).max(600),
  areaLabel: z.string().trim().min(3).max(120),
  meetupAt: z.string().trim().nullable(),
  radiusKm: z.number().int().min(1).max(25),
  tags: z.array(z.string().trim().min(1).max(24)).min(1).max(6),
  verifiedOnly: z.boolean(),
  checkInEnabled: z.boolean(),
  captchaToken: z.string().trim().optional().nullable(),
});

export const deleteRequestSchema = z.object({
  requestId: z.string().uuid(),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  aboutMe: z.string().trim().max(300),
  homeArea: z.string().trim().max(120),
});

export const joinRequestSchema = z.object({
  requestId: z.string().uuid(),
  introMessage: z.string().trim().max(220),
});

export const reviewJoinRequestSchema = z.object({
  joinRequestId: z.string().uuid(),
  decision: z.enum(["accepted", "declined"]),
});

export const sendMessageSchema = z.object({
  requestId: z.string().uuid(),
  body: z.string().trim().min(1).max(700),
});

export const completeRequestSchema = z.object({
  requestId: z.string().uuid(),
  outcome: z.enum(["completed", "issue"]),
  meetAgain: z.boolean(),
});

export const createReportSchema = z.object({
  requestId: z.string().uuid(),
  targetUserId: z.string().uuid().nullable(),
  reason: z.string().trim().min(4).max(80),
  details: z.string().trim().max(1200),
  blockTarget: z.boolean(),
});

export const blockUserSchema = z.object({
  userId: z.string().uuid(),
});

export const resolveReportSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(["reviewing", "resolved", "dismissed"]),
  resolutionNote: z.string().trim().max(1200),
});

export const resolveDeletionRequestSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["resolved", "cancelled"]),
  resolutionNote: z.string().trim().max(1200),
});

export const accountDeletionSchema = z.object({
  confirmationText: z.string().trim().max(200),
  reason: z.string().trim().max(600),
});

export const authCredentialSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export const signUpSchema = authCredentialSchema.extend({
  displayName: z.string().trim().min(2).max(60),
  captchaToken: z.string().trim().optional().nullable(),
});

export const signInSchema = authCredentialSchema.extend({
  captchaToken: z.string().trim().optional().nullable(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
  captchaToken: z.string().trim().optional().nullable(),
});
