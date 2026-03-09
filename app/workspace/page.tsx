import { redirect } from "next/navigation";

import { hasSupabaseEnv } from "@/lib/env";
import { getAuthenticatedUser } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const user = await getAuthenticatedUser();

  if (hasSupabaseEnv && user) {
    redirect("/feed");
  }

  redirect("/explore");
}
