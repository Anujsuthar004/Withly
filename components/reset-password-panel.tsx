"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/env";
import styles from "@/app/auth-design.module.css";

export function ResetPasswordPanel() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [status, setStatus] = useState("Open the reset link from your email in this browser, then choose a new password.");
  const [isReady, setIsReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!hasSupabaseEnv) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const sessionResult = await supabase.auth.getSession();
      setIsReady(Boolean(sessionResult.data.session));
    })();
  }, []);

  return (
    <section className={styles.panel} aria-labelledby="reset-heading">
      <div className={styles.welcomeMark} aria-hidden="true"><span /></div>
      <div className={styles.copy}>
        <p className={styles.kicker}>A NEW KEY TO YOUR ACCOUNT</p>
        <h2 id="reset-heading">Reset password</h2>
        <p>
          {isReady
            ? "Your recovery session is active. Set a new password now."
            : "If you do not see an active recovery session yet, open the latest recovery email link first."}
        </p>
      </div>

      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();

          if (!hasSupabaseEnv || !isReady || isPending) {
            setStatus("Password reset is temporarily unavailable right now.");
            return;
          }

          startTransition(async () => {
            const supabase = createSupabaseBrowserClient();
            const { error } = await supabase.auth.updateUser({
              password,
            });

            if (error) {
              setStatus(error.message);
              return;
            }

            setStatus("Password updated. Taking you back to the feed...");
            router.push("/feed");
            router.refresh();
          });
        }}
      >
        <div className={styles.passwordField}>
          <label htmlFor="recovery-password">New password</label>
          <span className="input-action-row">
          <input
            id="recovery-password"
            type={isPasswordVisible ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
            aria-describedby="reset-password-hint"
            disabled={!isReady || isPending}
            required
          />
          <button type="button" className="ghost-button compact" aria-label={isPasswordVisible ? "Hide password" : "Show password"} disabled={!isReady || isPending || !password} onClick={() => setIsPasswordVisible((value) => !value)}>{isPasswordVisible ? "Hide" : "Show"}</button>
          </span>
        </div>
        <p id="reset-password-hint" className={styles.hint}>Use 8–128 characters and a password you don’t use elsewhere.</p>

        <button className="primary-button" type="submit" disabled={!isReady || isPending}>
          {isPending ? "Updating..." : "Save New Password"}
          <ArrowRight size={18} />
        </button>
      </form>

      <p className="auth-status" role="status" aria-live="polite" aria-atomic="true">{status}</p>
      <Link className={styles.returnLink} href="/#join">Need a new link? Return to sign in <ArrowRight size={14} /></Link>
      <div className={styles.footnote}><LockKeyhole size={14} aria-hidden="true" /><span>Keep your password and recovery link to yourself.</span></div>
    </section>
  );
}
