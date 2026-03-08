import { NextResponse } from "next/server";

import { getSupabaseServerClientOrNull } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await getSupabaseServerClientOrNull();
  if (!supabase) {
    return NextResponse.json({ error: "Account export is temporarily unavailable." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_account_export");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="tag-along-export-${user.id}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
