import crypto from "node:crypto";

import { headers } from "next/headers";

import { hasTurnstileEnv, TURNSTILE_SECRET_KEY } from "@/lib/env";
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
  const oldestAllowedAt = new Date(now - windowMs).toISOString();

  if (admin) {
    await admin.from("rate_limit_events").delete().lt("created_at", oldestAllowedAt);

    const { count, error } = await admin
      .from("rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("action", action)
      .eq("key_hash", hashedIdentifier)
      .gte("created_at", oldestAllowedAt);

    if (!error && typeof count === "number" && count >= limit) {
      return {
        ok: false,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      };
    }

    await admin.from("rate_limit_events").insert({
      action,
      key_hash: hashedIdentifier,
      context: {},
    });

    return { ok: true };
  }

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
  if (!hasTurnstileEnv) {
    return { ok: true, bypassed: true };
  }

  if (!token) {
    return { ok: false, bypassed: false, message: "Complete the anti-bot check first." };
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      secret: TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ipAddress,
    }),
  });

  if (!response.ok) {
    await logAppEvent({
      level: "warn",
      category: "turnstile",
      message: "Turnstile verification request failed.",
      context: { status: response.status },
    });
    return { ok: false, bypassed: false, message: "Could not verify anti-bot challenge." };
  }

  const payload = (await response.json()) as { success?: boolean };
  if (!payload.success) {
    return { ok: false, bypassed: false, message: "Anti-bot verification failed." };
  }

  return { ok: true, bypassed: false };
}
