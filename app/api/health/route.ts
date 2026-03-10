import { NextResponse } from "next/server";

import { APP_ENV, hasSupabaseAdminEnv, hasSupabaseEnv, hasTurnstileEnv, isProduction } from "@/lib/env";

export async function GET() {
  const body = isProduction
    ? { status: "ok", now: new Date().toISOString() }
    : {
        status: "ok",
        now: new Date().toISOString(),
        appEnv: APP_ENV,
        hasSupabaseEnv,
        hasSupabaseAdminEnv,
        hasTurnstileEnv,
      };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
