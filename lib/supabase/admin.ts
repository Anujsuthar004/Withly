import { createClient } from "@supabase/supabase-js";

import { hasSupabaseAdminEnv, requireSupabaseAdminEnv } from "@/lib/env";

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = requireSupabaseAdminEnv();
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSupabaseAdminClientOrNull() {
  if (!hasSupabaseAdminEnv) {
    return null;
  }

  return createSupabaseAdminClient();
}
