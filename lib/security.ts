import crypto from "node:crypto";
import { authChallengePreflight, verifyChallenge } from "@/lib/turnstile";

import { headers } from "next/headers";

import { hasTurnstileEnv, isProduction, TURNSTILE_SECRET_KEY, TURNSTILE_SITE_KEY } from "@/lib/env";
import { logAppEvent } from "@/lib/logger";
import { getSupabaseAdminClientOrNull } from "@/lib/supabase/admin";

type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

type RateLimitOptions = {
  action: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

const fallbackRateLimitStore = globalThis as typeof globalThis & {
  __tagAlongRateLimitStore?: Map<string, number[]>;
};

function hashIdentifier(identifier: string) {
  return crypto.createHash("sha256").update(identifier).digest("hex");
}

export async function getRequestMeta() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "unknown";
  const userAgent = headerStore.get("user-agent") || "unknown";

  return { ip, userAgent };
}

export async function enforceRateLimit({
  action,
  identifier,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  const hashedIdentifier = hashIdentifier(identifier);
  const admin = getSupabaseAdminClientOrNull();
  const now = Date.now();

  if (admin) {
    const { data, error } = await admin.rpc("consume_rate_limit", {
      action_input: action,
      key_hash_input: hashedIdentifier,
      limit_input: limit,
      window_seconds_input: Math.ceil(windowMs / 1000),
    });

    if (error) {
      await logAppEvent({
        level: "error",
        category: "rate-limit",
        message: "Persistent rate limiter failed.",
        context: { action, error: error.message },
      });
      return isProduction
        ? { ok: false, retryAfterSeconds: Math.ceil(windowMs / 1000) }
        : { ok: true };
    }

    if (data !== true) {
      return {
        ok: false,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      };
    }

    return { ok: true };
  }

  if (isProduction) {
    console.error("[security] Persistent rate limiting is unavailable in production.");
    return { ok: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  console.warn("[security] Supabase admin unavailable — using the development-only in-memory rate limiter.");

  const key = `${action}:${hashedIdentifier}`;
  const store = fallbackRateLimitStore.__tagAlongRateLimitStore ?? new Map<string, number[]>();
  fallbackRateLimitStore.__tagAlongRateLimitStore = store;

  const currentEntries = (store.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
  if (currentEntries.length >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  currentEntries.push(now);
  store.set(key, currentEntries);
  return { ok: true };
}

export async function verifyTurnstileToken(token: string | null, ipAddress: string) {
  return verifyChallenge({
    siteKey: TURNSTILE_SITE_KEY,
    secretKey: TURNSTILE_SECRET_KEY,
    production: isProduction,
    token,
    ip: ipAddress,
  });
}

export function prepareAuthCaptcha(token: string | null) {
  return authChallengePreflight({ siteKey: TURNSTILE_SITE_KEY, secretKey: TURNSTILE_SECRET_KEY, production: isProduction, token });
}
