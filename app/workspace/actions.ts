"use server";

import { revalidatePath } from "next/cache";

import { ALLOWED_PROFILE_AVATAR_MIME_TYPES, createProfileAvatarPath, MAX_PROFILE_AVATAR_BYTES, PROFILE_AVATAR_BUCKET } from "@/lib/avatar";
import { hasSupabaseAdminEnv, hasSupabaseEnv } from "@/lib/env";
import { logAppEvent } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { enforceRateLimit, getRequestMeta, verifyTurnstileToken } from "@/lib/security";
import {
  accountDeletionSchema,
  blockUserSchema,
  completeRequestSchema,
  createCommunitySchema,
  createReportSchema,
  createRequestSchema,
  deleteAvailabilityWindowSchema,
  deleteRequestSchema,
  joinCommunitySchema,
  joinRequestSchema,
  markNotificationsReadSchema,
  resolveDeletionRequestSchema,
  resolveReportSchema,
  resolveSosSchema,
  reviewJoinRequestSchema,
  sendMessageSchema,
  setAvailabilityWindowSchema,
  setEmergencyContactSchema,
  submitCheckInSchema,
  triggerSosSchema,
  updateProfileSchema,
  upgradeVerificationSchema,
} from "@/lib/validators";

interface ActionResult {
  ok: boolean;
  message: string;
  accountDeleted?: boolean;
}

async function ensureProfileAvatarBucket() {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.createBucket(PROFILE_AVATAR_BUCKET, {
    public: false,
  });

  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw error;
  }
}

async function enforceAuthenticatedActionLimit(userId: string, action: string, limit: number, windowMs: number) {
  const requestMeta = await getRequestMeta();
  const rateLimit = await enforceRateLimit({
    action,
    identifier: `${userId}:${requestMeta.ip}`,
    limit,
    windowMs,
  });

  if (!rateLimit.ok) {
    return {
      ok: false,
      message: `Too many ${action.replaceAll("-", " ")} attempts. Try again in about ${rateLimit.retryAfterSeconds} seconds.`,
    } satisfies ActionResult;
  }

  return null;
}

async function requireSupabaseSession() {
  if (!hasSupabaseEnv) {
    return {
      supabase: null,
      user: null,
      error: { ok: false, message: "This action is unavailable right now." } satisfies ActionResult,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase: null,
      user: null,
      error: { ok: false, message: "Sign in to continue." } satisfies ActionResult,
    };
  }

  return { supabase, user, error: null };
}

export async function createRequestAction(input: unknown): Promise<ActionResult> {
  const auth = await requireSupabaseSession();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error ?? { ok: false, message: "Sign in to continue." };
  }

  const parsed = createRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request payload." };
  }

  const rateLimitError = await enforceAuthenticatedActionLimit(auth.user.id, "create-request", 10, 10 * 60 * 1000);
  if (rateLimitError) {
    return rateLimitError;
  }

  const requestMeta = await getRequestMeta();
  const captchaCheck = await verifyTurnstileToken(parsed.data.captchaToken ?? null, requestMeta.ip);
  if (!captchaCheck.ok) {
    return { ok: false, message: captchaCheck.message ?? "Complete the anti-bot check first." };
  }

  const payload = parsed.data;
  const meetupAt = payload.meetupAt ? new Date(payload.meetupAt).toISOString() : null;

  const { error } = await auth.supabase.rpc("create_request", {
    lane_input: payload.lane,
    title_input: payload.title,
    description_input: payload.description,
    area_label_input: payload.areaLabel,
    meetup_at_input: meetupAt,
    radius_km_input: payload.radiusKm,
    tags_input: payload.tags,
    verified_only_input: payload.verifiedOnly,
    check_in_enabled_input: payload.checkInEnabled,
  });

  if (error) {
    await logAppEvent({
      level: "warn",
      category: "request.create",
      message: "Request creation failed.",
      context: { userId: auth.user.id, error: error.message },
    });
    return { ok: false, message: error.message };
  }

  await logAppEvent({
    level: "info",
    category: "request.create",
    message: "Request created.",
    context: { userId: auth.user.id, lane: payload.lane },
  });
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/feed");
  revalidatePath("/requests");
  return { ok: true, message: "Request posted." };
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const auth = await requireSupabaseSession();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error ?? { ok: false, message: "Sign in to continue." };
  }

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid profile payload." };
  }

  const { error } = await auth.supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      about_me: parsed.data.aboutMe,
      home_area: parsed.data.homeArea,
    })
    .eq("id", auth.user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/inbox");
  revalidatePath("/requests");
  revalidatePath("/feed");
  return { ok: true, message: "Profile updated." };
}

