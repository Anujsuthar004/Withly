import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import { hasSupabaseEnv, requireSupabaseEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always mutate cookies directly.
        }
      },
    },
  });
}

export async function getSupabaseServerClientOrNull() {
  if (!hasSupabaseEnv) {
    return null;
  }

  return createSupabaseServerClient();
}
