const API_BASE = window.location.origin && window.location.origin.startsWith("http")
  ? window.location.origin
  : "http://localhost:8787";
const AUTH_TOKEN_KEY = "tagalong_auth_token";

const MODE_PROFILES = {
  social: {
    short: "Social",
    long: "Social Plus-One",
    laneTitle: "Social lane expectations",
    laneDescription:
      "People here are typically looking for enjoyable company and open conversation in public spaces.",
    titleLabel: "Event or hangout title",
    titlePlaceholder: "Night market + food walk",
    locationLabel: "Meetup area",
    locationPlaceholder: "Bandra West",
    tagsLabel: "Vibe tags",
    tagsPlaceholder: "chill, foodie, outgoing",
    defaultCategory: "music",
    defaultRadius: 8,
  },
  errand: {
    short: "Errand",
    long: "Errand Companion",
    laneTitle: "Errand lane expectations",
    laneDescription:
      "People here usually need structured, practical companionship with clear timing and destination details.",
    titleLabel: "Errand or task title",
    titlePlaceholder: "Hospital follow-up visit",
    locationLabel: "Destination / area",
    locationPlaceholder: "Andheri East",
    tagsLabel: "Need tags",
    tagsPlaceholder: "calm, paperwork, support",
    defaultCategory: "hospital",
    defaultRadius: 6,
  },
};

const FALLBACK_DATA = {
  metrics: {
    social: { matchTime: "9 min", completionRate: "84%", verifiedShare: "75%" },
    errand: { matchTime: "13 min", completionRate: "90%", verifiedShare: "82%" },
  },
  categories: {
    social: [
      { value: "music", label: "Music / Party" },
      { value: "explore", label: "City Explore" },
      { value: "food", label: "Food Walk" },
      { value: "sports", label: "Sports / Live Event" },
    ],
    errand: [
      { value: "hospital", label: "Hospital Visit" },
      { value: "paperwork", label: "Paperwork / Office" },
      { value: "shopping", label: "Shopping Run" },
      { value: "travel", label: "Airport / Transit" },
    ],
  },
  requests: [
    {
      id: "r1",
      mode: "social",
      title: "Indie gig + coffee after",
      category: "music",
      location: "Lower Parel",
      time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      tags: ["music", "chill", "new-friends"],
      verifiedOnly: true,
      status: "open",
      createdBy: "u-demo-1",
      createdByName: "Rhea",
    },
    {
      id: "r2",
      mode: "errand",
      title: "Hospital follow-up visit",
      category: "hospital",
      location: "Andheri East",
      time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      tags: ["hospital", "calm", "support"],
      verifiedOnly: true,
      status: "open",
      createdBy: "u-demo-2",
      createdByName: "Ishita",
    },
  ],
  posts: [
    {
      id: "post-1",
      userId: "u-demo-1",
      displayName: "Rhea",
      text: "Great experience at a public event. Clear meetup point and ETA check-ins helped a lot.",
      tags: ["music", "new-friends"],
      visibility: "public",
      helpfulCount: 3,
      createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    },
    {
      id: "post-2",
      userId: "u-demo-2",
      displayName: "Ishita",
      text: "Errand companionship felt easy today. Planning details upfront made the flow smooth.",
      tags: ["errand", "support"],
      visibility: "public",
      helpfulCount: 1,
      createdAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    },
  ],
};

const state = {
  backendReady: false,
  authRequired: false,
  googleAuthEnabled: false,
  googleClientId: "",
  googleReady: false,
  activeLane: "social",
  feedMode: "requests",
  searchQuery: "",
  metrics: { ...FALLBACK_DATA.metrics },
  categories: { ...FALLBACK_DATA.categories },
  requests: [...FALLBACK_DATA.requests],
  posts: [...FALLBACK_DATA.posts],
  myRequests: [],
  auth: {
    token: "",
    user: null,
    mode: "login",
  },
  activeRequest: null,
  matches: [],
  activeMatchId: null,
  chatMessages: [],
  localMessagesByRequest: {},
  checkInStarted: false,
  profile: {
    userId: null,
    data: null,
    posts: [],
    activeTab: "posts",
  },
  modals: {
    auth: false,
    admin: false,
    match: false,
    request: false,
    share: false,
    profile: false,
  },
  adminData: {
    overview: null,
    users: [],
    requests: [],
  },
  helpfulReactions: {},
};

