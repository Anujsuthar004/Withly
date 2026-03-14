import { InboxPage } from "@/components/app/pages/inbox-page";
import { getInboxPageState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function InboxRoute() {
  const { snapshot, preview, setupError } = await getInboxPageState();
  return <InboxPage snapshot={snapshot} preview={preview} initialStatus={setupError || undefined} />;
}