export async function uploadProfileAvatarAction(formData: FormData): Promise<ActionResult> {
  const auth = await requireSupabaseSession();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error ?? { ok: false, message: "Sign in to continue." };
  }

  if (!hasSupabaseAdminEnv) {
    return { ok: false, message: "Photo uploads are unavailable right now." };
  }

  const fileEntry = formData.get("avatar");
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return { ok: false, message: "Choose a photo first." };
  }

  if (!ALLOWED_PROFILE_AVATAR_MIME_TYPES.has(fileEntry.type)) {
    return { ok: false, message: "Use a JPG, PNG, or WebP image." };
  }

  if (fileEntry.size > MAX_PROFILE_AVATAR_BYTES) {
    return { ok: false, message: "Keep the photo under 4 MB." };
  }

  try {
    await ensureProfileAvatarBucket();
  } catch {
    return { ok: false, message: "Photo uploads are unavailable right now." };
  }

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profileError) {
    if (/avatar_path/i.test(profileError.message)) {
      return { ok: false, message: "Profile photos need one quick database update before they can be used." };
    }
    return { ok: false, message: profileError.message };
  }

  const avatarPath = createProfileAvatarPath(auth.user.id, fileEntry.name, fileEntry.type);
  const admin = createSupabaseAdminClient();
  const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());

  const { error: uploadError } = await admin.storage.from(PROFILE_AVATAR_BUCKET).upload(avatarPath, fileBuffer, {
    contentType: fileEntry.type,
    cacheControl: "3600",
    upsert: false,
  });

  if (uploadError) {
    return { ok: false, message: uploadError.message };
  }

  const { error: updateError } = await auth.supabase.from("profiles").update({ avatar_path: avatarPath }).eq("id", auth.user.id);

  if (updateError) {
    await admin.storage.from(PROFILE_AVATAR_BUCKET).remove([avatarPath]);
    if (/avatar_path/i.test(updateError.message)) {
      return { ok: false, message: "Profile photos need one quick database update before they can be used." };
    }
    return { ok: false, message: updateError.message };
  }

  if (profile?.avatar_path && profile.avatar_path !== avatarPath) {
    await admin.storage.from(PROFILE_AVATAR_BUCKET).remove([profile.avatar_path]);
  }

  revalidatePath("/profile");
  revalidatePath("/feed");
  revalidatePath("/requests");
  revalidatePath("/inbox");

  return { ok: true, message: "Profile photo updated." };
}

export async function removeProfileAvatarAction(): Promise<ActionResult> {
  const auth = await requireSupabaseSession();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error ?? { ok: false, message: "Sign in to continue." };
  }

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profileError) {
    if (/avatar_path/i.test(profileError.message)) {
      return { ok: false, message: "Profile photos need one quick database update before they can be used." };
    }
    return { ok: false, message: profileError.message };
  }

  if (!profile?.avatar_path) {
    return { ok: true, message: "No profile photo to remove." };
  }

  const { error: updateError } = await auth.supabase.from("profiles").update({ avatar_path: null }).eq("id", auth.user.id);
  if (updateError) {
    if (/avatar_path/i.test(updateError.message)) {
      return { ok: false, message: "Profile photos need one quick database update before they can be used." };
    }
    return { ok: false, message: updateError.message };
  }

  if (hasSupabaseAdminEnv) {
    const admin = createSupabaseAdminClient();
    await admin.storage.from(PROFILE_AVATAR_BUCKET).remove([profile.avatar_path]);
  }

  revalidatePath("/profile");
  revalidatePath("/feed");
  revalidatePath("/requests");
  revalidatePath("/inbox");

  return { ok: true, message: "Profile photo removed." };
}

