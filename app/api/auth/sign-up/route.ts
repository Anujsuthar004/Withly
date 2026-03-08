import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseEnv, SITE_URL } from "@/lib/env";
import { logAppEvent } from "@/lib/logger";
import { enforceRateLimit, verifyTurnstileToken } from "@/lib/security";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { signUpSchema } from "@/lib/validators";

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

  const payload = signUpSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message ?? "Invalid sign-up payload." }, { status: 400 });
  }

  const meta = requestMeta(request);
  const rateLimit = await enforceRateLimit({
    action: "auth-sign-up",
    identifier: `${payload.data.email}:${meta.ip}`,
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: `Too many sign-up attempts. Try again in about ${rateLimit.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  const captchaCheck = await verifyTurnstileToken(payload.data.captchaToken ?? null, meta.ip);
  if (!captchaCheck.ok) {
    return NextResponse.json({ error: captchaCheck.message }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createSupabaseRouteClient(request, response);

  const { data, error } = await supabase.auth.signUp({
    email: payload.data.email,
    password: payload.data.password,
    options: {
      data: {
        display_name: payload.data.displayName,
      },
      emailRedirectTo: `${SITE_URL || request.nextUrl.origin}/auth/callback?next=${encodeURIComponent("/workspace")}`,
    },
  });

  if (error) {
    await logAppEvent({
      level: "warn",
      category: "auth.sign-up",
      message: "Sign-up failed.",
      context: { email: payload.data.email, error: error.message, userAgent: meta.userAgent },
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAppEvent({
    level: "info",
    category: "auth.sign-up",
    message: "Sign-up created.",
    context: { email: payload.data.email, needsVerification: !data.session },
  });

  return NextResponse.json(
    {
      ok: true,
      requiresEmailVerification: !data.session,
    },
    {
      status: 200,
      headers: response.headers,
    }
  );
}
