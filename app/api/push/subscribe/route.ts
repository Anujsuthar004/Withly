import { NextRequest, NextResponse } from "next/server";

import { hasSupabaseAdminEnv, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { pushSubscriptionSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv || !hasSupabaseAdminEnv) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createSupabaseRouteClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const rawSubscription = await request.json().catch(() => null);
  const parsed = pushSubscriptionSchema.safeParse(rawSubscription);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription payload." }, { status: 400 });
  }

  const { error } = await createSupabaseAdminClient()
    .from("profiles")
    .update({ push_subscription: parsed.data })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to save subscription." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!hasSupabaseEnv || !hasSupabaseAdminEnv) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createSupabaseRouteClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { error } = await createSupabaseAdminClient()
    .from("profiles")
    .update({ push_subscription: null })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to remove subscription." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
