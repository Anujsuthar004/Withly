"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/env";

export function SignOutButton({ className = "ghost-button" }: { className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        startTransition(async () => {
          if (!hasSupabaseEnv) {
            router.push("/");
            return;
          }

          const supabase = createSupabaseBrowserClient();
          await supabase.auth.signOut();
          router.push("/");
          router.refresh();
        });
      }}
      disabled={isPending}
    >
      <LogOut size={16} />
      {isPending ? "Signing out..." : "Sign Out"}
    </button>
  );
}
