import { NextResponse } from "next/server";

import { APP_ENV, hasSupabaseAdminEnv, hasSupabaseEnv, hasTurnstileEnv } from "@/lib/env";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      now: new Date().toISOString(),
      appEnv: APP_ENV,
      hasSupabaseEnv,
      hasSupabaseAdminEnv,
      hasTurnstileEnv,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
