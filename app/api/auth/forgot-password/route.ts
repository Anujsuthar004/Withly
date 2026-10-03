import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseEnv, SITE_URL } from "@/lib/env";
import { enforceRateLimit, prepareAuthCaptcha } from "@/lib/security";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { forgotPasswordSchema } from "@/lib/validators";
import { authEmailRedirect } from "@/lib/auth-redirect";

function requestMeta(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  return {
    ip: forwardedFor.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown",
  };
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv) {
    return NextResponse.json({ error: "Password reset is temporarily unavailable." }, { status: 503 });
  }

  const payload = forgotPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message ?? "Invalid forgot-password payload." }, { status: 400 });
  }

  const meta = requestMeta(request);
  const rateLimit = await enforceRateLimit({
    action: "auth-forgot-password",
    identifier: `${payload.data.email}:${meta.ip}`,
    limit: 5,
    windowMs: 30 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: `Too many password-reset attempts. Try again in about ${rateLimit.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  const captchaCheck = prepareAuthCaptcha(payload.data.captchaToken ?? null);
  if (!captchaCheck.ok) {
    return NextResponse.json({ error: captchaCheck.message }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createSupabaseRouteClient(request, response);
  const { error } = await supabase.auth.resetPasswordForEmail(payload.data.email, {
    captchaToken: payload.data.captchaToken ?? undefined,
    redirectTo: authEmailRedirect(SITE_URL, request.nextUrl.origin, "/auth/reset-password"),
  });

  if (error) {
    if (error.code === "captcha_failed") {
      return NextResponse.json({ error: "Could not verify anti-bot challenge. Please try again." }, { status: 400 });
    }
    // Do not reveal whether an account exists for this email address.
    console.warn(JSON.stringify({ category: "auth.password-reset", message: "Password reset request failed.", errorCode: error.code ?? "auth_error" }));
  }

  return NextResponse.json(
    { ok: true, message: "If that account exists, a reset link has been sent." },
    { status: 200, headers: response.headers }
  );
}
