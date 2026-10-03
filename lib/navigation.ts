export function normalizeNextPath(raw: unknown, fallback = "/feed") {
  if (typeof raw !== "string") return fallback;

  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  // WHATWG URLs treat backslashes as slashes and strip control characters.
  if (/[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  const path = value.split(/[?#]/, 1)[0];
  if (/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f|25)/i.test(path)) return fallback;
  try {
    const url = new URL(value, "https://withly.invalid");
    if (url.origin !== "https://withly.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
