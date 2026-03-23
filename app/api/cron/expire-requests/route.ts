import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClientOrNull } from "@/lib/supabase/admin";

/**
 * POST /api/cron/expire-requests
 *
 * Expires open requests whose `expires_at` timestamp has passed.
 * Designed to be called by Vercel Cron, Supabase Edge Function, or any scheduler.
 *
 * Authorization: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 * If CRON_SECRET is not set, the endpoint is open (dev-friendly).
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();

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