export async function submitJoinRequestAction(input: unknown): Promise<ActionResult> {
  const auth = await requireSupabaseSession();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error ?? { ok: false, message: "Sign in to continue." };
  }

  const parsed = joinRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid join request." };
  }

  const rateLimitError = await enforceAuthenticatedActionLimit(auth.user.id, "join-request", 16, 10 * 60 * 1000);
  if (rateLimitError) {
    return rateLimitError;
  }

  const { error } = await auth.supabase.rpc("submit_join_request", {
    request_id_input: parsed.data.requestId,
    intro_message_input: parsed.data.introMessage,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/feed");
  revalidatePath(`/requests/${parsed.data.requestId}`);
  return { ok: true, message: "Join request sent." };
}

export async function reviewJoinRequestAction(input: unknown): Promise<ActionResult> {
  const auth = await requireSupabaseSession();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error ?? { ok: false, message: "Sign in to continue." };
  }

  const parsed = reviewJoinRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid review action." };
  }

  const rateLimitError = await enforceAuthenticatedActionLimit(auth.user.id, "review-join-request", 30, 10 * 60 * 1000);
  if (rateLimitError) {
    return rateLimitError;
  }

  const { error } = await auth.supabase.rpc("review_join_request", {
    join_request_id_input: parsed.data.joinRequestId,
    decision_input: parsed.data.decision,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/inbox");
  revalidatePath("/requests");
  return {
    ok: true,
    message: parsed.data.decision === "accepted" ? "Match confirmed." : "Join request declined.",
  };
}

export async function sendMessageAction(input: unknown): Promise<ActionResult> {
  const auth = await requireSupabaseSession();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error ?? { ok: false, message: "Sign in to continue." };
  }

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid message." };
  }

  const rateLimitError = await enforceAuthenticatedActionLimit(auth.user.id, "send-message", 60, 60 * 1000);
  if (rateLimitError) {
    return rateLimitError;
  }

  const { error } = await auth.supabase.rpc("send_request_message", {
    request_id_input: parsed.data.requestId,
    body_input: parsed.data.body,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/inbox");
  revalidatePath(`/sessions/${parsed.data.requestId}`);
  return { ok: true, message: "Message sent." };
}

export async function completeRequestAction(input: unknown): Promise<ActionResult> {
  const auth = await requireSupabaseSession();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error ?? { ok: false, message: "Sign in to continue." };
  }

  const parsed = completeRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid completion payload." };
  }

  const { error } = await auth.supabase.rpc("complete_request_session", {
    request_id_input: parsed.data.requestId,
    outcome_input: parsed.data.outcome,
    meet_again_input: parsed.data.meetAgain,
  });

  if (error) {
    await logAppEvent({
      level: "warn",
      category: "request.complete",
      message: "Completion update failed.",
      context: { userId: auth.user.id, requestId: parsed.data.requestId, error: error.message },
    });
    return { ok: false, message: error.message };
  }

  await logAppEvent({
    level: "info",
    category: "request.complete",
    message: "Completion update recorded.",
    context: { userId: auth.user.id, requestId: parsed.data.requestId, outcome: parsed.data.outcome },
  });
  revalidatePath("/requests");
  revalidatePath(`/requests/${parsed.data.requestId}`);
  revalidatePath(`/sessions/${parsed.data.requestId}`);
  return {
    ok: true,
    message: parsed.data.outcome === "completed" ? "Session marked complete." : "Issue recorded for follow-up.",
  };
}

export async function createReportAction(input: unknown): Promise<ActionResult> {
  const auth = await requireSupabaseSession();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error ?? { ok: false, message: "Sign in to continue." };
  }

  const parsed = createReportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid report payload." };
  }

  const rateLimitError = await enforceAuthenticatedActionLimit(auth.user.id, "create-report", 8, 60 * 60 * 1000);
  if (rateLimitError) {
    return rateLimitError;
  }

  const { error } = await auth.supabase.rpc("create_report", {
    request_id_input: parsed.data.requestId,
    target_user_id_input: parsed.data.targetUserId,
    reason_input: parsed.data.reason,
    details_input: parsed.data.details,
    block_target_input: parsed.data.blockTarget,
  });

  if (error) {
    await logAppEvent({
      level: "warn",
      category: "report.create",
      message: "Report submission failed.",
      context: { userId: auth.user.id, requestId: parsed.data.requestId, error: error.message },
    });
    return { ok: false, message: error.message };
  }

  await logAppEvent({
    level: "warn",
    category: "report.create",
    message: "Report submitted.",
    context: {
      userId: auth.user.id,
      requestId: parsed.data.requestId,
      targetUserId: parsed.data.targetUserId,
      blockTarget: parsed.data.blockTarget,
    },
  });
  revalidatePath("/requests");
  revalidatePath(`/requests/${parsed.data.requestId}`);
  revalidatePath("/admin");
  return {
    ok: true,
    message: parsed.data.blockTarget ? "Report submitted and user blocked." : "Report submitted.",
  };
}

