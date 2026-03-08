import { ResetPasswordPanel } from "@/components/reset-password-panel";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main className="marketing-page">
      <section className="hero-shell auth-recovery-shell">
        <div className="hero-copy">
          <p className="kicker">Account Recovery</p>
          <h1>Set a new password and lock the old one out.</h1>
          <p>
            Password recovery runs through Supabase Auth. Once the recovery link lands here, you can set a new
            password without exposing credentials to custom app code.
          </p>
        </div>
        <ResetPasswordPanel />
      </section>
    </main>
  );
}
