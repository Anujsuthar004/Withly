import type { SupabaseClient } from "@supabase/supabase-js";

/** Remove owned avatar files through Storage's API, then hard-delete Auth.
 * Never report success if either stage fails. The profile FK cascades DB data.
 */
export async function deleteAccountData(admin: SupabaseClient, userId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error("Invalid account ID.");
  }
  const bucketName = "profile-avatars";
  const bucket = await admin.storage.getBucket(bucketName);
  if (bucket.error && String(bucket.error.statusCode) !== "404") throw bucket.error;
  if (!bucket.error) {
    const storage = admin.storage.from(bucketName);
    // Avatars use flat <user UUID>/<generated filename> paths. Re-read page 1
    // after each removal so offsets cannot skip objects.
    let cleaned = false;
    for (let page = 0; page < 100; page++) {
      const { data, error } = await storage.list(userId, { limit: 100, offset: 0 });
      if (error) throw error;
      if (!data?.length) { cleaned = true; break; }
      if (data.some((file) => !file.id || file.name.includes("/") || file.name === "..")) {
        throw new Error("Unexpected avatar folder structure; contact support.");
      }
      const removed = await storage.remove(data.map((file) => `${userId}/${file.name}`));
      if (removed.error) throw removed.error;
    }
    if (!cleaned) throw new Error("Avatar cleanup could not finish. Please try again.");
  }
  const { error } = await admin.auth.admin.deleteUser(userId, false);
  if (error) throw error;
}
