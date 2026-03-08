import type { Metadata } from "next";

import { StaticPageShell } from "@/components/static-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service | Tag Along",
};

export default function TermsPage() {
  return (
    <StaticPageShell
      kicker="Terms of Service"
      title="Use the platform responsibly or do not use it."
      intro="Effective March 8, 2026. These terms set the baseline rules for using Tag Along publicly."
      sections={[
        {
          title: "Eligibility and accounts",
          body: [
            "You must be legally allowed to use the service in your location, provide accurate account information, and keep your login credentials private.",
            "You are responsible for activity that occurs through your account until you notify support of compromise or unauthorized access.",
          ],
        },
        {
          title: "Acceptable use",
          body: [
            "Do not use Tag Along for harassment, coercion, stalking, fraud, impersonation, illegal activity, unsafe meetups, or attempts to bypass safety or moderation controls.",
            "Do not scrape the service, probe for private data, or attempt to enumerate or access content that is not intended for you.",
          ],
        },
        {
          title: "Enforcement",
          body: [
            "We may limit, suspend, or remove access, content, or accounts when safety, policy, fraud, or legal concerns require it.",
            "Tag Along is a coordination platform, not a guarantee of outcomes, identity, compatibility, or conduct. Members remain responsible for their own decisions and physical safety.",
          ],
        },
      ]}
    />
  );
}
