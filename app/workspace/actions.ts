"use server";

import { revalidatePath } from "next/cache";

import { hasSupabaseAdminEnv, hasSupabaseEnv } from "@/lib/env";
import { logAppEvent } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { enforceRateLimit, getRequestMeta, verifyTurnstileToken } from "@/lib/security";
import {
  accountDeletionSchema,
  blockUserSchema,
  completeRequestSchema,
  createReportSchema,
  createRequestSchema,
  joinRequestSchema,
  resolveDeletionRequestSchema,
  resolveReportSchema,
  reviewJoinRequestSchema,
  sendMessageSchema,
  updateProfileSchema,
} from "@/lib/validators";

interface ActionResult {
  ok: boolean;
  message: string;
  accountDeleted?: boolean;
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
  return { ok: true, message: "Profile updated." };
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
