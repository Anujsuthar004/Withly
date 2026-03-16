import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "Flexible timing";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Flexible timing";
  }

  return parsed.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelativeTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Just now";
  }

  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function getProfileCompletion(profile: {
  displayName?: string | null;
  aboutMe?: string | null;
  homeArea?: string | null;
}) {
  const steps = [
    {
      id: "display-name",
      label: "Display name",
      done: Boolean(profile.displayName?.trim()),
    },
    {
      id: "about-me",
      label: "Short bio",
      done: Boolean(profile.aboutMe?.trim()),
    },
    {
      id: "home-area",
      label: "Home area",
      done: Boolean(profile.homeArea?.trim()),
    },
  ];

  const completedCount = steps.filter((step) => step.done).length;
  const percentage = Math.round((completedCount / steps.length) * 100);

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    percentage,
  };
}
