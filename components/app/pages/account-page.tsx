"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Download, HeartHandshake, ShieldCheck, UsersRound, Trash2 } from "lucide-react";

import { AccountPanel } from "@/components/app/account-panel";
import styles from "@/app/settings-design.module.css";

export function AccountPage({ preview, initialStatus }: { preview: boolean; initialStatus?: string }) {
  const [status, setStatus] = useState(initialStatus ?? "");

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div><p className={styles.kicker}>YOUR SPACE. YOUR CHOICES.</p><h1>Make yourself<br /><span>comfortable.</span></h1><p className={styles.intro}>Your data, your people, your next chapter. Keep the important account controls close at hand.</p></div>
        <div className={styles.heroIcon} aria-hidden="true"><ShieldCheck size={68} strokeWidth={1.5} /><span>IN YOUR HANDS</span></div>
      </section>
      {preview ? <p className={styles.previewNote}>Preview account · Exports, changes and deletion are disabled. No personal data is being changed.</p> : null}
      {status && !preview ? <p className={styles.notice} role="status">{status}</p> : null}
      <div className={styles.layout}>
        <aside className={styles.rail}>
          <nav className={styles.contents} aria-label="Account sections">
            <p className={styles.kicker}>QUICK FIND</p>
            <a href="#account-export"><Download size={17} /> Your data <ArrowUpRight size={14} /></a>
            <a href="#emergency-contact"><HeartHandshake size={17} /> Trusted contact <ArrowUpRight size={14} /></a>
            <a href="#trust-communities"><UsersRound size={17} /> Communities <ArrowUpRight size={14} /></a>
            <a href="#account-deletion"><Trash2 size={17} /> Close account <ArrowUpRight size={14} /></a>
          </nav>
          <section className={styles.help}><span className={styles.brandMark} aria-hidden="true" /><h2>A little peace of mind.</h2><p>Need help with a safety concern? Reporting tools and support are always within reach.</p><Link href="/safety/reporting">Safety & reporting <ArrowUpRight size={14} /></Link></section>
          <Link className={styles.profileLink} href="/profile">Looking to edit your profile? <strong>Head to your profile <ArrowUpRight size={14} /></strong></Link>
        </aside>
        <AccountPanel preview={preview} onStatus={setStatus} />
      </div>
    </div>
  );
}
