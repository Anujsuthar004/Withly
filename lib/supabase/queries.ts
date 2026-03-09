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
      setupError: "Some account features are unavailable right now, so a limited preview is showing.",
    };
  }

  const { data, error } = await supabase.rpc("get_workspace_snapshot");
  if (error) {
    return {
      snapshot: previewWorkspace,
      preview: true,
      setupError: "Workspace data is temporarily unavailable, so a limited preview is showing instead.",
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

export async function getExplorePageState(limit = 18) {
  const feed = await getLandingFeed(limit);
  return { feed, hasSupabaseEnv };
}

export async function getAppLayoutState() {
  const [user, workspace] = await Promise.all([getAuthenticatedUser(), getWorkspaceSnapshot()]);

  return {
    user,
    hasSupabaseEnv,
    preview: workspace.preview,
    setupError: workspace.setupError,
    role: workspace.snapshot.profile.role,
  };
}

export async function getFeedPageState(limit = 18) {
  const [user, feed] = await Promise.all([getAuthenticatedUser(), getLandingFeed(limit)]);
  return { user, feed, hasSupabaseEnv };
}

export async function getMyRequestsPageState() {
  const [user, workspace] = await Promise.all([getAuthenticatedUser(), getWorkspaceSnapshot()]);
  return { user, hasSupabaseEnv, ...workspace };
}

export async function getInboxPageState() {
  const [user, workspace] = await Promise.all([getAuthenticatedUser(), getWorkspaceSnapshot()]);
  return { user, hasSupabaseEnv, ...workspace };
}

export async function getProfilePageState() {
  const [user, workspace] = await Promise.all([getAuthenticatedUser(), getWorkspaceSnapshot()]);
  return { user, hasSupabaseEnv, ...workspace };
}

export async function getAccountPageState() {
  const [user, workspace] = await Promise.all([getAuthenticatedUser(), getWorkspaceSnapshot()]);
  return { user, hasSupabaseEnv, ...workspace };
}

export async function getAdminPageState() {
  const [user, workspace, adminDashboard] = await Promise.all([getAuthenticatedUser(), getWorkspaceSnapshot(), getAdminDashboard()]);
  return { user, hasSupabaseEnv, ...workspace, adminDashboard };
}
