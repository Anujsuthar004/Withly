import type { Metadata } from "next";

import { StaticPageShell } from "@/components/static-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy | Tag Along",
};

export default function PrivacyPage() {
  return (
    <StaticPageShell
      kicker="Privacy Policy"
      title="Privacy-first by default, not by marketing copy."
      intro="Effective March 8, 2026. Tag Along is designed to limit public exposure, protect session details, and give members access to their own account data."
      sections={[
        {
          title: "What we collect",
          body: [
            "We collect the information needed to run the service: account credentials managed by Supabase Auth, profile details you choose to provide, requests you post, join requests, private session messages, moderation reports, and account-deletion requests.",
            "Operational data such as IP-derived rate-limit records, security event logs, and browser metadata may also be processed to prevent abuse and investigate incidents.",
          ],
        },
        {
          title: "How we use it",
          body: [
            "We use your data to authenticate you, show your workspace, match participants, deliver private realtime chat, respond to support requests, and enforce safety and moderation rules.",
            "We do not expose matched participant identities, full request history, or private messages in the public feed.",
          ],
        },
        {
          title: "Sharing and retention",
          body: [
            "Public visitors only see sanitized feed fields. Private session data is restricted to participants and authorized moderators through row-level security and controlled RPCs.",
            "We retain moderation and security records as needed for safety, fraud prevention, legal compliance, and dispute handling. You can request an account export or account deletion from inside the product.",
          ],
        },
      ]}
    />
  );
}
