"use client";

import { useSyncExternalStore } from "react";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

const subscribe = () => () => {};

// The server and first browser render must be byte-identical. Browser locale,
// timezone and the current clock are used only after hydration has completed.
export function DisplayTime({ value, relative = false }: { value: string | null; relative?: boolean }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  if (!value || Number.isNaN(new Date(value).getTime())) return <>{relative ? "Just now" : "Flexible timing"}</>;
  const iso = new Date(value).toISOString();
  return <time dateTime={iso}>{hydrated ? (relative ? formatRelativeTime(value) : formatDateTime(value)) : `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`}</time>;
}
