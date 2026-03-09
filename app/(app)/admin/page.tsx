import { notFound } from "next/navigation";

import { AdminPage } from "@/components/app/pages/admin-page";
import { getAdminPageState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AdminRoute() {
  const { adminDashboard, preview } = await getAdminPageState();

  if (!adminDashboard) {
    notFound();
  }

  return <AdminPage dashboard={adminDashboard} preview={preview} />;
}

