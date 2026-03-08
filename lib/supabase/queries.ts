import { previewFeed, previewWorkspace } from "@/lib/mock-data";
import { hasSupabaseEnv } from "@/lib/env";
import type { AdminDashboard, FeedRequestCard, WorkspaceSnapshot } from "@/lib/supabase/types";
import { getSupabaseServerClientOrNull } from "@/lib/supabase/server";
import { adminDashboardSchema, feedRequestCardSchema, workspaceSnapshotSchema } from "@/lib/validators";

function normalizeFeedPayload(payload: unknown): FeedRequestCard[] {
  const parsed = feedRequestCardSchema.array().safeParse(payload ?? []);
  if (!parsed.success) {
    return previewFeed;
  }
  return parsed.data;
}

function normalizeSnapshotPayload(payload: unknown): WorkspaceSnapshot {
  const parsed = workspaceSnapshotSchema.safeParse(payload);
  if (!parsed.success) {
    return previewWorkspace;
  }
  return parsed.data;
}

function normalizeAdminDashboard(payload: unknown): AdminDashboard | null {
  const parsed = adminDashboardSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

export async function getAuthenticatedUser() {
  const supabase = await getSupabaseServerClientOrNull();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getLandingFeed(limit = 8) {
  const supabase = await getSupabaseServerClientOrNull();
  if (!supabase) {
    return previewFeed.slice(0, limit);
  }

  const { data, error } = await supabase.rpc("get_public_request_feed", {
    limit_count: limit,
  });

  if (error) {
    return previewFeed.slice(0, limit);
  }

  return normalizeFeedPayload(data).slice(0, limit);
}

export async function getWorkspaceSnapshot() {
  const supabase = await getSupabaseServerClientOrNull();
  if (!supabase) {
    return {
      snapshot: previewWorkspace,
      preview: true,
      setupError: "Add Supabase keys to leave preview mode.",
    };
  }

  const { data, error } = await supabase.rpc("get_workspace_snapshot");
  if (error) {
    return {
      snapshot: previewWorkspace,
      preview: true,
      setupError: `Supabase schema not ready: ${error.message}`,
    };
  }

  return {
    snapshot: normalizeSnapshotPayload(data),
    preview: false,
    setupError: "",
  };
}

export async function getAdminDashboard() {
  const supabase = await getSupabaseServerClientOrNull();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return null;
  }

  const { data, error } = await supabase.rpc("get_admin_dashboard");
  if (error) {
    return null;
  }

  return normalizeAdminDashboard(data);
}

export async function getLandingPageState() {
  const [user, feed] = await Promise.all([getAuthenticatedUser(), getLandingFeed()]);
  return {
    user,
    feed,
    hasSupabaseEnv,
  };
}

export async function getWorkspacePageState() {
  const [user, feed, workspace, adminDashboard] = await Promise.all([
    getAuthenticatedUser(),
    getLandingFeed(12),
    getWorkspaceSnapshot(),
    getAdminDashboard(),
  ]);

  return {
    user,
    feed,
    hasSupabaseEnv,
    adminDashboard,
    ...workspace,
  };
}
