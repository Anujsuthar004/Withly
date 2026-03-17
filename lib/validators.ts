import { z } from "zod";

export const feedRequestCardSchema = z.object({
  id: z.string().uuid(),
  lane: z.enum(["social", "errand"]),
  title: z.string(),
  description: z.string(),
  areaLabel: z.string().nullable(),
  meetupAt: z.string().nullable(),
  expiresAt: z.string().nullable().optional().default(null),
  createdAt: z.string(),
  verifiedOnly: z.boolean(),
  hostDisplayName: z.string().nullable(),
  hostVerified: z.boolean(),
  hostTrustScore: z.number().optional().default(50),
  hostVerificationTier: z.enum(["email", "phone", "id_verified"]).optional().default("email"),
  tags: z.array(z.string()),
  compatibilityScore: z.number().nullable().optional().default(null),
  maxCompanions: z.number().optional().default(1),
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
    avatarUrl: z.string().optional().default(""),
    verificationTier: z.enum(["email", "phone", "id_verified"]).optional().default("email"),
    trustScore: z.number().optional().default(50),
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
      maxCompanions: z.number().optional().default(1),
      companionIds: z.array(z.string().uuid()).optional().default([]),
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
  expiresAt: z.string().trim().nullable().optional(),
  radiusKm: z.number().int().min(1).max(25),
  tags: z.array(z.string().trim().min(1).max(24)).min(1).max(6),
  verifiedOnly: z.boolean(),
  checkInEnabled: z.boolean(),
  maxCompanions: z.number().int().min(1).max(5).optional().default(1),
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

// --- New feature schemas ---

export const submitCheckInSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["ok", "missed", "sos"]).optional().default("ok"),
  note: z.string().trim().max(300).optional().default(""),
});

export const setAvailabilityWindowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().trim().min(4).max(8),
  endTime: z.string().trim().min(4).max(8),
  label: z.string().trim().max(80).optional().default(""),
});

export const deleteAvailabilityWindowSchema = z.object({
  windowId: z.string().uuid(),
});

export const setEmergencyContactSchema = z.object({
  contactName: z.string().trim().min(2).max(60),
  contactPhone: z.string().trim().min(6).max(20),
  contactEmail: z.string().trim().email().nullable().optional(),
});

export const triggerSosSchema = z.object({
  requestId: z.string().uuid(),
  locationText: z.string().trim().max(200).optional().default(""),
});

export const resolveSosSchema = z.object({
  alertId: z.string().uuid(),
  status: z.enum(["resolved", "false_alarm"]).optional().default("resolved"),
});

export const upgradeVerificationSchema = z.object({
  tier: z.enum(["phone", "id_verified"]),
  phoneHash: z.string().trim().optional().nullable(),
});

export const createCommunitySchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(400).optional().default(""),
  isPrivate: z.boolean().optional().default(false),
});

export const joinCommunitySchema = z.object({
  communityId: z.string().uuid(),
});

export const markNotificationsReadSchema = z.object({
  notificationIds: z.array(z.number().int()).min(1).max(100),
});

export const notificationSchema = z.object({
  id: z.number(),
  kind: z.string(),
  title: z.string(),
  body: z.string(),
  refId: z.string().uuid().nullable(),
  read: z.boolean(),
  createdAt: z.string(),
});
