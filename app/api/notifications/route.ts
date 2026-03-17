import { NextResponse } from "next/server";
import { getSupabaseServerClientOrNull } from "@/lib/supabase/server";
import { notificationSchema } from "@/lib/validators";

export async function GET() {
  const supabase = await getSupabaseServerClientOrNull();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_my_notifications", { limit_count: 30 });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const parsed = notificationSchema.array().safeParse(data ?? []);
  const notifications = parsed.success ? parsed.data : [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json(
    { notifications, unreadCount },
    { headers: { "Cache-Control": "no-store" } }
  );
}
