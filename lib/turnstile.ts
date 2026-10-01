type ChallengeConfig = {
  siteKey: string;
  secretKey: string;
  production: boolean;
  token: string | null;
  ip: string;
};

/** Auth consumes the token ONCE in Supabase's CAPTCHA verifier. Do not call
 * siteverify first: Turnstile tokens are single-use. Supabase CAPTCHA must be
 * enabled in project Auth settings, including for direct public API callers.
 */
export function authChallengePreflight(config: Omit<ChallengeConfig, "ip">) {
  if (config.production && (!config.siteKey || !config.secretKey)) {
    return { ok: false, message: "Anti-bot verification is unavailable. Please contact support." };
  }
  if ((config.production || config.siteKey) && !config.token) {
    return { ok: false, message: "Complete the anti-bot check first." };
  }
  return { ok: true };
}

export async function verifyChallenge(config: ChallengeConfig, fetcher: typeof fetch = fetch) {
  if (!config.siteKey || !config.secretKey) {
    return config.production
      ? { ok: false, bypassed: false, message: "Anti-bot verification is unavailable. Please contact support." }
      : { ok: true, bypassed: true };
  }
  if (!config.token) return { ok: false, bypassed: false, message: "Complete the anti-bot check first." };
  try {
    const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: config.secretKey, response: config.token, remoteip: config.ip }),
      signal: AbortSignal.timeout(8_000),
    });
    if (response.ok) {
      const payload = await response.json() as { success?: boolean } | null;
      if (payload?.success === true) return { ok: true, bypassed: false };
    }
  } catch {
    // A timeout, invalid JSON or an upstream outage must never bypass verification.
  }
  return { ok: false, bypassed: false, message: "Could not verify anti-bot challenge. Please try again." };
}