export async function blockUserAction(input: unknown): Promise<ActionResult> {
  const auth = await requireSupabaseSession();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error ?? { ok: false, message: "Sign in to continue." };
  }

  const parsed = blockUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid block payload." };
  }

  const { error } = await auth.supabase.rpc("block_user", {
    blocked_user_id_input: parsed.data.userId,
  });

  if (error) {
    await logAppEvent({
      level: "warn",
      category: "user.block",
      message: "Block action failed.",
      context: { userId: auth.user.id, blockedUserId: parsed.data.userId, error: error.message },
    });
    return { ok: false, message: error.message };
  }

  await logAppEvent({
    level: "warn",
    category: "user.block",
    message: "User blocked.",
    context: { userId: auth.user.id, blockedUserId: parsed.data.userId },
  });
  revalidatePath("/requests");
  revalidatePath("/inbox");
  return { ok: true, message: "User blocked." };
}

export async function resolveDeletionRequestAction(input: unknown): Promise<ActionResult> {
  const auth = await requireSupabaseSession();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error ?? { ok: false, message: "Sign in to continue." };
  }

  const parsed = resolveDeletionRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid deletion review payload." };
  }

  const { error } = await auth.supabase.rpc("resolve_account_deletion_request", {
    request_id_input: parsed.data.requestId,
    status_input: parsed.data.status,
    resolution_note_input: parsed.data.resolutionNote,
  });

  if (error) {
    await logAppEvent({
      level: "warn",
      category: "deletion.resolve",
      message: "Deletion request resolution failed.",
      context: { adminUserId: auth.user.id, requestId: parsed.data.requestId, error: error.message },
    });
    return { ok: false, message: error.message };
  }

  await logAppEvent({
    level: "warn",
    category: "deletion.resolve",
    message: "Deletion request updated.",
    context: { adminUserId: auth.user.id, requestId: parsed.data.requestId, status: parsed.data.status },
  });
  revalidatePath("/admin");
  return { ok: true, message: "Deletion request updated." };
}

export async function resolveReportAction(input: unknown): Promise<ActionResult> {
  const auth = await requireSupabaseSession();
  if (auth.error || !auth.supabase || !auth.user) {
    return auth.error ?? { ok: false, message: "Sign in to continue." };
  }

  const parsed = resolveReportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid moderation payload." };
  }

  const { error } = await auth.supabase.rpc("resolve_report", {
    report_id_input: parsed.data.reportId,
    status_input: parsed.data.status,
    resolution_note_input: parsed.data.resolutionNote,
  });

  if (error) {
    await logAppEvent({
      level: "warn",
      category: "report.resolve",
      message: "Report resolution failed.",
      context: { adminUserId: auth.user.id, reportId: parsed.data.reportId, error: error.message },
    });
    return { ok: false, message: error.message };
  }

  await logAppEvent({
    level: "warn",
    category: "report.resolve",
    message: "Report updated.",
    context: { adminUserId: auth.user.id, reportId: parsed.data.reportId, status: parsed.data.status },
  });
  revalidatePath("/admin");
  return { ok: true, message: "Report updated." };
}

