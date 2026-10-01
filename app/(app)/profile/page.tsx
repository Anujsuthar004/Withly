import { ProfilePage } from "@/components/app/pages/profile-page";
import { getWorkspaceSnapshot, getMyAvailability, getTrustedCompanions } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function ProfileRoute() {
  const [{ snapshot, preview, setupError }, { availability }, { companions }] = await Promise.all([
    getWorkspaceSnapshot(),
    getMyAvailability(),
    getTrustedCompanions(),
  ]);
  
  return <ProfilePage 
    profile={snapshot.profile} 
    availability={availability} 
    companions={companions}
    preview={preview} 
    initialStatus={setupError || undefined} 
  />;
}
