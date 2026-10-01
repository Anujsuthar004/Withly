import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { APP_ENV, CRON_SECRET } from "@/lib/env";
import { getSupabaseAdminClientOrNull } from "@/lib/supabase/admin";

/**
 * POST /api/cron/expire-requests
 *
 * Expires open requests whose `expires_at` timestamp has passed.
 * Designed to be called by Vercel Cron, Supabase Edge Function, or any scheduler.
 *
 * Authorization: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 * In production, a missing secret fails closed. Development may omit it.
 */
async function expireRequests(request: NextRequest) {
  const cronSecret = CRON_SECRET;
  const isProduction = APP_ENV === "production";

  if (!cronSecret && isProduction) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (cronSecret) {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (token.length !== cronSecret.length ||
      !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(cronSecret))) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const admin = getSupabaseAdminClientOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data, error } = await admin.rpc("expire_stale_requests");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, expiredCount: data ?? 0 },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(request: NextRequest) {
  return expireRequests(request);
}

export async function POST(request: NextRequest) {
  return expireRequests(request);
}
