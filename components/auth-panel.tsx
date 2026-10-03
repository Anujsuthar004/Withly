"use client";

import { useEffect, useEffectEvent, useState, useSyncExternalStore, useTransition } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { TurnstileWidget } from "@/components/turnstile-widget";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TURNSTILE_SITE_KEY, hasSupabaseEnv, hasTurnstileSiteKey } from "@/lib/env";

type Mode = "signin" | "signup";

const subscribeToHydration = () => () => {};

interface AuthPanelProps {
  nextPath?: string;
}

export function AuthPanel({ nextPath = "/feed" }: AuthPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [status, setStatus] = useState("Private profiles, clear plans, and one calm place to manage them.");
  const [statusTone, setStatusTone] = useState<"neutral" | "success" | "error">("neutral");
  const [isPending, startTransition] = useTransition();
  const isHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const isBusy = !isHydrated || isPending;

  const handleAuthRefresh = useEffectEvent(() => {
    router.refresh();
  });

  useEffect(() => {
    if (!hasSupabaseEnv) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      handleAuthRefresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasSupabaseEnv) {
      setStatus("Sign-in is temporarily unavailable right now.");
      setStatusTone("error");
      return;
    }

    startTransition(async () => {
      const endpoint = mode === "signup" ? "/api/auth/sign-up" : "/api/auth/sign-in";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          displayName,
          acceptedTerms,
          captchaToken,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; requiresEmailVerification?: boolean }
        | null;

      setCaptchaToken("");
      setTurnstileKey((current) => current + 1);

      if (!response.ok) {
        setStatus(payload?.error ?? "Authentication failed.");
        setStatusTone("error");
        return;
      }

      if (mode === "signup" && payload?.requiresEmailVerification) {
        setPassword("");
        setStatus("Account created. Check your inbox to confirm your email, then sign in.");
        setStatusTone("success");
        return;
      }

      setStatus("Welcome back. Opening your private feed...");
      setStatusTone("success");
      router.push(nextPath);
      router.refresh();
    });
  }

  function handleForgotPassword() {
    if (!hasSupabaseEnv) {
      setStatus("Password reset is temporarily unavailable right now.");
      setStatusTone("error");
      return;
    }

    if (!email.trim()) {
      setStatus("Enter your email first, then use password reset.");
      setStatusTone("error");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          captchaToken,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;

      setCaptchaToken("");
      setTurnstileKey((current) => current + 1);

      if (!response.ok) {
        setStatus(payload?.error ?? "Could not start password recovery.");
        setStatusTone("error");
        return;
      }

      setStatus(payload?.message ?? "If that account exists, a reset link has been sent.");
      setStatusTone("success");
    });
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setPassword("");
    setIsPasswordVisible(false);
    setCaptchaToken("");
    setTurnstileKey((current) => current + 1);
    setStatusTone("neutral");
    setStatus("Private profiles, clear plans, and one calm place to manage them.");
    if (nextMode === "signin") {
      setDisplayName("");
      setAcceptedTerms(false);
    }
  }

  return (
    <section className="auth-panel">
      <div className="eyebrow-row">
        <span className="eyebrow-pill">
          <ShieldCheck size={16} />
          Email-confirmed members
        </span>
        <span className="eyebrow-pill muted">
          <LockKeyhole size={16} />
          Private plans
        </span>
      </div>

      <div className="auth-copy">
        <h2>Sign in and keep every plan moving.</h2>
        <p>Create an account, confirm your email, and handle requests, replies, and follow-up in one calm flow.</p>
      </div>

      <div className="auth-trust-strip" aria-label="Trust and privacy highlights">
        <article>
          <ShieldCheck size={16} />
          <div>
            <strong>Accountable profiles</strong>
            <span>Email confirmation and reporting provide a basic accountability layer.</span>
          </div>
        </article>
        <article>
          <LockKeyhole size={16} />
          <div>
            <strong>Private coordination</strong>
            <span>Exact logistics stay inside the thread until both people are aligned.</span>
          </div>
        </article>
      </div>

      <div className="segment-control">
        <button
          type="button"
          className={mode === "signin" ? "active" : ""}
          onClick={() => switchMode("signin")}
          aria-pressed={mode === "signin"}
          disabled={isBusy}
        >
          Sign In
        </button>
        <button
          type="button"
          className={mode === "signup" ? "active" : ""}
          onClick={() => switchMode("signup")}
          aria-pressed={mode === "signup"}
          disabled={isBusy}
        >
          Create Account
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <label>
            Display name
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Choose the name people will see"
              autoComplete="nickname"
              minLength={2}
              maxLength={60}
              required
              disabled={isBusy}
            />
          </label>
        ) : null}

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            disabled={isBusy}
          />
        </label>

        {mode === "signup" ? (
          <label className="auth-consent">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              required
              disabled={isBusy}
            />
            <span>
              I am at least 18 and agree to the <Link href="/legal/terms">Terms</Link>,{" "}
              <Link href="/legal/privacy">Privacy Policy</Link>, and{" "}
              <Link href="/legal/community">Community Guidelines</Link>.
            </span>
          </label>
        ) : null}

        <label>
          Password
          <span className="input-action-row">
            <input
              type={isPasswordVisible ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={8}
              required
              disabled={isBusy}
            />
            <button
              type="button"
              className="ghost-button compact"
              onClick={() => setIsPasswordVisible((current) => !current)}
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              disabled={isBusy || password.length === 0}
            >
              {isPasswordVisible ? "Hide" : "Show"}
            </button>
          </span>
        </label>

        {hasTurnstileSiteKey ? (
          <TurnstileWidget
            key={turnstileKey}
            siteKey={TURNSTILE_SITE_KEY}
            onToken={setCaptchaToken}
            theme="light"
          />
        ) : null}

        <button className="primary-button" type="submit" disabled={isBusy}>
          {isPending ? "Working..." : mode === "signin" ? "Sign In" : "Create Account"}
          <ArrowRight size={18} />
        </button>
      </form>

      {mode === "signin" ? (
        <button className="ghost-button auth-link" type="button" onClick={handleForgotPassword} disabled={isBusy}>
          Send password reset link
        </button>
      ) : null}

      <p className="auth-status" role="status" aria-live="polite" aria-atomic="true" data-tone={statusTone}>
        {status}
      </p>
    </section>
  );
}
