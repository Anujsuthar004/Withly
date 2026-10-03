import { NextResponse } from "next/server";

import {
  APP_ENV,
  hasCronSecret,
  hasPushWebhookSecret,
  hasSiteUrl,
  hasSupabaseAdminEnv,
  hasSupabaseEnv,
  hasSupportEmail,
  hasTurnstileEnv,
  hasVapidEnv,
  isProduction,
} from "@/lib/env";
import { getSupabaseAdminClientOrNull } from "@/lib/supabase/admin";

export async function GET() {
  const configurationReady = hasSupabaseEnv
    && hasSupabaseAdminEnv
    && hasTurnstileEnv
    && hasSiteUrl
    && hasSupportEmail
    && hasCronSecret;
  let databaseReady = false;

  const admin = getSupabaseAdminClientOrNull();
  if (admin) {
    try {
      const { error } = await admin.from("profiles")
        .select("id", { head: true })
        .limit(1)
        .abortSignal(AbortSignal.timeout(5_000));
      databaseReady = !error;
    } catch {
      databaseReady = false;
    }
  }

  const healthy = configurationReady && databaseReady;
  const body = isProduction
    ? { status: healthy ? "ok" : "unavailable", now: new Date().toISOString() }
    : {
        status: healthy ? "ok" : "unavailable",
        now: new Date().toISOString(),
        appEnv: APP_ENV,
        dependencies: {
          database: databaseReady,
          cronSecret: hasCronSecret,
          push: hasVapidEnv && hasPushWebhookSecret,
          siteUrl: hasSiteUrl,
          supabase: hasSupabaseEnv,
          supabaseAdmin: hasSupabaseAdminEnv,
          supportEmail: hasSupportEmail,
          turnstile: hasTurnstileEnv,
        },
      };

  return NextResponse.json(body, {
    status: healthy ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