const dom = {
  body: document.body,
  heroTitle: document.querySelector("#heroTitle"),
  heroSubtext: document.querySelector("#heroSubtext"),

  topnav: document.querySelector("#topnav"),
  navTagline: document.querySelector("#navTagline"),
  authBtn: document.querySelector("#authBtn"),
  startNowBtn: document.querySelector("#startNowBtn"),
  shareExperienceBtn: document.querySelector("#shareExperienceBtn"),

  accountMenuWrap: document.querySelector("#accountMenuWrap"),
  accountMenuBtn: document.querySelector("#accountMenuBtn"),
  accountMenu: document.querySelector("#accountMenu"),
  accountProfileBtn: document.querySelector("#accountProfileBtn"),
  accountSettingsBtn: document.querySelector("#accountSettingsBtn"),
  adminConsoleBtn: document.querySelector("#adminConsoleBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),

  myRequestsEmpty: document.querySelector("#myRequestsEmpty"),
  myRequestsSummary: document.querySelector("#myRequestsSummary"),

  refreshChatBtn: document.querySelector("#refreshChatBtn"),
  matchSessionBanner: document.querySelector("#matchSessionBanner"),
  emptyState: document.querySelector("#emptyState"),
  matchList: document.querySelector("#matchList"),
  sessionChat: document.querySelector("#sessionChat"),
  chatHint: document.querySelector("#chatHint"),
  chatEmptyState: document.querySelector("#chatEmptyState"),
  chatList: document.querySelector("#chatList"),
  chatForm: document.querySelector("#chatForm"),
  chatInput: document.querySelector("#chatInput"),

  refreshFeedBtn: document.querySelector("#refreshFeedBtn"),
  feedToggleRequests: document.querySelector("#feedToggleRequests"),
  feedTogglePosts: document.querySelector("#feedTogglePosts"),
  searchInput: document.querySelector("#searchInput"),
  clearSearchBtn: document.querySelector("#clearSearchBtn"),
  feedHint: document.querySelector("#feedHint"),
  feedEmptyState: document.querySelector("#feedEmptyState"),
  feedList: document.querySelector("#feedList"),
  postsList: document.querySelector("#postsList"),

  matchTime: document.querySelector("#matchTime"),
  completionRate: document.querySelector("#completionRate"),
  verifiedShare: document.querySelector("#verifiedShare"),
  checkInBtn: document.querySelector("#checkInBtn"),
  checkInStatus: document.querySelector("#checkInStatus"),

  requestModal: document.querySelector("#requestModal"),
  requestBackdrop: document.querySelector("#requestBackdrop"),
  requestCloseBtn: document.querySelector("#requestCloseBtn"),
  laneSocialBtn: document.querySelector("#laneSocialBtn"),
  laneErrandBtn: document.querySelector("#laneErrandBtn"),
  laneTitle: document.querySelector("#laneTitle"),
  laneDescription: document.querySelector("#laneDescription"),
  requestForm: document.querySelector("#requestForm"),
  categorySelect: document.querySelector("#category"),
  titleLabel: document.querySelector("#titleLabel"),
  locationLabel: document.querySelector("#locationLabel"),
  tagsLabel: document.querySelector("#tagsLabel"),
  titleInput: document.querySelector("#title"),
  locationInput: document.querySelector("#location"),
  timeInput: document.querySelector("#time"),
  tagsInput: document.querySelector("#tags"),
  radiusInput: document.querySelector("#radius"),
  radiusValue: document.querySelector("#radiusValue"),
  verifiedOnlyInput: document.querySelector("#verifiedOnly"),
  checkInInput: document.querySelector("#checkIn"),

  shareModal: document.querySelector("#shareModal"),
  shareBackdrop: document.querySelector("#shareBackdrop"),
  shareCloseBtn: document.querySelector("#shareCloseBtn"),
  sharePostForm: document.querySelector("#sharePostForm"),
  sharePostText: document.querySelector("#sharePostText"),
  sharePostTags: document.querySelector("#sharePostTags"),
  sharePostVerifiedOnly: document.querySelector("#sharePostVerifiedOnly"),

  profileModal: document.querySelector("#profileModal"),
  profileBackdrop: document.querySelector("#profileBackdrop"),
  profileCloseBtn: document.querySelector("#profileCloseBtn"),
  profileLoadingSkeleton: document.querySelector("#profileLoadingSkeleton"),
  profilePanel: document.querySelector("#profilePanel"),
  profileTabsWrap: document.querySelector("#profileTabsWrap"),
  publicProfileAvatar: document.querySelector("#publicProfileAvatar"),
  publicProfileName: document.querySelector("#publicProfileName"),
  publicProfileJoinDate: document.querySelector("#publicProfileJoinDate"),
  publicProfileVerified: document.querySelector("#publicProfileVerified"),
  publicProfileReliability: document.querySelector("#publicProfileReliability"),
  publicProfileCompletion: document.querySelector("#publicProfileCompletion"),
  profileTabPosts: document.querySelector("#profileTabPosts"),
  profileTabRequests: document.querySelector("#profileTabRequests"),
  profileTabEmpty: document.querySelector("#profileTabEmpty"),
  profilePostsList: document.querySelector("#profilePostsList"),
  profileRequestsList: document.querySelector("#profileRequestsList"),

  matchModal: document.querySelector("#matchModal"),
  matchBackdrop: document.querySelector("#matchBackdrop"),
  matchCloseBtn: document.querySelector("#matchCloseBtn"),
  profileName: document.querySelector("#profileName"),
  profileVerified: document.querySelector("#profileVerified"),
  profileSummary: document.querySelector("#profileSummary"),
  profileReliability: document.querySelector("#profileReliability"),
  profileDistance: document.querySelector("#profileDistance"),
  profileCompleted: document.querySelector("#profileCompleted"),
  profileSupports: document.querySelector("#profileSupports"),
  profileTags: document.querySelector("#profileTags"),
  profilePingBtn: document.querySelector("#profilePingBtn"),
  profileAcceptBtn: document.querySelector("#profileAcceptBtn"),

  authModal: document.querySelector("#authModal"),
  authBackdrop: document.querySelector("#authBackdrop"),
  authCloseBtn: document.querySelector("#authCloseBtn"),
  authLoginTab: document.querySelector("#authLoginTab"),
  authRegisterTab: document.querySelector("#authRegisterTab"),
  authForm: document.querySelector("#authForm"),
  displayNameWrap: document.querySelector("#displayNameWrap"),
  authDisplayName: document.querySelector("#authDisplayName"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  authSubmitBtn: document.querySelector("#authSubmitBtn"),
  verifyEmailToggleBtn: document.querySelector("#verifyEmailToggleBtn"),
  forgotPasswordToggleBtn: document.querySelector("#forgotPasswordToggleBtn"),
  verifyEmailForm: document.querySelector("#verifyEmailForm"),
  verifyEmailInput: document.querySelector("#verifyEmailInput"),
  verifyCodeInput: document.querySelector("#verifyCodeInput"),
  requestVerifyCodeBtn: document.querySelector("#requestVerifyCodeBtn"),
  passwordResetForm: document.querySelector("#passwordResetForm"),
  resetEmailInput: document.querySelector("#resetEmailInput"),
  resetCodeInput: document.querySelector("#resetCodeInput"),
  resetNewPasswordInput: document.querySelector("#resetNewPasswordInput"),
  requestResetCodeBtn: document.querySelector("#requestResetCodeBtn"),
  googleAuthBtn: document.querySelector("#googleAuthBtn"),
  googleAuthHint: document.querySelector("#googleAuthHint"),

  adminModal: document.querySelector("#adminModal"),
  adminBackdrop: document.querySelector("#adminBackdrop"),
  adminCloseBtn: document.querySelector("#adminCloseBtn"),
  adminRefreshBtn: document.querySelector("#adminRefreshBtn"),
  adminUsersTotal: document.querySelector("#adminUsersTotal"),
  adminAdminsTotal: document.querySelector("#adminAdminsTotal"),
  adminOpenRequests: document.querySelector("#adminOpenRequests"),
  adminMatchedRequests: document.querySelector("#adminMatchedRequests"),
  adminOpenReports: document.querySelector("#adminOpenReports"),
  adminEventsTotal: document.querySelector("#adminEventsTotal"),
  adminUsersList: document.querySelector("#adminUsersList"),
  adminRequestsList: document.querySelector("#adminRequestsList"),

  toast: document.querySelector("#toast"),
};

let toastTimeoutId = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(message) {
  if (!dom.toast) {
    return;
  }
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  if (toastTimeoutId) {
    window.clearTimeout(toastTimeoutId);
  }
  toastTimeoutId = window.setTimeout(() => {
    dom.toast.classList.remove("show");
  }, 2300);
}

function safeApiErrorMessage(error, fallback) {
  void error;
  return fallback;
}

function formatDateTime(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Flexible time";
  }
  return parsed.toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

function formatRelativeTime(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Just now";
  }
  const diffMs = Date.now() - parsed.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }
  return parsed.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function formatJoinDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Joined recently";
  }
  return `Joined ${parsed.toLocaleDateString([], { month: "short", year: "numeric" })}`;
}

function normalizeTags(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => String(entry).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8);
  }
  return String(raw || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
}

function parseMode(mode) {
  return mode === "errand" ? "errand" : "social";
}

function modeProfile(mode = state.activeLane) {
  return MODE_PROFILES[parseMode(mode)] || MODE_PROFILES.social;
}

function avatarInitial(name) {
  const value = String(name || "Member").trim();
  return value ? value.charAt(0).toUpperCase() : "M";
}

