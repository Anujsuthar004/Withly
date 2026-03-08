import { ResetPasswordPanel } from "@/components/reset-password-panel";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main className="marketing-page">
      <section className="hero-shell auth-recovery-shell">
        <div className="hero-copy">
          <p className="kicker">Account Recovery</p>
          <h1>Set a new password and lock the old one out.</h1>
          <p>Use the link from your email to choose a new password and get back into your account.</p>
        </div>
        <ResetPasswordPanel />
      </section>
    </main>
  );
}
