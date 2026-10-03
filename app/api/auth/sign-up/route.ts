import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseEnv, SITE_URL } from "@/lib/env";
import { logAppEvent } from "@/lib/logger";
import { enforceRateLimit, prepareAuthCaptcha } from "@/lib/security";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { signUpSchema } from "@/lib/validators";
import { authEmailRedirect } from "@/lib/auth-redirect";

function requestMeta(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  return {
    ip: forwardedFor.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  };
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv) {
    return NextResponse.json({ error: "Account creation is temporarily unavailable." }, { status: 503 });
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

  const captchaCheck = prepareAuthCaptcha(payload.data.captchaToken ?? null);
  if (!captchaCheck.ok) {
    return NextResponse.json({ error: captchaCheck.message }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createSupabaseRouteClient(request, response);

  const { data, error } = await supabase.auth.signUp({
    email: payload.data.email,
    password: payload.data.password,
    options: {
      captchaToken: payload.data.captchaToken ?? undefined,
      data: {
        display_name: payload.data.displayName,
        terms_accepted_at: new Date().toISOString(),
        terms_version: "2026-09-24",
      },
      emailRedirectTo: authEmailRedirect(SITE_URL, request.nextUrl.origin, "/profile"),
    },
  });

  if (error) {
    if (error.code === "captcha_failed") {
      return NextResponse.json({ error: "Could not verify anti-bot challenge. Please try again." }, { status: 400 });
    }
    await logAppEvent({
      level: "warn",
      category: "auth.sign-up",
      message: "Sign-up failed.",
      context: { errorCode: error.code ?? "auth_error", userAgent: meta.userAgent },
    });
    return NextResponse.json(
      { error: "Account creation could not be completed. Try signing in or resetting your password." },
      { status: 400 }
    );
  }

  await logAppEvent({
    level: "info",
    category: "auth.sign-up",
    message: "Sign-up created.",
    context: { needsVerification: !data.session },
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
