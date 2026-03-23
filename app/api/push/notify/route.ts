import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { PUSH_WEBHOOK_SECRET, hasVapidEnv } from "@/lib/env";
import { getSupabaseAdminClientOrNull } from "@/lib/supabase/admin";
import { sendPushNotification, type PushSubscriptionJSON } from "@/lib/webpush";

type SupabaseWebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id: string;
    user_id: string;
    kind: string;
    title: string;
    body: string;
    ref_id: string | null;
  } | null;
};

function notificationUrl(kind: string, refId: string | null): string {
  switch (kind) {
    case "join_request_received":
    case "join_request_accepted":
    case "join_request_declined":
      return refId ? `/requests/${refId}` : "/inbox";
    case "message_received":
    case "session_completed":
    case "meet_again_mutual":
    case "check_in_due":
    case "check_in_missed":
    case "sos_triggered":
      return refId ? `/sessions/${refId}` : "/inbox";
    default:
      return "/inbox";
  }
}

export async function POST(request: NextRequest) {
  if (!hasVapidEnv) {
    return NextResponse.json({ ok: true, skipped: "vapid_not_configured" });
  }

  // Verify webhook secret using constant-time comparison to prevent timing attacks
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!PUSH_WEBHOOK_SECRET || token.length !== PUSH_WEBHOOK_SECRET.length ||
    !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(PUSH_WEBHOOK_SECRET))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: SupabaseWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (payload.type !== "INSERT" || !payload.record) {
    return NextResponse.json({ ok: true, skipped: "not_an_insert" });
  }

  const { user_id, kind, title, body, ref_id } = payload.record;

  const admin = getSupabaseAdminClientOrNull();
  if (!admin) {
    return NextResponse.json({ ok: true, skipped: "admin_not_configured" });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("push_subscription")
    .eq("id", user_id)
    .single();

  const subscription = profile?.push_subscription as PushSubscriptionJSON | null;
  if (!subscription?.endpoint) {
    return NextResponse.json({ ok: true, skipped: "no_subscription" });
  }

  const result = await sendPushNotification(subscription, {
    title,
    body,
    url: notificationUrl(kind, ref_id),
    tag: kind,
  });

  // Subscription expired — clear it so we stop trying
  if (result.gone) {
    await admin
      .from("profiles")
      .update({ push_subscription: null })
      .eq("id", user_id);
  }

  return NextResponse.json({ ok: result.ok });
}
