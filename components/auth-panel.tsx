"use client";

import { useEffect, useEffectEvent, useState, useTransition } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { TurnstileWidget } from "@/components/turnstile-widget";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TURNSTILE_SITE_KEY, hasSupabaseEnv, hasTurnstileEnv } from "@/lib/env";

type Mode = "signin" | "signup";

interface AuthPanelProps {
  nextPath?: string;
}

export function AuthPanel({ nextPath = "/workspace" }: AuthPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [status, setStatus] = useState("Private profiles, clear plans, and one calm place to manage them.");
  const [statusTone, setStatusTone] = useState<"neutral" | "success" | "error">("neutral");
  const [isPending, startTransition] = useTransition();

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

      setStatus("Welcome back. Preparing your secure workspace...");
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

  async function handleGoogleSignIn() {
    if (!hasSupabaseEnv) {
      setStatus("Google sign-in is temporarily unavailable right now.");
      setStatusTone("error");
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (error) {
        setStatus(error.message);
        setStatusTone("error");
      }
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
    }
  }

  return (
    <section className="auth-panel">
      <div className="eyebrow-row">
        <span className="eyebrow-pill">
          <ShieldCheck size={16} />
          Verified members
        </span>
        <span className="eyebrow-pill muted">
          <LockKeyhole size={16} />
          Private plans
        </span>
      </div>

      <div className="auth-copy">
        <h2>Sign in and keep every plan in one place.</h2>
        <p>Create an account, confirm your email, and manage requests, replies, and follow-up from one workspace.</p>
      </div>

      <div className="segment-control">
        <button
          type="button"
          className={mode === "signin" ? "active" : ""}
          onClick={() => switchMode("signin")}
          aria-pressed={mode === "signin"}
          disabled={isPending}
        >
          Sign In
        </button>
        <button
          type="button"
          className={mode === "signup" ? "active" : ""}
          onClick={() => switchMode("signup")}
          aria-pressed={mode === "signup"}
          disabled={isPending}
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
              disabled={isPending}
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
            disabled={isPending}
          />
        </label>

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
              disabled={isPending}
            />
            <button
              type="button"
              className="ghost-button compact"
              onClick={() => setIsPasswordVisible((current) => !current)}
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              disabled={isPending || password.length === 0}
            >
              {isPasswordVisible ? "Hide" : "Show"}
            </button>
          </span>
        </label>

        {hasTurnstileEnv ? (
          <TurnstileWidget
            key={turnstileKey}
            siteKey={TURNSTILE_SITE_KEY}
            onToken={setCaptchaToken}
            theme="light"
          />
        ) : null}

        <button className="primary-button" type="submit" disabled={isPending}>
          {isPending ? "Working..." : mode === "signin" ? "Sign In" : "Create Account"}
          <ArrowRight size={18} />
        </button>
      </form>

      {mode === "signin" ? (
        <button className="ghost-button auth-link" type="button" onClick={handleForgotPassword} disabled={isPending}>
          Send password reset link
        </button>
      ) : null}

      <button className="secondary-button auth-google" type="button" onClick={handleGoogleSignIn} disabled={isPending}>
        Continue with Google
      </button>

      <p className="auth-status" role="status" aria-live="polite" aria-atomic="true" data-tone={statusTone}>
        {status}
      </p>
    </section>
  );
}
