import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { hasSupabaseEnv, isProduction } from "@/lib/env";
import { getAppLayoutState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const state = await getAppLayoutState();

  if ((hasSupabaseEnv || isProduction) && !state.user) {
    redirect("/");
  }

  const inboxCount = state.inboxCount ?? 0;

  return (
    <AppShell
      showAdmin={state.role === "admin"}
      inboxCount={inboxCount}
      notice={state.setupError}
      profileName={state.profileName}
      profileAvatarUrl={state.profileAvatarUrl}
      trustScore={state.trustScore}
      verificationTier={state.verificationTier}
    >
      {children}
    </AppShell>
  );
}