export async function deleteAccountAction(input: unknown): Promise<ActionResult> {
  const auth = await requireSupabaseSession();
  if (auth.error || !auth.user) {
    return auth.error ?? { ok: false, message: "Sign in to continue." };
  }

  const parsed = accountDeletionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid deletion request." };
  }

  if (parsed.data.confirmationText !== "DELETE MY ACCOUNT") {
    return { ok: false, message: 'Type "DELETE MY ACCOUNT" to confirm.' };
  }

  if (!hasSupabaseAdminEnv) {
    if (!auth.supabase) {
      return { ok: false, message: "Could not access your account right now." };
    }

    const { error } = await auth.supabase.rpc("submit_account_deletion_request", {
      reason_input: parsed.data.reason,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return {
      ok: true,
      message: "Deletion request recorded. Configure SUPABASE_SERVICE_ROLE_KEY to enable instant self-serve deletion.",
      accountDeleted: false,
    };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(auth.user.id, true);
  if (error) {
    await logAppEvent({
      level: "error",
      category: "account.delete",
      message: "Account deletion failed.",
      context: { userId: auth.user.id, error: error.message },
    });
    return { ok: false, message: error.message };
  }

  await logAppEvent({
    level: "warn",
    category: "account.delete",
    message: "Account deleted.",
    context: { userId: auth.user.id, reason: parsed.data.reason },
  });

  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/explore");
  return { ok: true, message: "Account deleted permanently.", accountDeleted: true };
}

export async function deleteRequestAction(input: unknown): Promise<ActionResult> {
  try {
    const auth = await requireSupabaseSession();
    if (auth.error || !auth.supabase || !auth.user) {
      return auth.error ?? { ok: false, message: "Sign in to continue." };
    }

    const parsed = deleteRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid deletion payload." };
    }

    const rateLimitError = await enforceAuthenticatedActionLimit(auth.user.id, "delete-request", 10, 10 * 60 * 1000);
    if (rateLimitError) {
      return rateLimitError;
    }

    const { error } = await auth.supabase.rpc("delete_request", {
      request_id_input: parsed.data.requestId,
    });

    if (error) {
      await logAppEvent({
        level: "warn",
        category: "request.delete",
        message: "Request deletion failed.",
        context: { userId: auth.user.id, requestId: parsed.data.requestId, error: error.message },
      }).catch(() => undefined);
      return { ok: false, message: error.message };
    }

    await logAppEvent({
      level: "warn",
      category: "request.delete",
      message: "Request deleted.",
      context: { userId: auth.user.id, requestId: parsed.data.requestId },
    }).catch(() => undefined);

    revalidatePath("/");
    revalidatePath("/explore");
    revalidatePath("/feed");
    revalidatePath("/requests");
    revalidatePath(`/requests/${parsed.data.requestId}`);
    return { ok: true, message: "Request deleted." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete this request right now.";
    return { ok: false, message };
  }
}

// -- Feature 1: Safety Check-Ins --

export async function submitCheckInAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const auth = await requireSupabaseSession();
    if (auth.error || !auth.supabase || !auth.user) {
      return auth.error ?? { ok: false, message: "Sign in to continue." };
    }

    const parsed = submitCheckInSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, message: "Invalid check-in data." };

    const rateLimitError = await enforceAuthenticatedActionLimit(auth.user.id, "check-in", 20, 60 * 60 * 1000);
    if (rateLimitError) return rateLimitError;

    const { error } = await auth.supabase.rpc("submit_check_in", {
      request_id_input: parsed.data.requestId,
      status_input: parsed.data.status,
      note_input: parsed.data.note,
    });

    if (error) return { ok: false, message: error.message };

    await logAppEvent({
      level: "info",
      category: "checkin.submit",
      message: "Check-in submitted.",
      context: { userId: auth.user.id, requestId: parsed.data.requestId, status: parsed.data.status },
    }).catch(() => undefined);

    revalidatePath("/");
    return { ok: true, message: "Check-in submitted." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit check-in.";
    return { ok: false, message };
  }
}

// -- Feature 2: Notifications --

export async function markNotificationsReadAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const auth = await requireSupabaseSession();
    if (auth.error || !auth.supabase || !auth.user) {
      return auth.error ?? { ok: false, message: "Sign in to continue." };
    }

    const rawIds = formData.get("notificationIds");
    const ids = typeof rawIds === "string" ? JSON.parse(rawIds) : [];
    const parsed = markNotificationsReadSchema.safeParse({ notificationIds: ids });
    if (!parsed.success) return { ok: false, message: "Invalid notification IDs." };

    const { error } = await auth.supabase.rpc("mark_notifications_read", {
      notification_ids: parsed.data.notificationIds,
    });

    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Notifications marked as read." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not mark notifications.";
    return { ok: false, message };
  }
}

// -- Feature 5: Availability Windows --

