import { ResetPasswordPanel } from "@/components/reset-password-panel";
import { AuthRecoveryShell } from "@/components/auth-recovery-shell";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <AuthRecoveryShell><ResetPasswordPanel /></AuthRecoveryShell>
  );
}
