"use client";

import { Sparkles } from "lucide-react";

export function StatusBadge({ message }: { message: string }) {
  return (
    <div className="status-badge" role="status" aria-live="polite" aria-atomic="true">
      <Sparkles size={16} />
      {message}
    </div>
  );
}

