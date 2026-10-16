import type { Metadata } from "next";

import { StaticPageShell } from "@/components/static-page-shell";
import { SUPPORT_EMAIL } from "@/lib/env";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <StaticPageShell
      kicker="Terms of Service"
      title="Clear rules for coordinating safely."
      intro="Effective September 24, 2026. By creating an account or using Withly, you agree to these terms and the Community Guidelines."
      sections={[
        {
          title: "Eligibility and accounts",
          body: [
            "You must be at least 18, be legally able to enter this agreement in your location, provide accurate account information, and keep your login credentials private.",
            "You are responsible for activity that occurs through your account until you notify support of compromise or unauthorized access.",
            "One account is for one person. Email confirmation is not identity verification, a criminal-background check, or an endorsement by Withly.",
          ],
        },
        {
          title: "Acceptable use",
          body: [
            "Do not use Withly for harassment, coercion, stalking, fraud, impersonation, illegal activity, unsafe meetups, or attempts to bypass safety or moderation controls.",
            "Do not scrape the service, probe for private data, or attempt to enumerate or access content that is not intended for you.",
            "Do not post sexual services, weapons transactions, controlled-substance transactions, requests involving minors, or content that creates an unreasonable risk of harm.",
          ],
        },
        {
          title: "Meetups and safety features",
          body: [
            "Withly helps adults coordinate with each other; Withly is not a party to, supervisor of, or insurer for any meetup. You decide whether, where, and how to meet and remain responsible for your decisions and conduct.",
            "Trust scores, email confirmation, reports, check-ins, and compatibility indicators are limited product signals. They do not guarantee identity, safety, reliability, compatibility, or future conduct.",
            "The SOS control only creates an in-app alert for the matched companion. It does not contact an external emergency contact, provide live location, or call emergency services. If anyone may be in immediate danger, contact local emergency services directly.",
          ],
        },
        {
          title: "Your content and platform access",
          body: [
            "You retain ownership of content you submit. You grant Withly a limited, worldwide license to host, process, display, and transmit that content only as needed to operate, secure, moderate, and improve the service.",
            "We may remove content or limit, suspend, or terminate access when we reasonably believe safety, abuse, fraud, policy, operational, or legal concerns require it. You may request account deletion from the account screen.",
            "The service may change, experience interruptions, or discontinue features. We may update these terms by publishing a revised effective date; continued use after an update means you accept the revised terms where permitted by law.",
          ],
        },
        {
          title: "Disclaimers, liability, and contact",
          body: [
            "The service is provided on an as-available basis to the extent permitted by law. We do not guarantee uninterrupted operation, successful matching, user conduct, or the accuracy of member-supplied information.",
            "To the extent permitted by applicable law, Withly is not responsible for indirect, incidental, special, consequential, or punitive losses arising from use of the service or interactions between members. Nothing here excludes rights or liability that cannot legally be excluded.",
            `Questions about these terms can be sent to ${SUPPORT_EMAIL}. These terms do not replace rights you have under mandatory consumer or privacy law in your location.`,
          ],
        },
      ]}
    />
  );
}
