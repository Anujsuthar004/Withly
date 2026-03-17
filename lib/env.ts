export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
export const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY?.trim() ?? "";
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ?? "support@withly.app";
export const APP_ENV = process.env.APP_ENV?.trim().toLowerCase() ?? "development";

export const MODERATION_API_URL = process.env.MODERATION_API_URL?.trim() ?? "";
export const MODERATION_API_KEY = process.env.MODERATION_API_KEY?.trim() ?? "";
export const GEOCODING_API_KEY = process.env.GEOCODING_API_KEY?.trim() ?? "";

export const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const hasSupabaseAdminEnv = Boolean(hasSupabaseEnv && SUPABASE_SERVICE_ROLE_KEY);
export const hasTurnstileEnv = Boolean(TURNSTILE_SITE_KEY && TURNSTILE_SECRET_KEY);
export const hasModerationEnv = Boolean(MODERATION_API_URL && MODERATION_API_KEY);
export const hasGeocodingEnv = Boolean(GEOCODING_API_KEY);
export const isProduction = APP_ENV === "production";

export function requireSupabaseEnv() {
  if (!hasSupabaseEnv) {
    throw new Error("Supabase environment variables are missing.");
  }

  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  };
}

export function requireSupabaseAdminEnv() {
  if (!hasSupabaseAdminEnv) {
    throw new Error("Supabase admin environment variables are missing.");
  }

  return {
    url: SUPABASE_URL,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  };
}

