import { notFound } from "next/navigation";

import { AdminPage } from "@/components/app/pages/admin-page";
import { getAdminPageState } from "@/lib/supabase/queries";
import { APP_ENV, hasSupabaseEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AdminRoute() {
  const { adminDashboard, preview } = await getAdminPageState();

  if (!adminDashboard) {
    if (APP_ENV === "test" && !hasSupabaseEnv) {
      const { adminPreview } = await import("@/lib/admin-preview");
      return <AdminPage dashboard={adminPreview} preview />;
    }
    notFound();
  }

  return <AdminPage dashboard={adminDashboard} preview={preview} />;
}