function loadStoredToken() {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function saveStoredToken(token) {
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

function clearStoredToken() {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (state.auth.token && !headers.Authorization) {
    headers.Authorization = `Bearer ${state.auth.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let details = `HTTP ${response.status}`;
    try {
      const payload = await response.json();
      if (payload && payload.error) {
        details = payload.error;
      }
    } catch {
      // ignore
    }

    const error = new Error(details);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function closeAccountMenu() {
  dom.accountMenu.classList.add("hidden");
  dom.accountMenuBtn.setAttribute("aria-expanded", "false");
}

function toggleAccountMenu() {
  const hidden = dom.accountMenu.classList.contains("hidden");
  dom.accountMenu.classList.toggle("hidden", !hidden);
  dom.accountMenuBtn.setAttribute("aria-expanded", String(hidden));
}

function setAuthMode(mode) {
  state.auth.mode = mode === "register" ? "register" : "login";
  const isRegister = state.auth.mode === "register";

  dom.authLoginTab.classList.toggle("active", !isRegister);
  dom.authLoginTab.setAttribute("aria-selected", String(!isRegister));
  dom.authRegisterTab.classList.toggle("active", isRegister);
  dom.authRegisterTab.setAttribute("aria-selected", String(isRegister));
  dom.displayNameWrap.classList.toggle("hidden", !isRegister);
  dom.authDisplayName.required = isRegister;
  dom.authPassword.setAttribute("autocomplete", isRegister ? "new-password" : "current-password");
  dom.authSubmitBtn.textContent = isRegister ? "Create Account" : "Sign In";
}

function setAuthAuxPanels({ verifyVisible = false, resetVisible = false } = {}) {
  dom.verifyEmailForm.classList.toggle("hidden", !verifyVisible);
  dom.passwordResetForm.classList.toggle("hidden", !resetVisible);
}

function openModal(name) {
  const map = {
    auth: dom.authModal,
    admin: dom.adminModal,
    match: dom.matchModal,
    request: dom.requestModal,
    share: dom.shareModal,
    profile: dom.profileModal,
  };
  const node = map[name];
  if (!node) {
    return;
  }
  state.modals[name] = true;
  node.classList.remove("hidden");
  node.setAttribute("aria-hidden", "false");
}

function closeModal(name) {
  const map = {
    auth: dom.authModal,
    admin: dom.adminModal,
    match: dom.matchModal,
    request: dom.requestModal,
    share: dom.shareModal,
    profile: dom.profileModal,
  };
  const node = map[name];
  if (!node) {
    return;
  }
  state.modals[name] = false;
  node.classList.add("hidden");
  node.setAttribute("aria-hidden", "true");
}

function openAuthModal(mode = "login") {
  setAuthMode(mode);
  setAuthAuxPanels({ verifyVisible: false, resetVisible: false });
  openModal("auth");
  dom.authEmail.focus();
}

function closeAuthModal() {
  setAuthAuxPanels({ verifyVisible: false, resetVisible: false });
  closeModal("auth");
}

function openRequestModal() {
  applyLaneToForm();
  openModal("request");
  dom.titleInput.focus();
}

function closeRequestModal() {
  closeModal("request");
}

function openShareModal() {
  openModal("share");
  dom.sharePostText.focus();
}

function closeShareModal() {
  closeModal("share");
}

function setProfileRoute(userId, replace = false) {
  const target = userId ? `/profile/${encodeURIComponent(userId)}` : "/";
  if (window.location.pathname === target) {
    return;
  }
  if (replace) {
    window.history.replaceState({}, "", target);
  } else {
    window.history.pushState({}, "", target);
  }
}

function openProfileModal(userId, options = {}) {
  const { updateRoute = true } = options;
  state.profile.userId = userId;
  state.profile.activeTab = "posts";
  state.profile.data = null;
  state.profile.posts = [];
  renderProfileModal();
  openModal("profile");
  if (updateRoute && userId) {
    setProfileRoute(userId);
  }
  void loadProfile(userId);
}

function closeProfileModal(options = {}) {
  const { updateRoute = true } = options;
  closeModal("profile");
  if (updateRoute) {
    setProfileRoute(null);
  }
}

function openMatchModal(matchId) {
  const match = state.matches.find((entry) => entry.id === matchId);
  if (!match) {
    showToast("Companion profile is not available.");
    return;
  }
  state.activeMatchId = match.id;
  renderMatchProfile(match);
  openModal("match");
}

function closeMatchModal() {
  state.activeMatchId = null;
  closeModal("match");
}

function isAdminUser() {
  return Boolean(state.auth.user && state.auth.user.role === "admin");
}

function applyAuthPayload(payload) {
  state.auth.token = payload.token;
  state.auth.user = payload.user;
  saveStoredToken(payload.token);
  updateAuthUI();
  closeAuthModal();
  void loadData();
}

function clearSession() {
  state.auth.token = "";
  state.auth.user = null;
  clearStoredToken();
  closeAccountMenu();
  closeModal("admin");
  updateAuthUI();
  refreshSessionWorkspace();
}

function requireAuthForAction(actionLabel) {
  if (state.auth.user) {
    return true;
  }
  openAuthModal("login");
  showToast(`Sign in to ${actionLabel}.`);
  return false;
}

function handleApiAuthError(error) {
  if (error && error.status === 401) {
    clearSession();
    openAuthModal("login");
    showToast("Session expired. Sign in again.");
    return true;
  }
  if (error && error.status === 403) {
    const message = String(error.message || "").toLowerCase();
    if (message.includes("verification")) {
      openAuthModal("login");
      setAuthAuxPanels({ verifyVisible: true, resetVisible: false });
      showToast("Verify your email to continue.");
      return true;
    }
    showToast("You do not have permission for this action.");
    return true;
  }
  return false;
}

function updateAuthUI() {
  const user = state.auth.user;
  const loggedIn = Boolean(user);

  dom.authBtn.classList.toggle("hidden", loggedIn);
  dom.shareExperienceBtn.classList.toggle("hidden", !loggedIn);
  dom.accountMenuWrap.classList.toggle("hidden", !loggedIn);
  dom.topnav.classList.toggle("hidden", !loggedIn);
  dom.navTagline.classList.toggle("hidden", loggedIn);

  if (loggedIn) {
    const label = user.displayName || user.email || "Account";
    dom.accountMenuBtn.textContent = avatarInitial(label);
    dom.accountMenuBtn.setAttribute("aria-label", `${label} account menu`);
    dom.accountMenuBtn.setAttribute("title", label);
  } else {
    dom.accountMenuBtn.textContent = "A";
    dom.accountMenuBtn.setAttribute("aria-label", "Account menu");
    dom.accountMenuBtn.setAttribute("title", "Account menu");
    closeAccountMenu();
  }

  dom.adminConsoleBtn.classList.toggle("hidden", !isAdminUser());
  renderFeedMode();
}

function updateGoogleAuthUI() {
  const enabled = state.googleAuthEnabled && Boolean(state.googleClientId);
  dom.googleAuthBtn.disabled = !enabled;
  if (enabled) {
    dom.googleAuthHint.classList.add("hidden");
    dom.googleAuthHint.textContent = "";
  } else {
    dom.googleAuthHint.classList.remove("hidden");
    dom.googleAuthHint.textContent = "Google sign-in not configured yet.";
  }
}

async function handleGoogleCredentialResponse(response) {
  const idToken = response && response.credential ? response.credential : "";
  if (!idToken) {
    showToast("Google sign-in failed.");
    return;
  }

  try {
    const authPayload = await apiFetch("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });
    applyAuthPayload(authPayload);
    showToast("Signed in with Google.");
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast(safeApiErrorMessage(error, "Could not sign in with Google."));
  }
}

function initializeGoogleAuth() {
  if (!state.googleAuthEnabled || !state.googleClientId || !window.google?.accounts?.id) {
    state.googleReady = false;
    return;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: state.googleClientId,
      callback: handleGoogleCredentialResponse,
      ux_mode: "popup",
    });
    state.googleReady = true;
  } catch {
    state.googleReady = false;
  }
}

function setLane(mode) {
  state.activeLane = parseMode(mode);
  dom.body.classList.remove("mode-social", "mode-errand");
  dom.body.classList.add(`mode-${state.activeLane}`);

  dom.laneSocialBtn.classList.toggle("active", state.activeLane === "social");
  dom.laneSocialBtn.setAttribute("aria-selected", String(state.activeLane === "social"));
  dom.laneErrandBtn.classList.toggle("active", state.activeLane === "errand");
  dom.laneErrandBtn.setAttribute("aria-selected", String(state.activeLane === "errand"));

  applyLaneToForm();
  updateMetrics();
}

function setDefaultTime() {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000);
  const localValue = `${nextHour.getFullYear()}-${String(nextHour.getMonth() + 1).padStart(2, "0")}-${String(nextHour.getDate()).padStart(2, "0")}T${String(nextHour.getHours()).padStart(2, "0")}:${String(nextHour.getMinutes()).padStart(2, "0")}`;
  dom.timeInput.value = localValue;
}

function updateRadiusValue() {
  dom.radiusValue.textContent = `${Number(dom.radiusInput.value || 8)} km`;
}

function updateCategoryOptions() {
  const options = state.categories[state.activeLane] || FALLBACK_DATA.categories[state.activeLane] || [];
  dom.categorySelect.innerHTML = options
    .map((entry) => `<option value="${escapeHtml(entry.value)}">${escapeHtml(entry.label)}</option>`)
    .join("");

  const profile = modeProfile();
  if (options.some((entry) => entry.value === profile.defaultCategory)) {
    dom.categorySelect.value = profile.defaultCategory;
  }
}

function applyLaneToForm() {
  const profile = modeProfile();
  dom.laneTitle.textContent = profile.laneTitle;
  dom.laneDescription.textContent = profile.laneDescription;
  dom.titleLabel.textContent = profile.titleLabel;
  dom.locationLabel.textContent = profile.locationLabel;
  dom.tagsLabel.textContent = profile.tagsLabel;
  dom.titleInput.placeholder = profile.titlePlaceholder;
  dom.locationInput.placeholder = profile.locationPlaceholder;
  dom.tagsInput.placeholder = profile.tagsPlaceholder;
  if (!dom.radiusInput.dataset.touched) {
    dom.radiusInput.value = String(profile.defaultRadius);
  }
  updateCategoryOptions();
  updateRadiusValue();
}

function updateMetrics() {
  const metrics = state.metrics[state.activeLane] || FALLBACK_DATA.metrics[state.activeLane];
  if (!metrics) {
    return;
  }
  dom.matchTime.textContent = metrics.matchTime;
  dom.completionRate.textContent = metrics.completionRate;
  dom.verifiedShare.textContent = metrics.verifiedShare;
}

function matchesSearch(parts) {
  if (!state.searchQuery) {
    return true;
  }
  return parts.join(" ").toLowerCase().includes(state.searchQuery);
}

function requestCardHtml(request) {
  const tags = Array.isArray(request.tags) ? request.tags.slice(0, 5) : [];
  const lane = parseMode(request.mode);
  const laneLabel = lane === "errand" ? "Errand" : "Social";
  const resolvedName =
    request.createdByName ||
    request.postedByName ||
    request.displayName ||
    (state.auth.user && request.createdBy === state.auth.user.id
      ? state.auth.user.displayName || state.auth.user.email
      : "") ||
    "Member";
  const safeName = escapeHtml(resolvedName);
  const userLink = request.createdBy
    ? `<button class="text-link" type="button" data-action="open-profile" data-user-id="${escapeHtml(request.createdBy)}">${safeName}</button>`
    : safeName;

  return `
    <article class="item request-card">
      <div class="item-head">
        <h3>${escapeHtml(request.title || "Untitled request")}</h3>
        <span class="tag lane-${escapeHtml(lane)}">${laneLabel}</span>
      </div>
      <p>${escapeHtml(request.location || "Unknown area")} • ${escapeHtml(formatDateTime(request.time))}</p>
      <div class="meta">
        ${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        ${request.verifiedOnly ? '<span class="tag">Verified-only</span>' : ""}
      </div>
      <div class="item-actions">
        <span class="score">Posted by ${userLink}</span>
        <button class="secondary" type="button" data-action="join" data-request-id="${escapeHtml(request.id)}">Join Request</button>
      </div>
    </article>
  `;
}

function postCardHtml(post) {
  const tags = Array.isArray(post.tags) ? post.tags.slice(0, 5) : [];
  const reactionKey = `post:${post.id}`;
  const reactionCount = Number(post.helpfulCount || 0) + Number(state.helpfulReactions[reactionKey] || 0);
  return `
    <article class="item post-card">
      <div class="post-head">
        <button class="post-author" type="button" data-action="open-profile" data-user-id="${escapeHtml(post.userId)}">
          <span class="avatar-initial small">${escapeHtml(avatarInitial(post.displayName))}</span>
          <span>${escapeHtml(post.displayName || "Member")}</span>
        </button>
        <span class="tag">${escapeHtml(formatRelativeTime(post.createdAt))}</span>
      </div>
      <p class="post-text">${escapeHtml(post.text || "")}</p>
      <div class="image-placeholder" aria-hidden="true">Image upload coming soon</div>
      <div class="meta">
        ${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        ${post.visibility === "verified-only" ? '<span class="tag">Verified audience</span>' : ""}
      </div>
      <div class="item-actions">
        <span></span>
        <button class="ghost small" type="button" data-action="helpful" data-post-id="${escapeHtml(post.id)}">❤ Helpful (${reactionCount})</button>
      </div>
    </article>
  `;
}

function renderRequestsFeed() {
  const openRequests = state.requests
    .filter((entry) => entry.status === "open")
    .filter((entry) =>
      matchesSearch([
        entry.title || "",
        entry.location || "",
        entry.category || "",
        (entry.tags || []).join(" "),
        entry.createdByName || "",
      ])
    )
    .sort((left, right) => new Date(right.createdAt || right.time || 0) - new Date(left.createdAt || left.time || 0));

  if (openRequests.length === 0) {
    dom.feedEmptyState.textContent = "No requests nearby right now. Be the first to post one.";
    dom.feedEmptyState.classList.remove("hidden");
    dom.feedList.innerHTML = "";
    return;
  }

  dom.feedEmptyState.classList.add("hidden");
  dom.feedList.innerHTML = openRequests.map(requestCardHtml).join("");
}

function renderPostsFeed() {
  const posts = state.posts
    .filter((entry) => matchesSearch([entry.text || "", (entry.tags || []).join(" "), entry.displayName || ""]))
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

  if (posts.length === 0) {
    dom.feedEmptyState.textContent = "No meetup stories yet. Share your first experience.";
    dom.feedEmptyState.classList.remove("hidden");
    dom.postsList.innerHTML = "";
    return;
  }

  dom.feedEmptyState.classList.add("hidden");
  dom.postsList.innerHTML = posts.map(postCardHtml).join("");
}

function renderFeedMode() {
  const showingRequests = state.feedMode === "requests";
  dom.feedToggleRequests.classList.toggle("active", showingRequests);
  dom.feedToggleRequests.setAttribute("aria-selected", String(showingRequests));
  dom.feedTogglePosts.classList.toggle("active", !showingRequests);
  dom.feedTogglePosts.setAttribute("aria-selected", String(!showingRequests));

  dom.feedList.classList.toggle("hidden", !showingRequests);
  dom.postsList.classList.toggle("hidden", showingRequests);

  const loggedIn = Boolean(state.auth.user);
  if (loggedIn) {
    dom.feedHint.classList.add("hidden");
    dom.feedHint.textContent = "";
  } else {
    dom.feedHint.classList.remove("hidden");
    dom.feedHint.textContent = showingRequests
      ? "Browse live requests without signing in. Actions require an account."
      : "Browse posts without signing in. Actions require an account.";
  }

  if (showingRequests) {
    renderRequestsFeed();
  } else {
    renderPostsFeed();
  }
}

function renderMyRequestsSummary() {
  if (!state.auth.user) {
    dom.myRequestsEmpty.textContent = "Sign in to track your active requests.";
    dom.myRequestsEmpty.classList.remove("hidden");
    dom.myRequestsSummary.innerHTML = "";
    return;
  }

  const mine = state.myRequests
    .filter((entry) => ["open", "matched", "closed"].includes(entry.status))
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

  if (mine.length === 0) {
    dom.myRequestsEmpty.textContent = "You have no active requests yet. Post one to get started.";
    dom.myRequestsEmpty.classList.remove("hidden");
    dom.myRequestsSummary.innerHTML = "";
    return;
  }

  dom.myRequestsEmpty.classList.add("hidden");
  dom.myRequestsSummary.innerHTML = mine
    .slice(0, 6)
    .map((entry) => {
      const lane = parseMode(entry.mode);
      return `
        <article class="item compact">
          <div class="item-head">
            <h3>${escapeHtml(entry.title)}</h3>
            <span class="tag lane-${lane}">${lane === "errand" ? "Errand" : "Social"}</span>
          </div>
          <p>${escapeHtml(formatDateTime(entry.time))} • ${escapeHtml(entry.status)}</p>
          <div class="item-actions">
            <button class="ghost small" type="button" data-action="activate-request" data-request-id="${escapeHtml(entry.id)}">Open Session</button>
            ${entry.status === "open" ? `<button class="secondary" type="button" data-action="find-matches" data-request-id="${escapeHtml(entry.id)}">Find Matches</button>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
}

function getActiveChatRequest() {
  if (!state.activeRequest) {
    return null;
  }
  if (state.activeRequest.status !== "matched") {
    return null;
  }
  if (!state.activeRequest.matchedUserId) {
    return null;
  }
  return state.activeRequest;
}

function renderChat() {
  const request = getActiveChatRequest();
  if (!request) {
    const hasOpenRequest = Boolean(state.activeRequest && state.activeRequest.status === "open");
    dom.chatHint.textContent = hasOpenRequest
      ? "Your request is open. Find a match or wait for someone to join."
      : "Join or match a request to unlock private coordination chat.";
    dom.chatEmptyState.classList.remove("hidden");
    dom.chatList.innerHTML = "";
    dom.chatForm.classList.add("hidden");
    return;
  }

  dom.chatHint.textContent = `Session for "${request.title}". Keep details practical: location pin, ETA, and check-in preferences.`;
  dom.chatForm.classList.remove("hidden");

  if (!Array.isArray(state.chatMessages) || state.chatMessages.length === 0) {
    dom.chatEmptyState.classList.remove("hidden");
    dom.chatEmptyState.textContent = "No messages yet. Start coordination now.";
    dom.chatList.innerHTML = "";
    return;
  }

  dom.chatEmptyState.classList.add("hidden");
  dom.chatList.innerHTML = state.chatMessages
    .map((message) => {
      const isSelf =
        message.senderType === "user" && state.auth.user && String(message.senderUserId) === String(state.auth.user.id);
      const sender = message.senderType === "system" ? "Tag Along" : message.senderName || "Member";
      return `
        <article class="chat-row ${isSelf ? "self" : ""}">
          <p class="chat-meta">${escapeHtml(sender)} • ${escapeHtml(formatRelativeTime(message.createdAt))}</p>
          <div class="chat-bubble">${escapeHtml(message.content || "")}</div>
        </article>
      `;
    })
    .join("");
  dom.chatList.scrollTop = dom.chatList.scrollHeight;
}

function renderMatches() {
  dom.matchSessionBanner.classList.add("hidden");
  dom.matchSessionBanner.textContent = "";

  if (!state.activeRequest) {
    dom.emptyState.textContent = "Post or join a request to start a session.";
    dom.matchList.innerHTML = "";
    return;
  }

  const request = state.activeRequest;

  if (request.status === "matched" && request.matchedUserId) {
    const joinedAsPeer = state.auth.user && String(request.matchedUserId) === String(state.auth.user.id);
    dom.matchSessionBanner.textContent = joinedAsPeer
      ? "You joined this request. Coordinate in chat and use check-ins when you meet."
      : "A verified user joined your request. Coordinate in chat and use check-ins when you meet.";
    dom.matchSessionBanner.classList.remove("hidden");
    dom.emptyState.textContent = "Peer session active. Use the chat panel to coordinate.";
    dom.matchList.innerHTML = "";
    return;
  }

  if (request.status === "matched" && request.matchedCompanionId) {
    dom.matchSessionBanner.textContent = "Companion accepted. Continue coordination and start check-ins at meetup.";
    dom.matchSessionBanner.classList.remove("hidden");
  }

  if (!Array.isArray(state.matches) || state.matches.length === 0) {
    dom.emptyState.textContent = "No ranked companions yet. Open a request and tap Find Matches.";
    dom.matchList.innerHTML = "";
    return;
  }

  dom.emptyState.textContent = "Companions ranked for your active request.";
  dom.matchList.innerHTML = state.matches
    .slice(0, 8)
    .map((entry) => {
      const tags = Array.isArray(entry.tags) ? entry.tags.slice(0, 4) : [];
      return `
        <article class="item compact">
          <div class="item-head">
            <h3>${escapeHtml(entry.name)}</h3>
            <span class="tag">${escapeHtml(String(entry.distanceKm))} km</span>
          </div>
          <p>Reliability ${escapeHtml(String(entry.reliability))}% • ${escapeHtml(String(entry.completed))} sessions</p>
          <div class="meta">
            ${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
            ${entry.verified ? '<span class="tag">Verified</span>' : '<span class="tag">Unverified</span>'}
          </div>
          <div class="item-actions">
            <span class="score">Score ${escapeHtml(String(entry.score || "--"))}</span>
            <button class="secondary" type="button" data-action="view-profile" data-match-id="${escapeHtml(entry.id)}">View Profile</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function updateCheckInControls() {
  if (!state.activeRequest || !state.activeRequest.checkIn) {
    dom.checkInBtn.disabled = true;
    dom.checkInBtn.textContent = "Start Check-In Session";
    dom.checkInStatus.classList.add("hidden");
    dom.checkInStatus.textContent = "";
    return;
  }

  dom.checkInBtn.disabled = false;
  dom.checkInBtn.textContent = state.checkInStarted ? "Stop Check-In Session" : "Start Check-In Session";
  if (!dom.checkInStatus.textContent) {
    dom.checkInStatus.classList.add("hidden");
  }
}

function renderMatchProfile(match) {
  const supports = Array.isArray(match.supports)
    ? match.supports.map((entry) => (entry === "errand" ? "Errand Companion" : "Social Plus-One")).join(" + ")
    : "General";
  dom.profileName.textContent = match.name;
  dom.profileSummary.textContent = `${match.name} supports ${supports.toLowerCase()} sessions and has completed ${match.completed} requests.`;
  dom.profileReliability.textContent = `${match.reliability}%`;
  dom.profileDistance.textContent = `${match.distanceKm} km`;
  dom.profileCompleted.textContent = String(match.completed);
  dom.profileSupports.textContent = supports;
  dom.profileVerified.textContent = match.verified ? "Verified profile" : "Unverified profile";
  dom.profileTags.innerHTML = (Array.isArray(match.tags) ? match.tags : [])
    .slice(0, 5)
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join("");

  const hasActiveRequest = Boolean(state.activeRequest && state.activeRequest.status === "open");
  dom.profilePingBtn.disabled = !hasActiveRequest;
  dom.profileAcceptBtn.disabled = !hasActiveRequest;
  dom.profilePingBtn.textContent = hasActiveRequest ? "Send Ping" : "Post Request First";
  dom.profileAcceptBtn.textContent = hasActiveRequest ? "Accept Companion" : "Post Request First";
}

function renderProfileModal() {
  const profile = state.profile.data;
  if (!profile) {
    dom.profileLoadingSkeleton.classList.remove("hidden");
    dom.profilePanel.classList.add("hidden");
    dom.profileTabsWrap.classList.add("hidden");
    dom.profilePostsList.innerHTML = "";
    dom.profileRequestsList.innerHTML = "";
    dom.profilePostsList.classList.add("hidden");
    dom.profileRequestsList.classList.add("hidden");
    dom.profileTabEmpty.classList.add("hidden");
    return;
  }

  dom.profileLoadingSkeleton.classList.add("hidden");
  dom.profilePanel.classList.remove("hidden");
  dom.profileTabsWrap.classList.remove("hidden");

  dom.publicProfileAvatar.textContent = avatarInitial(profile.displayName);
  dom.publicProfileName.textContent = profile.displayName || "Member";
  dom.publicProfileJoinDate.textContent = formatJoinDate(profile.joinDate);
  dom.publicProfileVerified.textContent = profile.badges?.verified ? "Yes" : "No";
  dom.publicProfileReliability.textContent = `${Number(profile.badges?.reliabilityScore || 0)}%`;
  dom.publicProfileCompletion.textContent = `${Number(profile.badges?.completionRate || 0)}%`;

  const posts = Array.isArray(state.profile.posts) ? state.profile.posts : [];
  const requests = Array.isArray(profile.requests) ? profile.requests : [];

  dom.profileTabPosts.classList.toggle("active", state.profile.activeTab === "posts");
  dom.profileTabPosts.setAttribute("aria-selected", String(state.profile.activeTab === "posts"));
  dom.profileTabRequests.classList.toggle("active", state.profile.activeTab === "requests");
  dom.profileTabRequests.setAttribute("aria-selected", String(state.profile.activeTab === "requests"));
  dom.profilePostsList.classList.toggle("hidden", state.profile.activeTab !== "posts");
  dom.profileRequestsList.classList.toggle("hidden", state.profile.activeTab !== "requests");

  dom.profilePostsList.innerHTML = posts
    .map(
      (post) => `
      <article class="item compact">
        <p class="post-text">${escapeHtml(post.text || "")}</p>
        <div class="meta">
          ${(post.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <p class="small-meta">${escapeHtml(formatRelativeTime(post.createdAt))}</p>
      </article>
    `
    )
    .join("");

  dom.profileRequestsList.innerHTML = requests
    .map(
      (request) => `
      <article class="item compact">
        <div class="item-head">
          <h3>${escapeHtml(request.title || "Request")}</h3>
          <span class="tag lane-${escapeHtml(parseMode(request.mode))}">${request.mode === "errand" ? "Errand" : "Social"}</span>
        </div>
        <p>${escapeHtml(formatDateTime(request.time))} • ${escapeHtml(request.location || "")}</p>
        <div class="meta">
          ${(request.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
          <span class="tag">${escapeHtml(request.status || "open")}</span>
        </div>
      </article>
    `
    )
    .join("");

  const activeTabItems = state.profile.activeTab === "posts" ? posts : requests;
  if (!activeTabItems.length) {
    dom.profileTabEmpty.classList.remove("hidden");
    dom.profileTabEmpty.textContent =
      state.profile.activeTab === "posts"
        ? "No shared meetups yet."
        : "No request history yet.";
  } else {
    dom.profileTabEmpty.classList.add("hidden");
    dom.profileTabEmpty.textContent = "";
  }
}

function renderAdminOverview() {
  const overview = state.adminData.overview;
  if (!overview) {
    dom.adminUsersTotal.textContent = "--";
    dom.adminAdminsTotal.textContent = "--";
    dom.adminOpenRequests.textContent = "--";
    dom.adminMatchedRequests.textContent = "--";
    dom.adminOpenReports.textContent = "--";
    dom.adminEventsTotal.textContent = "--";
    return;
  }

  dom.adminUsersTotal.textContent = String(overview.usersTotal);
  dom.adminAdminsTotal.textContent = String(overview.adminsTotal);
  dom.adminOpenRequests.textContent = String(overview.requestsOpen);
  dom.adminMatchedRequests.textContent = String(overview.requestsMatched);
  dom.adminOpenReports.textContent = String(overview.reportsOpen);
  dom.adminEventsTotal.textContent = String(overview.eventsTotal);
}

function renderAdminUsers() {
  const users = Array.isArray(state.adminData.users) ? state.adminData.users : [];
  if (!users.length) {
    dom.adminUsersList.innerHTML = '<div class="empty-state">No users found.</div>';
    return;
  }

  dom.adminUsersList.innerHTML = users
    .map((user) => {
      const tags = [
        `<span class="tag">${escapeHtml(user.role)}</span>`,
        user.emailVerified ? '<span class="tag">Email verified</span>' : '<span class="tag">Unverified email</span>',
        user.googleLinked ? '<span class="tag">Google linked</span>' : "",
      ]
        .filter(Boolean)
        .join("");

      return `
        <article class="admin-item">
          <div class="item-head">
            <h3>${escapeHtml(user.displayName || user.email)}</h3>
            <span class="tag">${escapeHtml(user.email)}</span>
          </div>
          <div class="admin-meta">${tags}</div>
          <div class="admin-actions">
            <button class="ghost small" type="button" data-admin-action="set-role" data-user-id="${escapeHtml(user.id)}" data-role="admin" ${user.role === "admin" ? "disabled" : ""}>Make Admin</button>
            <button class="ghost small" type="button" data-admin-action="set-role" data-user-id="${escapeHtml(user.id)}" data-role="member" ${user.role !== "admin" ? "disabled" : ""}>Make Member</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAdminRequests() {
  const requests = Array.isArray(state.adminData.requests) ? state.adminData.requests : [];
  if (!requests.length) {
    dom.adminRequestsList.innerHTML = '<div class="empty-state">No requests found.</div>';
    return;
  }

  dom.adminRequestsList.innerHTML = requests
    .slice(0, 40)
    .map(
      (request) => `
      <article class="admin-item">
        <div class="item-head">
          <h3>${escapeHtml(request.title)}</h3>
          <span class="tag">${escapeHtml(request.status || "open")}</span>
        </div>
        <p>${escapeHtml(request.mode)} • ${escapeHtml(request.location)} • ${escapeHtml(request.category)}</p>
        <div class="admin-actions">
          <button class="ghost small" type="button" data-admin-action="set-request-status" data-request-id="${escapeHtml(request.id)}" data-status="open">Set Open</button>
          <button class="ghost small" type="button" data-admin-action="set-request-status" data-request-id="${escapeHtml(request.id)}" data-status="closed">Close</button>
          <button class="ghost small" type="button" data-admin-action="set-request-status" data-request-id="${escapeHtml(request.id)}" data-status="cancelled">Cancel</button>
        </div>
      </article>
    `
    )
    .join("");
}

async function loadAdminData() {
  if (!isAdminUser()) {
    return;
  }

  try {
    const [overviewPayload, usersPayload, requestsPayload] = await Promise.all([
      apiFetch("/api/admin/overview"),
      apiFetch("/api/admin/users"),
      apiFetch("/api/admin/requests"),
    ]);

    state.adminData.overview = overviewPayload.overview || null;
    state.adminData.users = Array.isArray(usersPayload.users) ? usersPayload.users : [];
    state.adminData.requests = Array.isArray(requestsPayload.requests) ? requestsPayload.requests : [];
    renderAdminOverview();
    renderAdminUsers();
    renderAdminRequests();
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast("Could not refresh admin data.");
  }
}

function setCheckInStatus(message = "", visible = false) {
  dom.checkInStatus.textContent = message;
  dom.checkInStatus.classList.toggle("hidden", !visible || !message);
}

async function checkBackend() {
  try {
    const health = await apiFetch("/api/health");
    state.backendReady = true;
    state.authRequired = Boolean(health && health.authRequired);
    state.googleAuthEnabled = Boolean(health && health.googleAuthEnabled);
    state.googleClientId = health && health.googleClientId ? String(health.googleClientId) : "";
  } catch {
    state.backendReady = false;
    state.authRequired = false;
    state.googleAuthEnabled = false;
    state.googleClientId = "";
  }
  updateGoogleAuthUI();
}

async function restoreSession() {
  const token = loadStoredToken();
  if (!token || !state.backendReady) {
    state.auth.token = "";
    state.auth.user = null;
    updateAuthUI();
    return;
  }

  state.auth.token = token;
  try {
    const payload = await apiFetch("/api/auth/me");
    state.auth.user = payload.user || null;
  } catch {
    state.auth.token = "";
    state.auth.user = null;
    clearStoredToken();
  }

  updateAuthUI();
}

async function loadRequests() {
  if (!state.backendReady) {
    state.requests = [...FALLBACK_DATA.requests];
    if (state.auth.user) {
      state.myRequests = FALLBACK_DATA.requests.filter((entry) => entry.createdBy === state.auth.user.id);
    } else {
      state.myRequests = [];
    }
    return;
  }

  const allPayload = await apiFetch("/api/requests");
  state.requests = Array.isArray(allPayload.requests) ? allPayload.requests : [];

  if (state.auth.user) {
    const minePayload = await apiFetch(`/api/requests?createdBy=${encodeURIComponent(state.auth.user.id)}`);
    state.myRequests = Array.isArray(minePayload.requests) ? minePayload.requests : [];
  } else {
    state.myRequests = [];
  }
}

async function loadPosts() {
  if (!state.backendReady) {
    state.posts = [...FALLBACK_DATA.posts];
    return;
  }

  const payload = await apiFetch("/api/posts?limit=30&offset=0");
  state.posts = Array.isArray(payload.posts) ? payload.posts : [];
}

async function loadBootstrap() {
  if (!state.backendReady) {
    state.metrics = { ...FALLBACK_DATA.metrics };
    state.categories = { ...FALLBACK_DATA.categories };
    return;
  }

  const payload = await apiFetch(`/api/bootstrap?mode=${encodeURIComponent(state.activeLane)}`);
  if (payload.metrics) {
    state.metrics = payload.metrics;
  }
  if (payload.categories) {
    state.categories = payload.categories;
  }
}

async function loadData() {
  try {
    await Promise.all([loadBootstrap(), loadRequests(), loadPosts()]);
  } catch {
    state.backendReady = false;
    state.requests = [...FALLBACK_DATA.requests];
    state.posts = [...FALLBACK_DATA.posts];
  }

  renderFeedMode();
  renderMyRequestsSummary();
  refreshSessionWorkspace();
}

async function refreshFeed() {
  try {
    await Promise.all([loadRequests(), loadPosts()]);
    renderFeedMode();
    renderMyRequestsSummary();
    refreshSessionWorkspace();
    showToast("Feed refreshed.");
  } catch {
    showToast("Could not refresh feed.");
  }
}

function buildRequestPayload() {
  return {
    mode: state.activeLane,
    title: dom.titleInput.value.trim(),
    category: dom.categorySelect.value,
    time: dom.timeInput.value,
    location: dom.locationInput.value.trim(),
    radius: Number(dom.radiusInput.value || 8),
    tags: normalizeTags(dom.tagsInput.value),
    verifiedOnly: dom.verifiedOnlyInput.checked,
    checkIn: dom.checkInInput.checked,
  };
}

async function createRequest() {
  if (!requireAuthForAction("post requests")) {
    return;
  }

  const payload = buildRequestPayload();
  if (!payload.title || !payload.location || payload.tags.length === 0) {
    showToast("Add title, location, and at least one tag.");
    return;
  }

  try {
    const created = await apiFetch("/api/requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    state.activeRequest = created.request || null;
    state.matches = Array.isArray(created.matches) ? created.matches : [];
    if (Array.isArray(created.feed)) {
      // no-op, canonical feed comes from /api/requests reload
    }
    state.checkInStarted = false;
    closeRequestModal();
    await refreshFeed();
    updateCheckInControls();
    renderMatches();
    renderChat();
    showToast("Request posted.");
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast(safeApiErrorMessage(error, "Could not post request."));
  }
}

async function createPost() {
  if (!requireAuthForAction("share meetup posts")) {
    return;
  }

  const text = dom.sharePostText.value.trim();
  if (!text) {
    showToast("Write a short experience before publishing.");
    return;
  }

  try {
    const payload = await apiFetch("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        text,
        tags: normalizeTags(dom.sharePostTags.value),
        visibility: dom.sharePostVerifiedOnly.checked ? "verified-only" : "public",
      }),
    });

    if (payload && payload.post) {
      state.posts.unshift(payload.post);
    }
    closeShareModal();
    dom.sharePostForm.reset();
    state.feedMode = "posts";
    renderFeedMode();
    showToast("Meetup story shared.");
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast(safeApiErrorMessage(error, "Could not share meetup post."));
  }
}

async function activateRequestSession(requestId, { loadMatches = false } = {}) {
  const request = state.myRequests.find((entry) => String(entry.id) === String(requestId));
  if (!request) {
    showToast("Request not found.");
    return;
  }

  state.activeRequest = request;
  state.checkInStarted = false;

  if (loadMatches && request.status === "open") {
    try {
      const payload = await apiFetch(`/api/matches?requestId=${encodeURIComponent(request.id)}`);
      state.matches = Array.isArray(payload.matches) ? payload.matches : [];
    } catch (error) {
      if (handleApiAuthError(error)) {
        return;
      }
      showToast("Could not load ranked companions.");
      state.matches = [];
    }
  } else {
    state.matches = [];
  }

  await loadChatMessages();
  refreshSessionWorkspace();
}

async function joinRequest(requestId) {
  if (!requireAuthForAction("join requests")) {
    return;
  }

  try {
    const payload = await apiFetch("/api/actions/join", {
      method: "POST",
      body: JSON.stringify({ requestId }),
    });

    if (payload.request) {
      state.activeRequest = payload.request;
    }
    if (Array.isArray(payload.messages)) {
      state.chatMessages = payload.messages;
    }
    state.matches = [];
    await refreshFeed();
    refreshSessionWorkspace();
    showToast("Request joined. Chat unlocked.");
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast(safeApiErrorMessage(error, "Could not join request."));
  }
}

async function sendPingToCompanion(companionId) {
  if (!state.activeRequest) {
    showToast("Select your request first.");
    return;
  }
  if (!requireAuthForAction("send pings")) {
    return;
  }

  try {
    await apiFetch("/api/actions/ping", {
      method: "POST",
      body: JSON.stringify({
        requestId: state.activeRequest.id,
        companionId,
      }),
    });
    setCheckInStatus("Ping sent. Waiting for companion response.", true);
    showToast("Ping sent.");
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast("Could not send ping.");
  }
}

async function acceptCompanion(companionId) {
  if (!state.activeRequest) {
    showToast("Select your request first.");
    return;
  }
  if (!requireAuthForAction("accept companions")) {
    return;
  }

  try {
    const payload = await apiFetch("/api/actions/accept", {
      method: "POST",
      body: JSON.stringify({
        requestId: state.activeRequest.id,
        companionId,
      }),
    });

    if (payload.request) {
      state.activeRequest = payload.request;
    }
    if (Array.isArray(payload.messages)) {
      state.chatMessages = payload.messages;
    }
    closeMatchModal();
    await refreshFeed();
    refreshSessionWorkspace();
    showToast("Companion accepted.");
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast(safeApiErrorMessage(error, "Could not accept companion."));
  }
}

async function loadChatMessages() {
  const request = getActiveChatRequest();
  if (!request || !state.auth.user) {
    state.chatMessages = [];
    renderChat();
    return;
  }

  try {
    const payload = await apiFetch(`/api/messages?requestId=${encodeURIComponent(request.id)}`);
    state.chatMessages = Array.isArray(payload.messages) ? payload.messages : [];
    renderChat();
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast("Could not load chat messages.");
  }
}

async function sendChatMessage(content) {
  const request = getActiveChatRequest();
  if (!request) {
    showToast("Chat unlocks after a real user joins.");
    return;
  }
  if (!requireAuthForAction("send messages")) {
    return;
  }

  const trimmed = String(content || "").trim();
  if (!trimmed) {
    return;
  }

  try {
    const payload = await apiFetch("/api/messages", {
      method: "POST",
      body: JSON.stringify({
        requestId: request.id,
        content: trimmed,
      }),
    });
    state.chatMessages = Array.isArray(payload.messages) ? payload.messages : state.chatMessages;
    renderChat();
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast("Could not send message.");
  }
}

async function toggleCheckIn() {
  if (!state.activeRequest) {
    showToast("Select an active request first.");
    return;
  }
  if (!requireAuthForAction("run safety check-ins")) {
    return;
  }

  const action = state.checkInStarted ? "stop" : "start";
  try {
    await apiFetch("/api/checkins", {
      method: "POST",
      body: JSON.stringify({
        requestId: state.activeRequest.id,
        action,
      }),
    });

    state.checkInStarted = !state.checkInStarted;
    updateCheckInControls();
    if (state.checkInStarted) {
      setCheckInStatus(`Check-in active for "${state.activeRequest.title}".`, true);
      showToast("Check-in session started.");
    } else {
      setCheckInStatus("Check-in session ended.", true);
      showToast("Check-in session ended.");
    }
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast("Could not update check-in status.");
  }
}

function refreshSessionWorkspace() {
  renderMyRequestsSummary();
  renderMatches();
  renderChat();
  updateCheckInControls();
}

async function loadProfile(userId) {
  try {
    const [profilePayload, postsPayload] = await Promise.all([
      apiFetch(`/api/profile/${encodeURIComponent(userId)}`),
      apiFetch(`/api/posts/${encodeURIComponent(userId)}?limit=20&offset=0`),
    ]);

    state.profile.data = profilePayload.profile || null;
    state.profile.posts = Array.isArray(postsPayload.posts) ? postsPayload.posts : [];
    renderProfileModal();
  } catch {
    state.profile.data = null;
    state.profile.posts = [];
    renderProfileModal();
    showToast("Could not load profile.");
  }
}

function setProfileTab(tab) {
  state.profile.activeTab = tab === "requests" ? "requests" : "posts";
  renderProfileModal();
}

async function openAdminConsole() {
  if (!isAdminUser()) {
    showToast("Admin privileges required.");
    return;
  }
  openModal("admin");
  renderAdminOverview();
  renderAdminUsers();
  renderAdminRequests();
  await loadAdminData();
}

function setFeedMode(mode) {
  state.feedMode = mode === "posts" ? "posts" : "requests";
  renderFeedMode();
}

function updateSearch(value) {
  state.searchQuery = String(value || "").trim().toLowerCase();
  renderFeedMode();
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  if (!state.backendReady) {
    showToast("Backend is offline. Auth is unavailable right now.");
    return;
  }

  const mode = state.auth.mode;
  const email = dom.authEmail.value.trim().toLowerCase();
  const password = dom.authPassword.value;
  const displayName = dom.authDisplayName.value.trim();

  if (!email || !password || (mode === "register" && !displayName)) {
    showToast("Complete all required fields.");
    return;
  }

  const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
  const payload = { email, password };
  if (mode === "register") {
    payload.displayName = displayName;
  }

  try {
    const authPayload = await apiFetch(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (authPayload.verificationRequired) {
      dom.authPassword.value = "";
      dom.verifyEmailInput.value = email;
      setAuthAuxPanels({ verifyVisible: true, resetVisible: false });
      showToast("Account created. Check email for verification code.");
      return;
    }

    applyAuthPayload(authPayload);
    dom.authPassword.value = "";
    showToast(mode === "register" ? "Account created and signed in." : "Signed in.");
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    const message = safeApiErrorMessage(error, "Sign-in failed.");
    if (message.toLowerCase().includes("not verified")) {
      dom.verifyEmailInput.value = email;
      setAuthAuxPanels({ verifyVisible: true, resetVisible: false });
    }
    showToast(message);
  }
}

async function requestVerifyCode() {
  const email = dom.verifyEmailInput.value.trim().toLowerCase();
  if (!email) {
    showToast("Enter your email first.");
    return;
  }

  try {
    await apiFetch("/api/auth/verify-email/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    showToast("Verification code sent.");
  } catch {
    showToast("Could not send verification code.");
  }
}

async function confirmVerifyEmail(event) {
  event.preventDefault();
  const email = dom.verifyEmailInput.value.trim().toLowerCase();
  const code = dom.verifyCodeInput.value.trim();
  if (!email || !code) {
    showToast("Enter email and verification code.");
    return;
  }

  try {
    await apiFetch("/api/auth/verify-email/confirm", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
    setAuthAuxPanels({ verifyVisible: false, resetVisible: false });
    showToast("Email verified. You can sign in now.");
  } catch {
    showToast("Verification failed.");
  }
}

async function requestResetCode() {
  const email = dom.resetEmailInput.value.trim().toLowerCase();
  if (!email) {
    showToast("Enter your email first.");
    return;
  }

  try {
    await apiFetch("/api/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    showToast("Reset code sent.");
  } catch {
    showToast("Could not send reset code.");
  }
}

async function confirmResetPassword(event) {
  event.preventDefault();
  const email = dom.resetEmailInput.value.trim().toLowerCase();
  const code = dom.resetCodeInput.value.trim();
  const newPassword = dom.resetNewPasswordInput.value;

  if (!email || !code || !newPassword) {
    showToast("Complete all reset fields.");
    return;
  }

  try {
    await apiFetch("/api/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ email, code, newPassword }),
    });
    setAuthAuxPanels({ verifyVisible: false, resetVisible: false });
    showToast("Password reset successful.");
  } catch {
    showToast("Password reset failed.");
  }
}

async function updateUserRole(userId, role) {
  try {
    await apiFetch("/api/admin/users/role", {
      method: "POST",
      body: JSON.stringify({ userId, role }),
    });
    await loadAdminData();
    showToast("User role updated.");
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast("Could not update role.");
  }
}

async function updateRequestStatus(requestId, status) {
  try {
    await apiFetch("/api/admin/requests/status", {
      method: "POST",
      body: JSON.stringify({ requestId, status }),
    });
    await loadAdminData();
    await refreshFeed();
    showToast("Request status updated.");
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast("Could not update request status.");
  }
}

function wireEvents() {
  dom.authBtn.addEventListener("click", () => openAuthModal("login"));

  dom.startNowBtn.addEventListener("click", () => {
    if (!requireAuthForAction("post a request")) {
      return;
    }
    openRequestModal();
  });

  dom.shareExperienceBtn.addEventListener("click", () => {
    if (!requireAuthForAction("share meetup experiences")) {
      return;
    }
    openShareModal();
  });

  dom.accountMenuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleAccountMenu();
  });

  dom.accountProfileBtn.addEventListener("click", () => {
    closeAccountMenu();
    if (!state.auth.user) {
      return;
    }
    openProfileModal(state.auth.user.id);
  });

  dom.accountSettingsBtn.addEventListener("click", () => {
    closeAccountMenu();
    showToast("Account settings UI is coming soon.");
  });

  dom.adminConsoleBtn.addEventListener("click", async () => {
    closeAccountMenu();
    await openAdminConsole();
  });

  dom.logoutBtn.addEventListener("click", () => {
    clearSession();
    showToast("Signed out.");
  });

  dom.feedToggleRequests.addEventListener("click", () => setFeedMode("requests"));
  dom.feedTogglePosts.addEventListener("click", () => setFeedMode("posts"));

  dom.searchInput.addEventListener("input", (event) => {
    updateSearch(event.target.value);
  });

  dom.clearSearchBtn.addEventListener("click", () => {
    dom.searchInput.value = "";
    updateSearch("");
  });

  dom.refreshFeedBtn.addEventListener("click", () => {
    void refreshFeed();
  });

  dom.feedList.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("button[data-action]");
    if (!actionBtn) {
      return;
    }

    const action = actionBtn.dataset.action;
    if (action === "join") {
      void joinRequest(actionBtn.dataset.requestId);
      return;
    }

    if (action === "open-profile") {
      openProfileModal(actionBtn.dataset.userId);
    }
  });

  dom.postsList.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("button[data-action]");
    if (!actionBtn) {
      return;
    }
    const action = actionBtn.dataset.action;

    if (action === "open-profile") {
      openProfileModal(actionBtn.dataset.userId);
      return;
    }

    if (action === "helpful") {
      const key = `post:${actionBtn.dataset.postId}`;
      state.helpfulReactions[key] = Number(state.helpfulReactions[key] || 0) + 1;
      renderPostsFeed();
    }
  });

  dom.myRequestsSummary.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    if (button.dataset.action === "activate-request") {
      void activateRequestSession(button.dataset.requestId, { loadMatches: false });
      return;
    }

    if (button.dataset.action === "find-matches") {
      void activateRequestSession(button.dataset.requestId, { loadMatches: true });
    }
  });

  dom.matchList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='view-profile']");
    if (!button) {
      return;
    }
    openMatchModal(button.dataset.matchId);
  });

  dom.refreshChatBtn.addEventListener("click", () => {
    void loadChatMessages();
  });

  dom.chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendChatMessage(dom.chatInput.value);
    dom.chatInput.value = "";
  });

  dom.checkInBtn.addEventListener("click", () => {
    void toggleCheckIn();
  });

  dom.requestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createRequest();
  });

  dom.laneSocialBtn.addEventListener("click", () => setLane("social"));
  dom.laneErrandBtn.addEventListener("click", () => setLane("errand"));
  dom.radiusInput.addEventListener("input", () => {
    dom.radiusInput.dataset.touched = "true";
    updateRadiusValue();
  });

  dom.requestBackdrop.addEventListener("click", closeRequestModal);
  dom.requestCloseBtn.addEventListener("click", closeRequestModal);

  dom.sharePostForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createPost();
  });
  dom.shareBackdrop.addEventListener("click", closeShareModal);
  dom.shareCloseBtn.addEventListener("click", closeShareModal);

  dom.profileTabPosts.addEventListener("click", () => setProfileTab("posts"));
  dom.profileTabRequests.addEventListener("click", () => setProfileTab("requests"));
  dom.profileBackdrop.addEventListener("click", () => closeProfileModal());
  dom.profileCloseBtn.addEventListener("click", () => closeProfileModal());

  dom.matchBackdrop.addEventListener("click", closeMatchModal);
  dom.matchCloseBtn.addEventListener("click", closeMatchModal);
  dom.profilePingBtn.addEventListener("click", () => {
    if (!state.activeMatchId) {
      return;
    }
    void sendPingToCompanion(state.activeMatchId);
  });
  dom.profileAcceptBtn.addEventListener("click", () => {
    if (!state.activeMatchId) {
      return;
    }
    void acceptCompanion(state.activeMatchId);
  });

  dom.authLoginTab.addEventListener("click", () => {
    setAuthMode("login");
    setAuthAuxPanels({ verifyVisible: false, resetVisible: false });
  });
  dom.authRegisterTab.addEventListener("click", () => {
    setAuthMode("register");
    setAuthAuxPanels({ verifyVisible: false, resetVisible: false });
  });

  dom.authForm.addEventListener("submit", handleAuthSubmit);
  dom.verifyEmailToggleBtn.addEventListener("click", () => {
    const next = dom.verifyEmailForm.classList.contains("hidden");
    setAuthAuxPanels({ verifyVisible: next, resetVisible: false });
    dom.verifyEmailInput.value = dom.authEmail.value.trim().toLowerCase();
  });
  dom.forgotPasswordToggleBtn.addEventListener("click", () => {
    const next = dom.passwordResetForm.classList.contains("hidden");
    setAuthAuxPanels({ verifyVisible: false, resetVisible: next });
    dom.resetEmailInput.value = dom.authEmail.value.trim().toLowerCase();
  });
  dom.requestVerifyCodeBtn.addEventListener("click", () => {
    void requestVerifyCode();
  });
  dom.verifyEmailForm.addEventListener("submit", confirmVerifyEmail);
  dom.requestResetCodeBtn.addEventListener("click", () => {
    void requestResetCode();
  });
  dom.passwordResetForm.addEventListener("submit", confirmResetPassword);

  dom.googleAuthBtn.addEventListener("click", () => {
    if (!state.googleAuthEnabled || !state.googleClientId) {
      showToast("Google sign-in is not configured yet.");
      return;
    }
    if (!state.googleReady) {
      initializeGoogleAuth();
    }
    if (!state.googleReady) {
      showToast("Google sign-in is unavailable right now.");
      return;
    }

    try {
      window.google.accounts.id.prompt();
    } catch {
      showToast("Could not start Google sign-in.");
    }
  });

  dom.authBackdrop.addEventListener("click", closeAuthModal);
  dom.authCloseBtn.addEventListener("click", closeAuthModal);

  dom.adminBackdrop.addEventListener("click", () => closeModal("admin"));
  dom.adminCloseBtn.addEventListener("click", () => closeModal("admin"));
  dom.adminRefreshBtn.addEventListener("click", () => {
    void loadAdminData();
  });

  dom.adminUsersList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-admin-action='set-role']");
    if (!button) {
      return;
    }
    void updateUserRole(button.dataset.userId, button.dataset.role);
  });

  dom.adminRequestsList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-admin-action='set-request-status']");
    if (!button) {
      return;
    }
    void updateRequestStatus(button.dataset.requestId, button.dataset.status);
  });

  window.addEventListener("click", (event) => {
    if (!dom.accountMenuWrap.contains(event.target)) {
      closeAccountMenu();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (state.modals.auth) {
        closeAuthModal();
      } else if (state.modals.admin) {
        closeModal("admin");
      } else if (state.modals.match) {
        closeMatchModal();
      } else if (state.modals.request) {
        closeRequestModal();
      } else if (state.modals.share) {
        closeShareModal();
      } else if (state.modals.profile) {
        closeProfileModal();
      }
    }
  });

  window.addEventListener("popstate", () => {
    const match = window.location.pathname.match(/^\/profile\/([^/]+)$/);
    if (match) {
      openProfileModal(decodeURIComponent(match[1]), { updateRoute: false });
      return;
    }
    if (state.modals.profile) {
      closeProfileModal({ updateRoute: false });
    }
  });
}

async function bootstrapProfileRoute() {
  const match = window.location.pathname.match(/^\/profile\/([^/]+)$/);
  if (!match) {
    return;
  }
  const userId = decodeURIComponent(match[1]);
  openProfileModal(userId, { updateRoute: false });
}

async function init() {
  setLane("social");
  setDefaultTime();
  setAuthMode("login");
  setAuthAuxPanels({ verifyVisible: false, resetVisible: false });
  updateSearch("");
  wireEvents();

  await checkBackend();
  initializeGoogleAuth();
  window.setTimeout(() => initializeGoogleAuth(), 1000);

  await restoreSession();
  await loadData();
  await bootstrapProfileRoute();

  if (!state.auth.user) {
    showToast("Browse requests and posts. Sign in when you want to act.");
  }
}

init();
window.addEventListener("load", () => {
  initializeGoogleAuth();
});
