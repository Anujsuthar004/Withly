import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { hasSupabaseEnv } from "@/lib/env";
import { getAppLayoutState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const state = await getAppLayoutState();

  if (hasSupabaseEnv && !state.user) {
    redirect("/");
  }

  return <AppShell showAdmin={state.role === "admin"}>{children}</AppShell>;
}

