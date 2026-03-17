import type { Metadata } from "next";

import { StaticPageShell } from "@/components/static-page-shell";

export const metadata: Metadata = {
  title: "Safety and Reporting | Withly",
};

export default function ReportingPage() {
  return (
    <StaticPageShell
      kicker="Safety and Reporting"
      title="What to do when something feels off."
      intro="If you need help, use the in-product report and block tools first, then contact support for urgent moderation follow-up."
      sections={[
        {
          title: "Immediate steps",
          body: [
            "Leave the situation if you feel unsafe. If you are in immediate danger, contact local emergency services first.",
            "Inside Withly, open the matched request, submit a report with factual details, and block the other participant if you do not want further contact.",
          ],
        },
        {
          title: "What to include in a report",
          body: [
            "State what happened, when it happened, and whether the issue involved harassment, threats, impersonation, no-shows, or unsafe behavior.",
            "If there was a specific request involved, report from that request so moderation can review the correct session context.",
          ],
        },
        {
          title: "How moderation responds",
          body: [
            "Moderators review open reports, move active cases into review, and resolve or dismiss them with notes. Serious safety concerns may result in account restrictions or removal.",
            "For urgent cases, email support after filing the in-product report so the moderation queue can be triaged faster.",
          ],
        },
      ]}
    />
  );
}
