import type { Metadata } from "next";

import { StaticPageShell } from "@/components/static-page-shell";

export const metadata: Metadata = {
  title: "Community Guidelines | Withly",
};

export default function CommunityGuidelinesPage() {
  return (
    <StaticPageShell
      kicker="Community Guidelines"
      title="Clear plans, public spaces, respectful behavior."
      intro="These are the operating norms for a public companionship platform. They are enforced through blocking, reporting, moderation review, and account action when needed."
      sections={[
        {
          title: "Before a meetup",
          body: [
            "Keep first meetups in public places, set a precise landmark, agree on timing in chat, and do not pressure anyone to share private contact details before they are comfortable.",
            "Use accurate descriptions. Misleading requests, false urgency, or manipulative framing are moderation issues.",
          ],
        },
        {
          title: "During a meetup",
          body: [
            "Respect boundaries, communicate clearly, and leave if the situation stops feeling safe. Consent is ongoing and can be withdrawn at any time.",
            "Do not threaten, intimidate, record without consent, or push for location changes that were not agreed in advance.",
          ],
        },
        {
          title: "After a meetup",
          body: [
            "Use completion notes, reporting, and blocking if something went wrong. Reports should focus on facts, timing, and behavior rather than speculation.",
            "Retaliation against another user for reporting or blocking is grounds for account action.",
          ],
        },
      ]}
    />
  );
}
