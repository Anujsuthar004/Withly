"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { ProfilePanel } from "@/components/app/profile-panel";
import type { AvailabilityWindow, TrustedCompanion, WorkspaceProfile } from "@/lib/supabase/types";
import styles from "@/app/profile-design.module.css";

export function ProfilePage({
  profile,
  availability,
  companions,
  preview,
  initialStatus,
}: {
  profile: WorkspaceProfile;
  availability: AvailabilityWindow[];
  companions: TrustedCompanion[];
  preview: boolean;
  initialStatus?: string;
}) {
  const [status, setStatus] = useState(initialStatus ?? (preview ? "Preview mode is active. Sign in to update your profile." : ""));

  return (
    <div className={styles.page}>
      <section className={styles.intro}>
        <div>
          <p className={styles.kicker}>THE PERSON BEHIND THE PLAN</p>
          <h1>A little more <span>you.</span></h1>
          <p>Give your next +1 a little something to say hello to.</p>
        </div>
        <Link className={styles.accountLink} href="/account">Account settings <ArrowUpRight size={15} /></Link>
      </section>
      {preview ? <p className={styles.previewNote}>Example profile · Editing, uploads and availability changes are disabled in this preview.</p> : null}
      {!preview && status ? <div className={styles.notice} role="status">{status}</div> : null}
      <ProfilePanel profile={profile} availability={availability} companions={companions} preview={preview} onStatus={setStatus} />
    </div>
  );
}
