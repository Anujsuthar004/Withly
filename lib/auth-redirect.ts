/** Build email links without double slashes and route PKCE through the server. */
export function authEmailRedirect(siteUrl: string, requestOrigin: string, next: "/profile" | "/auth/reset-password") {
  const callback = new URL("/auth/callback", siteUrl || requestOrigin);
  callback.searchParams.set("next", next);
  return callback.toString();
}
