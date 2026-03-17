import { ProfilePage } from "@/components/app/pages/profile-page";
import { getWorkspaceSnapshot, getMyAvailability } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function ProfileRoute() {
  const [{ snapshot, preview, setupError }, { availability }] = await Promise.all([
    getWorkspaceSnapshot(),
    getMyAvailability()
  ]);
  
  return <ProfilePage 
    profile={snapshot.profile} 
    availability={availability} 
    preview={preview} 
    initialStatus={setupError || undefined} 
  />;
}
