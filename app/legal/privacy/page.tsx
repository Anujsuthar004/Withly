import type { Metadata } from "next";

import { StaticPageShell } from "@/components/static-page-shell";
import { SUPPORT_EMAIL } from "@/lib/env";

export const metadata: Metadata = {
  title: "Privacy Policy | Withly",
};

export default function PrivacyPage() {
  return (
    <StaticPageShell
      kicker="Privacy Policy"
      title="Privacy-first by default, not by marketing copy."
      intro="Effective September 24, 2026. This policy explains what Withly processes, why it is needed, and the controls available to members."
      sections={[
        {
          title: "What we collect",
          body: [
            "We process account and profile information, email-confirmation status, requests, join activity, private session messages, availability windows, safety check-ins, in-app SOS records, reports, blocks, feedback, account exports, and deletion requests.",
            "If you provide them, we also process an emergency-contact record and a browser push subscription. The current SOS feature does not message that external contact or emergency services.",
            "Security data can include pseudonymized network identifiers, user-agent information, rate-limit events, and application logs. We do not ask for government identification in the current product.",
          ],
        },
        {
          title: "How we use it",
          body: [
            "We use this data to authenticate accounts, operate discovery and matching, deliver private chat and notifications, calculate service trust signals, respond to support, prevent abuse, investigate reports, and maintain the service.",
            "We do not expose matched participant identities, full request history, or private messages in the public feed.",
          ],
        },
        {
          title: "Service providers and disclosure",
          body: [
            "Public visitors receive a limited request projection. Signed-in members receive additional discovery details, while private session content is limited to participants and authorized administrators under database access rules.",
            "We use infrastructure providers such as Supabase for authentication and data storage, Vercel for application hosting, and Cloudflare for bot protection. Browser push delivery may involve the push service selected by your browser. These providers process data on our behalf under their own service terms.",
            "We may disclose information when required by law, to protect people or the service from a credible threat, or as part of a business transfer subject to appropriate safeguards. We do not sell personal information.",
          ],
        },
        {
          title: "Retention, security, and your choices",
          body: [
            "We keep account and service data while your account is active and as needed to provide the product. Reports, moderation decisions, security records, and limited backups may be retained after deletion where reasonably necessary for safety, fraud prevention, dispute handling, or legal obligations.",
            "You can request an export or deletion from the account screen, disable browser notifications in your browser, remove availability entries, and withdraw from future use by closing your account. Some records cannot be immediately erased where retention is legally required or necessary to protect other users.",
            "We use access controls, encryption in transit, rate limiting, and database policies, but no online service can promise absolute security. Contact us promptly if you believe your account or information has been compromised.",
          ],
        },
        {
          title: "Age, international use, and contact",
          body: [
            "Withly is intended only for people aged 18 or older. We do not knowingly collect personal information from children.",
            "Data may be processed in countries where our service providers operate. Privacy rights differ by location; we will respond to valid access, correction, deletion, or objection requests as applicable.",
            `For privacy questions or requests, contact ${SUPPORT_EMAIL}. We may update this policy as the service changes and will publish a new effective date for material revisions.`,
          ],
        },
      ]}
    />
  );
}
