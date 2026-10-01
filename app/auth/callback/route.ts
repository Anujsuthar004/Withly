import { NextResponse } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { normalizeNextPath } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"), "/feed");
  const code = requestUrl.searchParams.get("code");

  if (requestUrl.searchParams.has("error")) {
    return NextResponse.redirect(new URL("/auth/error", requestUrl.origin));
  }

  if (!hasSupabaseEnv || !code) {
    return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/auth/error", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
