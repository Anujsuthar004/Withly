import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { AuthRecoveryShell } from "@/components/auth-recovery-shell";
import styles from "@/app/auth-design.module.css";

export default function AuthErrorPage() {
  return (
    <AuthRecoveryShell error>
        <section className={`${styles.panel} ${styles.errorCard}`} aria-labelledby="link-error-title">
          <span className={styles.mailIcon} aria-hidden="true"><Mail size={28} /></span>
          <h2 id="link-error-title">This email link could not be completed.</h2>
          <p>The link may have expired, already been used, or been opened in a different browser. Open the latest link in the same browser where you requested it.</p>
          <p>If you already confirmed your email, you can sign in. Otherwise, return to sign-in to request a fresh password-reset link.</p>
          <Link className={styles.primary} href="/#join">Return to sign in <ArrowRight size={16} /></Link>
          <p className={styles.hint}>For your security, don’t share confirmation or password-reset links with anyone.</p>
        </section>
    </AuthRecoveryShell>
  );
}
