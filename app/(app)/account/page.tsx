import { AccountPage } from "@/components/app/pages/account-page";
import { getAccountPageState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AccountRoute() {
  const { preview } = await getAccountPageState();
  return <AccountPage preview={preview} />;
}