export async function setAvailabilityWindowAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const auth = await requireSupabaseSession();
    if (auth.error || !auth.supabase || !auth.user) {
      return auth.error ?? { ok: false, message: "Sign in to continue." };
    }

    const parsed = setAvailabilityWindowSchema.safeParse({
      dayOfWeek: Number(formData.get("dayOfWeek")),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      label: formData.get("label"),
    });
    if (!parsed.success) return { ok: false, message: "Invalid availability data." };

    const rateLimitError = await enforceAuthenticatedActionLimit(auth.user.id, "availability", 30, 60 * 60 * 1000);
    if (rateLimitError) return rateLimitError;

    const { error } = await auth.supabase.rpc("set_availability_window", {
      day_input: parsed.data.dayOfWeek,
      start_time_input: parsed.data.startTime,
      end_time_input: parsed.data.endTime,
      label_input: parsed.data.label,
    });

    if (error) return { ok: false, message: error.message };

    revalidatePath("/profile");
    return { ok: true, message: "Availability window saved." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save availability.";
    return { ok: false, message };
  }
}

export async function deleteAvailabilityWindowAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const auth = await requireSupabaseSession();
    if (auth.error || !auth.supabase || !auth.user) {
      return auth.error ?? { ok: false, message: "Sign in to continue." };
    }

    const parsed = deleteAvailabilityWindowSchema.safeParse({ windowId: formData.get("windowId") });
    if (!parsed.success) return { ok: false, message: "Invalid window ID." };

    const { error } = await auth.supabase.rpc("delete_availability_window", {
      window_id_input: parsed.data.windowId,
    });

    if (error) return { ok: false, message: error.message };

    revalidatePath("/profile");
    return { ok: true, message: "Availability window removed." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove availability.";
    return { ok: false, message };
  }
}

// -- Feature 6: Verification Upgrade --

