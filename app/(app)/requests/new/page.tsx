import { RequestNewPage } from "@/components/app/pages/request-new-page";
import { getWorkspaceSnapshot } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  const { preview } = await getWorkspaceSnapshot();
  return <RequestNewPage preview={preview} />;
}

