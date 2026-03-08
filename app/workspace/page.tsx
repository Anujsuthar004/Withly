import { redirect } from "next/navigation";

import { WorkspaceShell } from "@/components/workspace-shell";
import { getWorkspacePageState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const state = await getWorkspacePageState();

  if (state.hasSupabaseEnv && !state.preview && !state.user) {
    redirect("/");
  }

  return (
    <WorkspaceShell
      user={state.user}
      feed={state.feed}
      snapshot={state.snapshot}
      preview={state.preview}
      setupError={state.setupError}
      adminDashboard={state.adminDashboard}
    />
  );
}