export async function upgradeVerificationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const auth = await requireSupabaseSession();
    if (auth.error || !auth.supabase || !auth.user) {
      return auth.error ?? { ok: false, message: "Sign in to continue." };
    }

    const parsed = upgradeVerificationSchema.safeParse({
      tier: formData.get("tier"),
      phoneHash: formData.get("phoneHash"),
    });
    if (!parsed.success) return { ok: false, message: "Invalid verification data." };

    const rateLimitError = await enforceAuthenticatedActionLimit(auth.user.id, "verification", 5, 60 * 60 * 1000);
    if (rateLimitError) return rateLimitError;

    const { error } = await auth.supabase.rpc("upgrade_verification_tier", {
      new_tier: parsed.data.tier,
      phone_hash_input: parsed.data.phoneHash ?? null,
    });

    if (error) return { ok: false, message: error.message };

    await logAppEvent({
      level: "info",
      category: "verification.upgrade",
      message: "Verification tier upgraded.",
      context: { userId: auth.user.id, tier: parsed.data.tier },
    }).catch(() => undefined);

    revalidatePath("/profile");
    revalidatePath("/account");
    return { ok: true, message: `Verification upgraded to ${parsed.data.tier}.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upgrade verification.";
    return { ok: false, message };
  }
}

// -- Feature 9: Emergency SOS --

export async function setEmergencyContactAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const auth = await requireSupabaseSession();
    if (auth.error || !auth.supabase || !auth.user) {
      return auth.error ?? { ok: false, message: "Sign in to continue." };
    }

    const parsed = setEmergencyContactSchema.safeParse({
      contactName: formData.get("contactName"),
      contactPhone: formData.get("contactPhone"),
      contactEmail: formData.get("contactEmail") || null,
    });
    if (!parsed.success) return { ok: false, message: "Invalid emergency contact data." };

    const rateLimitError = await enforceAuthenticatedActionLimit(auth.user.id, "emergency-contact", 10, 60 * 60 * 1000);
    if (rateLimitError) return rateLimitError;

    const { error } = await auth.supabase.rpc("set_emergency_contact", {
      name_input: parsed.data.contactName,
      phone_input: parsed.data.contactPhone,
      email_input: parsed.data.contactEmail ?? null,
    });

    if (error) return { ok: false, message: error.message };

    await logAppEvent({
      level: "info",
      category: "emergency.contact",
      message: "Emergency contact updated.",
      context: { userId: auth.user.id },
    }).catch(() => undefined);

    revalidatePath("/account");
    return { ok: true, message: "Emergency contact saved." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save emergency contact.";
    return { ok: false, message };
  }
}

export async function triggerSosAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const auth = await requireSupabaseSession();
    if (auth.error || !auth.supabase || !auth.user) {
      return auth.error ?? { ok: false, message: "Sign in to continue." };
    }

    const parsed = triggerSosSchema.safeParse({
      requestId: formData.get("requestId"),
      locationText: formData.get("locationText"),
    });
    if (!parsed.success) return { ok: false, message: "Invalid SOS data." };

    const { error } = await auth.supabase.rpc("trigger_sos_alert", {
      request_id_input: parsed.data.requestId,
      location_text_input: parsed.data.locationText,
    });

    if (error) return { ok: false, message: error.message };

    await logAppEvent({
      level: "warn",
      category: "sos.triggered",
      message: "SOS alert triggered.",
      context: { userId: auth.user.id, requestId: parsed.data.requestId },
    }).catch(() => undefined);

    revalidatePath("/");
    return { ok: true, message: "SOS alert sent. Your companion and emergency contact have been notified." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not trigger SOS.";
    return { ok: false, message };
  }
}

export async function resolveSosAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const auth = await requireSupabaseSession();
    if (auth.error || !auth.supabase || !auth.user) {
      return auth.error ?? { ok: false, message: "Sign in to continue." };
    }

    const parsed = resolveSosSchema.safeParse({
      alertId: formData.get("alertId"),
      status: formData.get("status"),
    });
    if (!parsed.success) return { ok: false, message: "Invalid resolve data." };

    const { error } = await auth.supabase.rpc("resolve_sos_alert", {
      alert_id_input: parsed.data.alertId,
      resolution_status: parsed.data.status,
    });

    if (error) return { ok: false, message: error.message };

    await logAppEvent({
      level: "info",
      category: "sos.resolved",
      message: "SOS alert resolved.",
      context: { userId: auth.user.id, alertId: parsed.data.alertId, status: parsed.data.status },
    }).catch(() => undefined);

    revalidatePath("/");
    return { ok: true, message: "SOS alert resolved." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not resolve SOS.";
    return { ok: false, message };
  }
}

// -- Feature 11: Communities --

export async function createCommunityAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const auth = await requireSupabaseSession();
    if (auth.error || !auth.supabase || !auth.user) {
      return auth.error ?? { ok: false, message: "Sign in to continue." };
    }

    const parsed = createCommunitySchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
      isPrivate: formData.get("isPrivate") === "true",
    });
    if (!parsed.success) return { ok: false, message: "Invalid community data." };

    const rateLimitError = await enforceAuthenticatedActionLimit(auth.user.id, "community-create", 5, 24 * 60 * 60 * 1000);
    if (rateLimitError) return rateLimitError;

    const { error } = await auth.supabase.rpc("create_community", {
      name_input: parsed.data.name,
      description_input: parsed.data.description,
      is_private_input: parsed.data.isPrivate,
    });

    if (error) return { ok: false, message: error.message };

    await logAppEvent({
      level: "info",
      category: "community.create",
      message: "Community created.",
      context: { userId: auth.user.id, name: parsed.data.name },
    }).catch(() => undefined);

    revalidatePath("/");
    return { ok: true, message: "Community created." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create community.";
    return { ok: false, message };
  }
}

export async function joinCommunityAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const auth = await requireSupabaseSession();
    if (auth.error || !auth.supabase || !auth.user) {
      return auth.error ?? { ok: false, message: "Sign in to continue." };
    }

    const parsed = joinCommunitySchema.safeParse({ communityId: formData.get("communityId") });
    if (!parsed.success) return { ok: false, message: "Invalid community ID." };

    const rateLimitError = await enforceAuthenticatedActionLimit(auth.user.id, "community-join", 10, 60 * 60 * 1000);
    if (rateLimitError) return rateLimitError;

    const { error } = await auth.supabase.rpc("join_community", {
      community_id_input: parsed.data.communityId,
    });

    if (error) return { ok: false, message: error.message };

    await logAppEvent({
      level: "info",
      category: "community.join",
      message: "Joined community.",
      context: { userId: auth.user.id, communityId: parsed.data.communityId },
    }).catch(() => undefined);

    revalidatePath("/");
    return { ok: true, message: "You joined the community." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not join community.";
    return { ok: false, message };
  }
}


