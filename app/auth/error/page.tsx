import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="marketing-page">
      <section className="hero-shell auth-recovery-shell">
        <div className="hero-copy">
          <p className="kicker">Account access</p>
          <h1>This email link could not be completed.</h1>
          <p>The link may have expired, already been used, or been opened in a different browser. Open the latest link in the same browser where you requested it.</p>
          <p>If you already confirmed your email, you can sign in. Otherwise, return to sign-in to request a fresh password-reset link.</p>
          <Link className="primary-button" href="/">Return to sign in</Link>
        </div>
      </section>
    </main>
  );
}
