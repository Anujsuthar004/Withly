export const PROFILE_AVATAR_BUCKET = "profile-avatars";
export const MAX_PROFILE_AVATAR_BYTES = 4 * 1024 * 1024;
export const ALLOWED_PROFILE_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function sanitizeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function getProfileInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "?";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function getAvatarFileExtension(fileName: string, mimeType: string) {
  const normalizedMimeType = mimeType.toLowerCase();
  if (normalizedMimeType === "image/jpeg") return "jpg";
  if (normalizedMimeType === "image/png") return "png";
  if (normalizedMimeType === "image/webp") return "webp";

  const fallback = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
  return sanitizeSegment(fallback) || "jpg";
}

export function createProfileAvatarPath(userId: string, fileName: string, mimeType: string) {
  const extension = getAvatarFileExtension(fileName, mimeType);
  const timestamp = Date.now();
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${timestamp}`;
  return `${sanitizeSegment(userId)}/${timestamp}-${sanitizeSegment(suffix)}.${extension}`;
}
