import { emptyWorkspaceSnapshot, previewFeed, previewWorkspace } from "@/lib/mock-data";
import { hasSupabaseEnv, isProduction } from "@/lib/env";
import type { AdminDashboard, FeedRequestCard, WorkspaceSnapshot } from "@/lib/supabase/types";
import { getSupabaseServerClientOrNull } from "@/lib/supabase/server";
import { adminDashboardSchema, feedRequestCardSchema, workspaceSnapshotSchema } from "@/lib/validators";

const feedUnavailableMessage = "Open requests are temporarily unavailable. Please try again shortly.";
const requestUnavailableMessage = "That request is temporarily unavailable. Please try again shortly.";
const workspaceUnavailableMessage = "Workspace data is temporarily unavailable. Please refresh in a moment.";

function normalizeFeedPayload(payload: unknown): FeedRequestCard[] | null {
  const parsed = feedRequestCardSchema.array().safeParse(payload ?? []);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

function normalizeSnapshotPayload(payload: unknown): WorkspaceSnapshot | null {
  const parsed = workspaceSnapshotSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
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

async function fetchLandingFeed(limit = 8) {
  const supabase = await getSupabaseServerClientOrNull();
  if (!supabase) {
    return !isProduction
      ? { feed: previewFeed.slice(0, limit), feedError: "" }
      : { feed: [] as FeedRequestCard[], feedError: feedUnavailableMessage };
  }

  const { data, error } = await supabase.rpc("get_public_request_feed", {
    limit_count: limit,
  });

  if (error) {
    return { feed: [] as FeedRequestCard[], feedError: feedUnavailableMessage };
  }

  const normalized = normalizeFeedPayload(data);
  if (!normalized) {
    return { feed: [] as FeedRequestCard[], feedError: feedUnavailableMessage };
  }

  return { feed: normalized.slice(0, limit), feedError: "" };
}

export async function getLandingFeed(limit = 8) {
  const { feed } = await fetchLandingFeed(limit);
  return feed;
}

export async function getPublicRequestDetail(id: string) {
  const supabase = await getSupabaseServerClientOrNull();
  if (!supabase) {
    if (!isProduction) {
      return {
        request: previewFeed.find((entry) => entry.id === id) ?? null,
        requestError: "",
      };
    }

    return {
      request: null,
      requestError: requestUnavailableMessage,
    };
  }

  const { data, error } = await supabase.rpc("get_public_request_detail", {
    request_id_input: id,
  });

  if (error) {
    return {
      request: null,
      requestError: requestUnavailableMessage,
    };
  }

  const parsed = feedRequestCardSchema.nullable().safeParse(data ?? null);
  if (!parsed.success) {
    return {
      request: null,
      requestError: requestUnavailableMessage,
    };
  }

  return {
    request: parsed.data,
    requestError: "",
  };
}

export async function getWorkspaceSnapshot() {
  const supabase = await getSupabaseServerClientOrNull();
  if (!supabase) {
    return {
      snapshot: !isProduction ? previewWorkspace : emptyWorkspaceSnapshot,
      preview: !isProduction,
      setupError: !isProduction
        ? "Some account features are unavailable right now, so a limited preview is showing."
        : workspaceUnavailableMessage,
    };
  }

  const { data, error } = await supabase.rpc("get_workspace_snapshot");
  if (error) {
    return {
      snapshot: emptyWorkspaceSnapshot,
      preview: true,
      setupError: workspaceUnavailableMessage,
    };
  }

  const normalized = normalizeSnapshotPayload(data);
  if (!normalized) {
    return {
      snapshot: emptyWorkspaceSnapshot,
      preview: true,
      setupError: workspaceUnavailableMessage,
    };
  }

  return {
    snapshot: normalized,
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
  const [user, landingFeed] = await Promise.all([getAuthenticatedUser(), fetchLandingFeed()]);
  return {
    user,
    feed: landingFeed.feed,
    feedError: landingFeed.feedError,
    hasSupabaseEnv,
  };
}

export async function getWorkspacePageState() {
  const [user, landingFeed, workspace, adminDashboard] = await Promise.all([
    getAuthenticatedUser(),
    fetchLandingFeed(12),
    getWorkspaceSnapshot(),
    getAdminDashboard(),
  ]);

  return {
    user,
    feed: landingFeed.feed,
    feedError: landingFeed.feedError,
    hasSupabaseEnv,
    adminDashboard,
    ...workspace,
  };
}

export async function getExplorePageState(limit = 18) {
  const landingFeed = await fetchLandingFeed(limit);
  return { feed: landingFeed.feed, feedError: landingFeed.feedError, hasSupabaseEnv };
}

export async function getAppLayoutState() {
  const [user, workspace] = await Promise.all([getAuthenticatedUser(), getWorkspaceSnapshot()]);

  const inboxCount =
    workspace.snapshot.incomingJoinRequests.length + (workspace.snapshot.activeSession ? 1 : 0);

  return {
    user,
    hasSupabaseEnv,
    preview: workspace.preview,
    setupError: workspace.setupError,
    role: workspace.snapshot.profile.role,
    inboxCount,
  };
}

export async function getFeedPageState(limit = 18) {
  const [user, landingFeed, workspace] = await Promise.all([getAuthenticatedUser(), fetchLandingFeed(limit), getWorkspaceSnapshot()]);
  return {
    user,
    feed: landingFeed.feed,
    feedError: landingFeed.feedError,
    hasSupabaseEnv,
    ownerRequestIds: workspace.snapshot.myRequests.filter((request) => request.status === "open").map((request) => request.id),
  };
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
