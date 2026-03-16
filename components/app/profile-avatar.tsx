"use client";

import Image from "next/image";

import { getProfileInitials } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type ProfileAvatarSize = "sm" | "md" | "lg" | "xl";

const avatarSizes: Record<ProfileAvatarSize, string> = {
  sm: "44px",
  md: "56px",
  lg: "72px",
  xl: "104px",
};

export function ProfileAvatar({
  name,
  url = "",
  size = "md",
  className,
}: {
  name: string;
  url?: string;
  size?: ProfileAvatarSize;
  className?: string;
}) {
  const label = name.trim() || "Member";

  return (
    <div className={cn("profile-avatar", `profile-avatar-${size}`, className)} aria-label={`${label} profile photo`}>
      {url ? (
        <Image
          src={url}
          alt={`${label} profile photo`}
          fill
          sizes={avatarSizes[size]}
          className="profile-avatar-image"
          unoptimized
        />
      ) : (
        <span className="profile-avatar-fallback">{getProfileInitials(label)}</span>
      )}
    </div>
  );
}
