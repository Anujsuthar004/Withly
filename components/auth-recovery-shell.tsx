import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import styles from "@/app/auth-design.module.css";

export function AuthRecoveryShell({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <main id="main-content" tabIndex={-1} className={styles.recoveryPage}>
    <div className={styles.container}>
      <header className={styles.header}><Link className={styles.brand} href="/" aria-label="Withly home"><Image src="/withly-app-icon.svg" width={38} height={38} alt="" />Withly</Link><Link className={styles.back} href="/#join"><ArrowLeft size={15} /> Back to sign in</Link></header>
      <div className={styles.recoveryLayout}>
        <section className={styles.recoveryCopy}>
          <div className={styles.keyArt} aria-hidden="true"><KeyRound size={56} strokeWidth={1.6} /><span>BACK TO YOUR PEOPLE</span></div>
          <p className={styles.kicker}>{error ? "A SMALL DETOUR" : "ACCOUNT RECOVERY"}</p>
          <h1>{error ? <>Let’s get you<br /><span>back in.</span></> : <>Fresh start.<br /><span>Same you.</span></>}</h1>
          <p>{error ? "An email link can run out of time. Here’s how to find your way back to your plans." : "Choose a new password using the link in your email, then get back to the plans you’ve made."}</p>
        </section>
        {children}
      </div>
      <footer className={styles.footer}><span>A little company. Thoughtful boundaries.</span><Link href="/safety/reporting">Safety & support</Link><Link href="/legal/privacy">Privacy</Link></footer>
    </div>
  </main>;
}
