import { NextRequest, NextResponse } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import type { PushSubscriptionJSON } from "@/lib/webpush";

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv) {
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

  let subscription: PushSubscriptionJSON;
  try {
    subscription = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid subscription payload." }, { status: 400 });
  }

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "Malformed push subscription." }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ push_subscription: subscription })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to save subscription." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!hasSupabaseEnv) {
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

  const { error } = await supabase
    .from("profiles")
    .update({ push_subscription: null })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to remove subscription." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
