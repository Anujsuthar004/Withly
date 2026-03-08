import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { logAppEvent } from "@/lib/logger";
import { enforceRateLimit, verifyTurnstileToken } from "@/lib/security";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { signInSchema } from "@/lib/validators";

function requestMeta(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  return {
    ip: forwardedFor.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  };
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const payload = signInSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message ?? "Invalid sign-in payload." }, { status: 400 });
  }

  const meta = requestMeta(request);
  const rateLimit = await enforceRateLimit({
    action: "auth-sign-in",
    identifier: `${payload.data.email}:${meta.ip}`,
    limit: 12,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: `Too many sign-in attempts. Try again in about ${rateLimit.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  const captchaCheck = await verifyTurnstileToken(payload.data.captchaToken ?? null, meta.ip);
  if (!captchaCheck.ok) {
    return NextResponse.json({ error: captchaCheck.message }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createSupabaseRouteClient(request, response);

  const { error } = await supabase.auth.signInWithPassword({
    email: payload.data.email,
    password: payload.data.password,
  });

  if (error) {
    await logAppEvent({
      level: "warn",
      category: "auth.sign-in",
      message: "Sign-in failed.",
      context: { email: payload.data.email, error: error.message, userAgent: meta.userAgent },
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAppEvent({
    level: "info",
    category: "auth.sign-in",
    message: "Sign-in successful.",
    context: { email: payload.data.email },
  });

  return NextResponse.json({ ok: true }, { status: 200, headers: response.headers });
}
