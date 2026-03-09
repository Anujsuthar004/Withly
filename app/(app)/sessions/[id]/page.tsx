import { notFound } from "next/navigation";

import { SessionPanel } from "@/components/app/session-panel";
import { getInboxPageState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function SessionRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { snapshot } = await getInboxPageState();

  if (!snapshot.activeSession || snapshot.activeSession.requestId !== id) {
    notFound();
  }

  return (
    <div className="workspace-page">
      <SessionPanel session={snapshot.activeSession} currentUserId={snapshot.profile.id} onStatus={() => undefined} />
    </div>
  );
}

