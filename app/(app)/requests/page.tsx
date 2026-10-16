import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";

import { MyRequestsList } from "@/components/app/my-requests-list";
import { getMyRequestsPageState } from "@/lib/supabase/queries";
import styles from "@/app/requests-design.module.css";

export const dynamic = "force-dynamic";

export default async function MyRequestsPage() {
  const { snapshot, preview, setupError } = await getMyRequestsPageState();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div><p className={styles.kicker}>THE PLANS YOU PUT INTO MOTION</p><h1>Your ideas.<br /><span>A little more together.</span></h1><p className={styles.intro}>From an open invitation to a shared memory. Keep track of your requests and the people joining you.</p><Link className={styles.primary} href="/requests/new"><Plus size={16} /> Create a request <ArrowUpRight size={16} /></Link></div>
        <div className={styles.heroArt} aria-hidden="true"><span className={styles.brandMark} /><span>MAKE ROOM FOR A +1</span></div>
      </section>
      {preview ? <p className={styles.previewNote}>Example requests · Explore the filters and details. Deletion is disabled in this preview.</p> : setupError ? <p className={styles.notice} role="status">{setupError}</p> : null}
      {setupError && !preview ? null : <MyRequestsList requests={snapshot.myRequests} preview={preview} />}
    </div>
  );
}
