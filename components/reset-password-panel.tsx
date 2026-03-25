"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/env";

export function ResetPasswordPanel() {
  const router = useRouter();
  const [password, setPassword] = useState("");
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
    <section className="auth-panel">
      <div className="auth-copy">
        <h2>Reset password</h2>
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

          if (!hasSupabaseEnv) {
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
        <label>
          New password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            required
          />
        </label>

        <button className="primary-button" type="submit" disabled={!isReady || isPending}>
          {isPending ? "Updating..." : "Save New Password"}
          <ArrowRight size={18} />
        </button>
      </form>

      <p className="auth-status">{status}</p>
    </section>
  );
}
