import { ProfilePage } from "@/components/app/pages/profile-page";
import { getWorkspaceSnapshot } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function ProfileRoute() {
  const { snapshot, preview, setupError } = await getWorkspaceSnapshot();
  return <ProfilePage profile={snapshot.profile} preview={preview} initialStatus={setupError || undefined} />;
}
