import { AlertsPage } from "@/components/app/pages/alerts-page";
import { getAlertsPageState } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AlertsRoute() {
  const { notifications } = await getAlertsPageState();
  return <AlertsPage notifications={notifications} />;
}
