"use client";

import { useState } from "react";

import { RequestComposer } from "@/components/request-composer";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "@/app/compose-design.module.css";

export function RequestNewPage({ preview, initialStatus }: { preview: boolean; initialStatus?: string }) {
  const [status, setStatus] = useState(initialStatus ?? (preview ? "Preview mode is active. Sign in to post a request." : ""));

  return (
    <div className={styles.page}>
      <Link href="/feed" className={styles.back}><ArrowLeft size={15} aria-hidden="true" /> Back to the company board</Link>
      <section className={styles.intro}>
        <div>
          <p className={styles.kicker}>SMALL PLAN. OPEN INVITATION.</p>
          <h1>Your plan. <span>Room for a +1.</span></h1>
          <p>Tell someone what you’re up to. A little detail makes it easier to say hello.</p>
        </div>
        <div className={styles.pairedInvitation} aria-hidden="true"><span>You</span><span>+1</span></div>
      </section>
      <RequestComposer preview={preview} onStatus={setStatus} statusMessage={status} />
    </div>
  );
}
