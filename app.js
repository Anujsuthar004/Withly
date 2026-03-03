const API_BASE = window.location.origin && window.location.origin.startsWith("http")
  ? window.location.origin
  : "http://localhost:8787";
const AUTH_TOKEN_KEY = "tagalong_auth_token";
const VIEWER_AREA_KEY = "tagalong_viewer_area";
const VIEWER_AREA_RADIUS_KEY = "tagalong_viewer_area_radius";

const MODE_PROFILES = {
  social: {
    short: "Social",
    long: "Social Plus-One",
    laneTitle: "Social lane expectations",
    laneDescription:
      "People here are typically looking for enjoyable company and open conversation in public spaces.",
    titlePlaceholder: "Anyone up for Holi hangout?",
    defaultCategory: "music",
    defaultRadius: 8,
  },
  errand: {
    short: "Errand",
    long: "Errand Companion",
    laneTitle: "Errand lane expectations",
    laneDescription:
      "People here usually need structured, practical companionship with clear timing and destination details.",
    titlePlaceholder: "Passport office run, need company",
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
      visibility: "public",
      helpfulCount: 3,
      createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    },
    {
      id: "post-2",
      userId: "u-demo-2",
      displayName: "Ishita",
      text: "Errand companionship felt easy today. Planning details upfront made the flow smooth.",
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
  areaFilter: {
    area: "",
    radius: "any",
  },
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
  joinPrompt: {
    requestId: null,
    requestTitle: "",
    posterName: "",
  },
  joinReview: {
    requestId: null,
    requestTitle: "",
    items: [],
  },
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
    settings: false,
    joinPrompt: false,
    joinReview: false,
  },
  adminData: {
    overview: null,
    users: [],
    requests: [],
  },
  helpfulReactions: {},
  expandedRequestDescriptions: {},
  expandedPostTexts: {},
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
  viewerAreaInput: document.querySelector("#viewerAreaInput"),
  viewerAreaRadius: document.querySelector("#viewerAreaRadius"),
  areaUnsetBanner: document.querySelector("#areaUnsetBanner"),
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
  titleLabel: document.querySelector("#titleLabel"),
  locationLabel: document.querySelector("#locationLabel"),
  titleInput: document.querySelector("#title"),
  descriptionInput: document.querySelector("#description"),
  locationInput: document.querySelector("#location"),
  timeInput: document.querySelector("#time"),
  requestMediaInput: document.querySelector("#requestMedia"),
  radiusInput: document.querySelector("#radius"),
  radiusValue: document.querySelector("#radiusValue"),
  radiusAudienceText: document.querySelector("#radiusAudienceText"),
  safetyOptionsToggleBtn: document.querySelector("#safetyOptionsToggleBtn"),
  safetyOptionsPanel: document.querySelector("#safetyOptionsPanel"),
  verifiedOnlyInput: document.querySelector("#verifiedOnly"),
  checkInInput: document.querySelector("#checkIn"),

  shareModal: document.querySelector("#shareModal"),
  shareBackdrop: document.querySelector("#shareBackdrop"),
  shareCloseBtn: document.querySelector("#shareCloseBtn"),
  sharePostForm: document.querySelector("#sharePostForm"),
  sharePostText: document.querySelector("#sharePostText"),
  sharePostTags: document.querySelector("#sharePostTags"),
  sharePostVerifiedOnly: document.querySelector("#sharePostVerifiedOnly"),

  joinPromptModal: document.querySelector("#joinPromptModal"),
  joinPromptBackdrop: document.querySelector("#joinPromptBackdrop"),
  joinPromptCloseBtn: document.querySelector("#joinPromptCloseBtn"),
  joinPromptRequestTitle: document.querySelector("#joinPromptRequestTitle"),
  joinPromptLabel: document.querySelector("#joinPromptLabel"),
  joinPromptForm: document.querySelector("#joinPromptForm"),
  joinIntroInput: document.querySelector("#joinIntroInput"),
  joinPromptSubmitBtn: document.querySelector("#joinPromptSubmitBtn"),
  joinPromptCancelBtn: document.querySelector("#joinPromptCancelBtn"),

  joinReviewModal: document.querySelector("#joinReviewModal"),
  joinReviewBackdrop: document.querySelector("#joinReviewBackdrop"),
  joinReviewCloseBtn: document.querySelector("#joinReviewCloseBtn"),
  joinReviewSubtitle: document.querySelector("#joinReviewSubtitle"),
  joinReviewList: document.querySelector("#joinReviewList"),

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
  publicProfileAbout: document.querySelector("#publicProfileAbout"),
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

  settingsModal: document.querySelector("#settingsModal"),
  settingsBackdrop: document.querySelector("#settingsBackdrop"),
  settingsCloseBtn: document.querySelector("#settingsCloseBtn"),
  settingsForm: document.querySelector("#settingsForm"),
  settingsAboutMe: document.querySelector("#settingsAboutMe"),

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

  mobileMatchTab: document.querySelector("#mobileMatchTab"),
  mobileMatchDot: document.querySelector("#mobileMatchDot"),
  mobileMatchOverlay: document.querySelector("#mobileMatchOverlay"),
  mobileMatchPanel: document.querySelector("#mobileMatchPanel"),
  mobileMatchCloseBtn: document.querySelector("#mobileMatchCloseBtn"),
  mobileMatchBody: document.querySelector("#mobileMatchBody"),

  chatView: document.querySelector("#chatView"),
  chatViewBackBtn: document.querySelector("#chatViewBackBtn"),
  chatViewTitle: document.querySelector("#chatViewTitle"),
  chatViewSubtitle: document.querySelector("#chatViewSubtitle"),
  chatViewMessages: document.querySelector("#chatViewMessages"),
  chatViewForm: document.querySelector("#chatViewForm"),
  chatViewInput: document.querySelector("#chatViewInput"),

  matchBanner: document.querySelector("#matchBanner"),
  matchBannerText: document.querySelector("#matchBannerText"),
  matchBannerChatBtn: document.querySelector("#matchBannerChatBtn"),
  matchBannerClose: document.querySelector("#matchBannerClose"),

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
  if (error && error.message && error.message !== `HTTP ${error.status}`) {
    return error.message;
  }
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

function publicDisplayName(value, fallback = "Anonymous") {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.toLowerCase() === "member") {
    return fallback;
  }
  return normalized;
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

function loadAreaFilterState() {
  try {
    const storedArea = String(window.localStorage.getItem(VIEWER_AREA_KEY) || "").trim();
    const storedRadius = String(window.localStorage.getItem(VIEWER_AREA_RADIUS_KEY) || "any").trim().toLowerCase();
    state.areaFilter.area = storedArea;
    state.areaFilter.radius = ["1", "3", "5", "10", "25", "any"].includes(storedRadius) ? storedRadius : "any";
  } catch {
    state.areaFilter.area = "";
    state.areaFilter.radius = "any";
  }
}

function saveAreaFilterState() {
  try {
    window.localStorage.setItem(VIEWER_AREA_KEY, state.areaFilter.area);
    window.localStorage.setItem(VIEWER_AREA_RADIUS_KEY, state.areaFilter.radius);
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
    settings: dom.settingsModal,
    joinPrompt: dom.joinPromptModal,
    joinReview: dom.joinReviewModal,
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
    settings: dom.settingsModal,
    joinPrompt: dom.joinPromptModal,
    joinReview: dom.joinReviewModal,
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
  setSafetyOptionsExpanded(false);
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

function openSettingsModal() {
  if (!state.auth.user) {
    return;
  }
  dom.settingsAboutMe.value = String(state.auth.user.aboutMe || "");
  openModal("settings");
  dom.settingsAboutMe.focus();
}

function closeSettingsModal() {
  closeModal("settings");
}

function openJoinPrompt(requestId) {
  if (!requireAuthForAction("join requests")) {
    return;
  }
  const request = state.requests.find((entry) => String(entry.id) === String(requestId));
  if (!request) {
    showToast("Request not found.");
    return;
  }
  const posterName = publicDisplayName(request.createdByName || request.postedByName || request.displayName);
  state.joinPrompt.requestId = request.id;
  state.joinPrompt.requestTitle = request.title || "Request";
  state.joinPrompt.posterName = posterName;
  dom.joinPromptRequestTitle.textContent = `Joining: "${state.joinPrompt.requestTitle}"`;
  dom.joinPromptLabel.textContent = `Say something to ${posterName}`;
  dom.joinIntroInput.value = "";
  openModal("joinPrompt");
  dom.joinIntroInput.focus();
}

function closeJoinPrompt() {
  closeModal("joinPrompt");
  state.joinPrompt.requestId = null;
  state.joinPrompt.requestTitle = "";
  state.joinPrompt.posterName = "";
  dom.joinIntroInput.value = "";
}

function openJoinReviewModal(requestId) {
  state.joinReview.requestId = String(requestId || "");
  state.joinReview.requestTitle = "";
  state.joinReview.items = [];
  dom.joinReviewSubtitle.textContent = "Loading join requests...";
  dom.joinReviewList.innerHTML = '<div class="empty-state">Loading...</div>';
  openModal("joinReview");
  void loadJoinReviewRequests();
}

function closeJoinReviewModal() {
  closeModal("joinReview");
  state.joinReview.requestId = null;
  state.joinReview.requestTitle = "";
  state.joinReview.items = [];
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
  connectWebSocket();
}

function clearSession() {
  state.auth.token = "";
  state.auth.user = null;
  clearStoredToken();
  closeAccountMenu();
  closeModal("admin");
  closeSettingsModal();
  closeChatView();
  disconnectWebSocket();
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
  if (state.googleReady) return;

  try {
    window.google.accounts.id.initialize({
      client_id: state.googleClientId,
      callback: handleGoogleCredentialResponse,
      ux_mode: "popup",
    });

    const btnContainer = document.getElementById("googleAuthBtn");
    if (btnContainer) {
      window.google.accounts.id.renderButton(
        btnContainer,
        { theme: "outline", size: "large", width: 280, text: "continue_with" }
      );
    }
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
  dom.timeInput.value = "";
}

function updateRadiusValue() {
  const radius = Number(dom.radiusInput.value || 8);
  const areaText = String(dom.locationInput.value || "").trim() || "your area";
  dom.radiusValue.textContent = `${radius} km`;
  dom.radiusAudienceText.textContent = `People within ${radius} km of ${areaText}`;
}

function applyLaneToForm() {
  const profile = modeProfile();
  dom.laneTitle.textContent = profile.laneTitle;
  dom.laneDescription.textContent = profile.laneDescription;
  dom.titleLabel.textContent = "Title";
  dom.locationLabel.textContent = "Your area";
  dom.titleInput.placeholder = profile.titlePlaceholder;
  dom.locationInput.placeholder = "Andheri West, Bandra, Powai...";
  if (!dom.radiusInput.dataset.touched) {
    dom.radiusInput.value = String(profile.defaultRadius);
  }
  updateRadiusValue();
}

function setSafetyOptionsExpanded(expanded) {
  const isExpanded = Boolean(expanded);
  dom.safetyOptionsPanel.classList.toggle("hidden", !isExpanded);
  dom.safetyOptionsToggleBtn.setAttribute("aria-expanded", String(isExpanded));
  dom.safetyOptionsToggleBtn.textContent = isExpanded ? "Safety options ▴" : "Safety options ▾";
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

function normalizedAreaText(value) {
  return String(value || "").trim().toLowerCase();
}

function getRequestAreaSearchText(request) {
  return normalizedAreaText(request.location || "");
}

function getPostAreaSearchText(post) {
  // Pilot-phase area filter uses text matching until geocoding is integrated.
  return normalizedAreaText([post.area || "", post.location || "", post.text || "", ...(post.tags || [])].join(" "));
}

function matchesAreaFilter(areaText) {
  const desiredArea = normalizedAreaText(state.areaFilter.area);
  if (!desiredArea) {
    return true;
  }
  return normalizedAreaText(areaText).includes(desiredArea);
}

function applyAreaFilterFromControls() {
  state.areaFilter.area = String(dom.viewerAreaInput.value || "").trim();
  const radius = String(dom.viewerAreaRadius.value || "any").trim().toLowerCase();
  state.areaFilter.radius = ["1", "3", "5", "10", "25", "any"].includes(radius) ? radius : "any";
  saveAreaFilterState();
  renderFeedMode();
}

function updateAreaFilterUI() {
  dom.viewerAreaInput.value = state.areaFilter.area || "";
  dom.viewerAreaRadius.value = state.areaFilter.radius || "any";
  const areaSet = Boolean(normalizedAreaText(state.areaFilter.area));
  dom.areaUnsetBanner.classList.toggle("hidden", areaSet);
}

function requestCardHtml(request) {
  const tags = Array.isArray(request.tags) ? request.tags.slice(0, 5) : [];
  const lane = parseMode(request.mode);
  const laneLabel = lane === "errand" ? "Errand" : "Social";
  const requestId = String(request.id || "");
  const fullDescription = String(request.description || "").trim();
  const hasDescription = Boolean(fullDescription);
  const canExpand = fullDescription.length > 220;
  const expanded = Boolean(state.expandedRequestDescriptions[requestId]);
  const resolvedName = publicDisplayName(
    request.createdByName ||
    request.postedByName ||
    request.displayName ||
    (state.auth.user && request.createdBy === state.auth.user.id
      ? state.auth.user.displayName || state.auth.user.email
      : "")
  );
  const safeName = escapeHtml(resolvedName || "Anonymous");

  return `
    <article class="item request-card">
      <div class="item-head">
        <h3 class="request-title">${escapeHtml(request.title || "Untitled request")}</h3>
        <span class="tag lane-${escapeHtml(lane)}">${laneLabel}</span>
      </div>
      ${hasDescription ? `<p class="request-description ${canExpand && !expanded ? "clamped" : ""}">${escapeHtml(fullDescription)}</p>` : ""}
      ${canExpand
      ? `<button class="text-link text-link-small" type="button" data-action="toggle-request-description" data-request-id="${escapeHtml(
        requestId
      )}">${expanded ? "See less" : "See more"}</button>`
      : ""
    }
      <div class="request-poster-row">
        <button class="post-author" type="button" data-action="open-profile" data-user-id="${escapeHtml(request.createdBy || "")}">
          <span class="avatar-initial small">${escapeHtml(avatarInitial(resolvedName || "Anonymous"))}</span>
          <span>${safeName}</span>
        </button>
        ${request.createdByVerified ? '<span class="tag">Verified</span>' : ""}
      </div>
      <p class="small-meta">${escapeHtml(request.location || "Unknown area")} • ${escapeHtml(formatDateTime(request.time))}</p>
      ${request.mediaAttached
      ? '<div class="image-placeholder" aria-hidden="true">Media attached (preview coming soon)</div>'
      : ""
    }
      <div class="meta">
        ${request.verifiedOnly ? '<span class="tag">Verified-only</span>' : ""}
      </div>
      <div class="item-actions">
        <span class="score">Open request</span>
        <button class="secondary" type="button" data-action="join" data-request-id="${escapeHtml(request.id)}">Join Request</button>
      </div>
    </article>
  `;
}

function postCardHtml(post) {
  const tags = Array.isArray(post.tags) ? post.tags.slice(0, 5) : [];
  const reactionKey = `post:${post.id}`;
  const reacted = Boolean(state.helpfulReactions[reactionKey]);
  const fullText = String(post.text || "");
  const canExpand = fullText.length > 280;
  const expanded = Boolean(state.expandedPostTexts[String(post.id || "")]);
  return `
    <article class="item post-card">
      <div class="post-head">
        <button class="post-author" type="button" data-action="open-profile" data-user-id="${escapeHtml(post.userId)}">
          <span class="avatar-initial small">${escapeHtml(avatarInitial(post.displayName))}</span>
          <span>${escapeHtml(publicDisplayName(post.displayName))}</span>
        </button>
        <span class="tag">${escapeHtml(formatRelativeTime(post.createdAt))}</span>
      </div>
      <p class="post-text ${canExpand && !expanded ? "clamped" : ""}">${escapeHtml(fullText)}</p>
      ${canExpand
      ? `<button class="text-link text-link-small" type="button" data-action="toggle-post-text" data-post-id="${escapeHtml(
        post.id
      )}">${expanded ? "See less" : "See more"}</button>`
      : ""
    }
      ${post.mediaAttached ? '<div class="image-placeholder" aria-hidden="true">Media attached (preview coming soon)</div>' : ""}
      <div class="meta">
        ${post.visibility === "verified-only" ? '<span class="tag">Verified audience</span>' : ""}
      </div>
      <div class="item-actions">
        <span></span>
        <button class="ghost small" type="button" data-action="helpful" data-post-id="${escapeHtml(post.id)}">${reacted ? "❤ Marked helpful" : "❤ Helpful"
    }</button>
      </div>
    </article>
  `;
}

function renderRequestsFeed() {
  const openRequests = state.requests
    .filter((entry) => entry.status === "open")
    .filter((entry) => matchesAreaFilter(getRequestAreaSearchText(entry)))
    .filter((entry) =>
      matchesSearch([
        entry.title || "",
        entry.description || "",
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
    .filter((entry) => matchesAreaFilter(getPostAreaSearchText(entry)))
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

  updateAreaFilterUI();

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
      const pendingCount = Number(entry.pendingJoinCount || 0);
      const canReviewJoiners =
        entry.status === "open" &&
        pendingCount > 0 &&
        state.auth.user &&
        String(entry.createdBy || "") === String(state.auth.user.id);
      const pendingText = pendingCount === 1 ? "1 person wants to join" : `${pendingCount} people want to join`;
      return `
        <article class="item compact">
          <div class="item-head">
            <h3>${escapeHtml(entry.title)}</h3>
            <span class="tag lane-${lane}">${lane === "errand" ? "Errand" : "Social"}</span>
          </div>
          <p>${escapeHtml(formatDateTime(entry.time))} • ${escapeHtml(entry.status)}</p>
          ${canReviewJoiners
          ? `
            <button
              class="pending-join-indicator"
              type="button"
              data-action="open-join-review"
              data-request-id="${escapeHtml(entry.id)}"
            >
              ${escapeHtml(pendingText)}
            </button>
          `
          : ""
        }
          <div class="item-actions">
            ${entry.status === "open" ? `<button class="secondary" type="button" data-action="find-matches" data-request-id="${escapeHtml(entry.id)}">Find Matches</button>` : ""}
            <button class="ghost small" type="button" data-action="activate-request" data-request-id="${escapeHtml(entry.id)}">View</button>
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
    dom.sessionChat.classList.add("hidden");
    const hasOpenRequest = Boolean(state.activeRequest && state.activeRequest.status === "open");
    dom.chatHint.textContent = hasOpenRequest
      ? "Your request is open. Find a match or wait for someone to join."
      : "Join or match a request to unlock private coordination chat.";
    dom.chatEmptyState.classList.remove("hidden");
    dom.chatList.innerHTML = "";
    dom.chatForm.classList.add("hidden");
    return;
  }

  dom.sessionChat.classList.remove("hidden");
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

function generateMatchActionsHtml(request, joinedAsPeer) {
  const nowMs = Date.now();
  const isPastDue = request.time
    ? new Date(request.time).getTime() < nowMs
    : request.matchedAt
      ? new Date(request.matchedAt).getTime() + 4 * 60 * 60 * 1000 < nowMs
      : false;

  const userOutcome = joinedAsPeer ? request.peerOutcome : request.posterOutcome;
  const userMeetAgain = joinedAsPeer ? request.peerMeetAgain : request.posterMeetAgain;

  if (!userOutcome && isPastDue) {
    return `
      <div class="completion-prompt" style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border);">
        <p class="card-copy" style="margin-bottom: 8px;"><strong>How did it go?</strong></p>
        <div class="item-actions">
          <button class="primary" type="button" data-action="complete-success" data-request-id="${escapeHtml(request.id)}">It went well ✓</button>
          <button class="secondary" type="button" data-action="complete-report" data-request-id="${escapeHtml(request.id)}">Report an issue</button>
        </div>
      </div>
    `;
  }

  if (userOutcome === "success" && userMeetAgain === null) {
    return `
      <div class="completion-prompt" style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border);">
        <p class="card-copy" style="margin-bottom: 8px;"><strong>Would you meet this person again?</strong> (Private)</p>
        <div class="item-actions">
          <button class="primary" style="min-width: 60px" type="button" data-action="rate-yes" data-request-id="${escapeHtml(request.id)}">Yes</button>
          <button class="secondary" style="min-width: 60px" type="button" data-action="rate-no" data-request-id="${escapeHtml(request.id)}">No</button>
        </div>
      </div>
    `;
  }

  if (userOutcome === "success" && !joinedAsPeer && userMeetAgain !== null) {
    return `
      <div class="completion-prompt" style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border);">
        <p class="card-copy" style="margin-bottom: 8px;"><strong>Session marked complete.</strong></p>
        <button class="secondary text-link" type="button" data-action="open-share-prefilled" data-request-title="${escapeHtml(request.title)}" data-request-area="${escapeHtml(request.location)}">Want to share how it went?</button>
      </div>
    `;
  }

  if (userOutcome === "success") {
    return `
      <div class="item-actions" style="margin-top: 12px;">
        <span class="tag">Meetup completed ✓</span>
      </div>
    `;
  }

  return `
    <div class="item-actions" style="margin-top: 12px;">
      <button class="secondary" type="button" data-action="open-chat">Open Chat</button>
      <button class="primary" type="button" data-action="plan-checkin">Check-In</button>
    </div>
  `;
}

/* ---- Mobile Match Panel ---- */

function isMobileView() {
  return window.innerWidth <= 820;
}

function openMobileMatchPanel() {
  if (!dom.mobileMatchPanel) return;
  syncMobileMatchPanel();
  dom.mobileMatchOverlay.classList.add("open");
  dom.mobileMatchPanel.classList.add("open");
  dom.mobileMatchPanel.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeMobileMatchPanel() {
  if (!dom.mobileMatchPanel) return;
  dom.mobileMatchOverlay.classList.remove("open");
  dom.mobileMatchPanel.classList.remove("open");
  dom.mobileMatchPanel.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function syncMobileMatchPanel() {
  if (!dom.mobileMatchBody) return;
  const sessionBlock = document.querySelector(".session-block");
  if (sessionBlock) {
    dom.mobileMatchBody.innerHTML = sessionBlock.innerHTML;
    // Re-wire chat form inside the mobile panel
    const mobileChatForm = dom.mobileMatchBody.querySelector("#chatForm");
    if (mobileChatForm) {
      mobileChatForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const input = dom.mobileMatchBody.querySelector("#chatInput");
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        input.value = "";
        await sendChatMessage(text);
        syncMobileMatchPanel();
      });
    }
  }
}

function updateMobileMatchDot() {
  if (!dom.mobileMatchDot) return;
  const hasMatch = state.activeRequest && state.activeRequest.status === "matched";
  dom.mobileMatchDot.classList.toggle("hidden", !hasMatch);
}

function renderMatches() {
  dom.matchSessionBanner.classList.add("hidden");
  dom.matchSessionBanner.textContent = "";
  updateMobileMatchDot();
  if (!state.activeRequest) {
    dom.emptyState.textContent = "Post or join a request to start a session.";
    dom.matchList.innerHTML = "";
    return;
  }

  const request = state.activeRequest;

  if (request.status === "matched" && request.matchedUserId) {
    const ownerName = publicDisplayName(
      request.createdByName ||
      (state.auth.user && String(request.createdBy || "") === String(state.auth.user.id) ? state.auth.user.displayName : ""),
      "Anonymous"
    );
    const peerName = publicDisplayName(
      request.matchedUserName ||
      (state.auth.user && String(request.matchedUserId || "") === String(state.auth.user.id) ? state.auth.user.displayName : ""),
      "Anonymous"
    );
    const joinedAsPeer = state.auth.user && String(request.matchedUserId || "") === String(state.auth.user.id);
    const timeLabel = request.time ? formatDateTime(request.time) : "Time TBD - coordinate in chat";
    dom.matchSessionBanner.textContent = joinedAsPeer
      ? "You joined this request. Coordinate in chat and use check-ins when you meet."
      : "A verified user joined your request. Coordinate in chat and use check-ins when you meet.";
    dom.matchSessionBanner.classList.remove("hidden");
    dom.emptyState.textContent = "Active match ready. Coordinate details in chat.";
    dom.matchList.innerHTML = `
      <article class="item shared-plan-card">
        <div class="item-head">
          <h3>${escapeHtml(request.title || "Matched request")}</h3>
          <span class="tag">Matched</span>
        </div>
        <p>${escapeHtml(request.location || "Area TBD")} • ${escapeHtml(timeLabel)}</p>
        <div class="plan-people">
          <button class="plan-person" type="button" data-action="open-profile" data-user-id="${escapeHtml(
      request.createdBy || ""
    )}">
            <span class="avatar-initial small">${escapeHtml(avatarInitial(ownerName))}</span>
            <span>${escapeHtml(ownerName)}</span>
          </button>
          <span class="plan-separator">+</span>
          <button class="plan-person" type="button" data-action="open-profile" data-user-id="${escapeHtml(
      request.matchedUserId || ""
    )}">
            <span class="avatar-initial small">${escapeHtml(avatarInitial(peerName))}</span>
            <span>${escapeHtml(peerName)}</span>
          </button>
        </div>
        ${generateMatchActionsHtml(request, joinedAsPeer)}
      </article>
    `;
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
  dom.publicProfileAbout.textContent =
    String(profile.aboutMe || "").trim() ||
    "Tell people a bit about yourself - who you are, what you're into, what to expect.";

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
    const minePayload = await apiFetch(`/api/requests?participantId=${encodeURIComponent(state.auth.user.id)}`);
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
  const profile = modeProfile();
  return {
    mode: state.activeLane,
    title: dom.titleInput.value.trim(),
    description: dom.descriptionInput.value.trim(),
    category: profile.defaultCategory,
    time: dom.timeInput.value.trim(),
    location: dom.locationInput.value.trim(),
    radius: Number(dom.radiusInput.value || 8),
    tags: [state.activeLane, profile.defaultCategory],
    verifiedOnly: dom.verifiedOnlyInput.checked,
    checkIn: dom.checkInInput.checked,
  };
}

async function createRequest() {
  if (!requireAuthForAction("post requests")) {
    return;
  }

  const payload = buildRequestPayload();
  if (!payload.title || !payload.description || !payload.location) {
    showToast("Add title, description, and area.");
    return;
  }

  let created;
  try {
    created = await apiFetch("/api/requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("createRequest failed:", error.status, error.message, error);
    if (handleApiAuthError(error)) {
      return;
    }
    showToast(safeApiErrorMessage(error, "Could not post request."));
    return;
  }

  state.activeRequest = created.request || null;
  state.matches = Array.isArray(created.matches) ? created.matches : [];
  state.checkInStarted = false;
  closeRequestModal();
  showToast("Request posted.");

  try {
    await refreshFeed();
  } catch {
    // Feed refresh is best-effort; the request was already posted.
  }
  updateCheckInControls();
  renderMatches();
  renderChat();
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

  if (state.backendReady && state.auth.user) {
    try {
      const sessionPayload = await apiFetch(`/api/requests/session?requestId=${encodeURIComponent(request.id)}`);
      if (sessionPayload && sessionPayload.request) {
        state.activeRequest = sessionPayload.request;
      }
    } catch (error) {
      if (handleApiAuthError(error)) {
        return;
      }
    }
  }

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

async function joinRequest(requestId, introMessage = "") {
  try {
    const payload = await apiFetch("/api/actions/join", {
      method: "POST",
      body: JSON.stringify({ requestId, introMessage: String(introMessage || "").slice(0, 200) }),
    });

    if (payload && payload.alreadyMatched && payload.request) {
      closeJoinPrompt();
      state.activeRequest = payload.request;
      if (Array.isArray(payload.messages)) {
        state.chatMessages = payload.messages;
      }
      state.matches = [];
      await refreshFeed();
      refreshSessionWorkspace();
      showToast("Request joined. Chat unlocked.");
      return;
    }

    closeJoinPrompt();
    await refreshFeed();
    showToast("Join request sent. The poster can review your intro before accepting.");
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast(safeApiErrorMessage(error, "Could not join request."));
  }
}

function joinReviewItemHtml(item) {
  const badges = item.badges || {};
  const verifiedLabel = badges.verified ? "Verified" : "Unverified";
  return `
    <article class="item compact">
      <div class="item-head">
        <button class="post-author" type="button" data-action="open-profile" data-user-id="${escapeHtml(item.joinerUserId)}">
          <span class="avatar-initial small">${escapeHtml(avatarInitial(item.displayName))}</span>
          <span>${escapeHtml(publicDisplayName(item.displayName))}</span>
        </button>
        <span class="tag">${escapeHtml(formatRelativeTime(item.createdAt))}</span>
      </div>
      <div class="meta">
        <span class="tag">${escapeHtml(verifiedLabel)}</span>
        <span class="tag">Reliability ${escapeHtml(String(Number(badges.reliabilityScore || 0)))}%</span>
        <span class="tag">Completion ${escapeHtml(String(Number(badges.completionRate || 0)))}%</span>
      </div>
      <p>${escapeHtml(item.introMessage || "No message sent")}</p>
      <div class="item-actions">
        <button class="secondary" type="button" data-action="accept-join" data-request-id="${escapeHtml(
    state.joinReview.requestId
  )}" data-user-id="${escapeHtml(item.joinerUserId)}">Accept</button>
        <button class="ghost" type="button" data-action="decline-join" data-request-id="${escapeHtml(
    state.joinReview.requestId
  )}" data-user-id="${escapeHtml(item.joinerUserId)}">Decline</button>
      </div>
    </article>
  `;
}

function renderJoinReviewRequests() {
  const items = Array.isArray(state.joinReview.items) ? state.joinReview.items : [];
  if (!items.length) {
    dom.joinReviewList.innerHTML = '<div class="empty-state">No pending join requests right now.</div>';
    return;
  }

  dom.joinReviewList.innerHTML = items.map(joinReviewItemHtml).join("");
}

async function loadJoinReviewRequests() {
  if (!state.joinReview.requestId) {
    return;
  }

  try {
    const payload = await apiFetch(`/api/requests/join-requests?requestId=${encodeURIComponent(state.joinReview.requestId)}`);
    const request = payload.request || null;
    const joinRequests = Array.isArray(payload.joinRequests) ? payload.joinRequests : [];
    state.joinReview.requestTitle = request ? request.title || "Request" : "Request";
    state.joinReview.items = joinRequests;
    dom.joinReviewSubtitle.textContent = `Review pending joiners for "${state.joinReview.requestTitle}".`;
    renderJoinReviewRequests();
    await refreshFeed();
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    dom.joinReviewList.innerHTML = '<div class="empty-state">Could not load join requests.</div>';
    dom.joinReviewSubtitle.textContent = "";
    showToast("Could not load join requests.");
  }
}

async function acceptJoinApplicant(requestId, joinUserId) {
  try {
    const payload = await apiFetch("/api/actions/accept", {
      method: "POST",
      body: JSON.stringify({ requestId, joinUserId }),
    });
    if (payload.request) {
      state.activeRequest = payload.request;
    }
    if (Array.isArray(payload.messages)) {
      state.chatMessages = payload.messages;
    }
    closeJoinReviewModal();
    await refreshFeed();
    refreshSessionWorkspace();
    showToast("🎉 Match confirmed! Chat is now active.");
    if (isMobileView()) {
      openMobileMatchPanel();
    }
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast(safeApiErrorMessage(error, "Could not accept join request."));
  }
}

async function declineJoinApplicant(requestId, joinUserId) {
  try {
    await apiFetch("/api/actions/join/decline", {
      method: "POST",
      body: JSON.stringify({ requestId, joinUserId }),
    });
    state.joinReview.items = state.joinReview.items.filter((entry) => String(entry.joinerUserId) !== String(joinUserId));
    renderJoinReviewRequests();
    await refreshFeed();
    showToast("Join request declined.");
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast(safeApiErrorMessage(error, "Could not decline join request."));
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
    showToast("🎉 Match confirmed! Chat is now active.");
    if (isMobileView()) {
      openMobileMatchPanel();
    }
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast(safeApiErrorMessage(error, "Could not accept companion."));
  }
}

async function completeMatchSession(requestId, action) {
  const outcome = action === "complete-success" ? "success" : "report";
  try {
    const payload = await apiFetch(`/api/requests/${encodeURIComponent(requestId)}/complete`, {
      method: "POST",
      body: JSON.stringify({ outcome })
    });
    if (payload.request) {
      state.activeRequest = payload.request;
      const index = state.myRequests.findIndex(r => r.id === requestId);
      if (index !== -1) state.myRequests[index] = payload.request;
    }
    refreshSessionWorkspace();
    if (outcome === "success") {
      showToast("Meetup marked successful.");
    } else {
      showToast("Report flow opened (placeholder).");
    }
  } catch (error) {
    if (handleApiAuthError(error)) return;
    showToast(safeApiErrorMessage(error, "Could not complete session."));
  }
}

async function rateCompanionMatch(requestId, action) {
  const meetAgain = action === "rate-yes";
  try {
    const payload = await apiFetch(`/api/requests/${encodeURIComponent(requestId)}/rate`, {
      method: "POST",
      body: JSON.stringify({ meetAgain })
    });
    if (payload.request) {
      state.activeRequest = payload.request;
      const index = state.myRequests.findIndex(r => r.id === requestId);
      if (index !== -1) state.myRequests[index] = payload.request;
    }
    refreshSessionWorkspace();
    showToast("Rating saved privately.");
  } catch (error) {
    if (handleApiAuthError(error)) return;
    showToast(safeApiErrorMessage(error, "Could not save rating."));
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

/* ==== WebSocket Client ==== */

let ws = null;
let wsReconnectDelay = 1000;
let wsReconnectTimer = null;

function getWsUrl() {
  const token = state.auth.token;
  if (!token) return null;

  // In production (Vercel), connect directly to Railway
  // In dev, connect to the same localhost server
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  if (isLocalhost) {
    return `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
  }

  // Production: connect directly to Railway backend
  return `wss://tag-along-production.up.railway.app/ws?token=${encodeURIComponent(token)}`;
}

function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    return;
  }

  const url = getWsUrl();
  if (!url) return;

  try {
    ws = new WebSocket(url);
  } catch {
    return;
  }

  ws.onopen = () => {
    wsReconnectDelay = 1000;
    console.log("WebSocket connected");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWsMessage(data);
    } catch { /* ignore malformed */ }
  };

  ws.onclose = () => {
    ws = null;
    scheduleWsReconnect();
  };

  ws.onerror = () => {
    if (ws) ws.close();
  };
}

function scheduleWsReconnect() {
  if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
  if (!state.auth.token) return;
  wsReconnectTimer = setTimeout(() => {
    connectWebSocket();
    wsReconnectDelay = Math.min(wsReconnectDelay * 1.5, 30000);
  }, wsReconnectDelay);
}

function disconnectWebSocket() {
  if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
}

function handleWsMessage(data) {
  if (data.type === "chat_message") {
    // Append message to state if not already present
    const msg = data.message;
    if (!msg) return;
    const exists = state.chatMessages.some(
      (m) => m.id === msg.id || (m.content === msg.content && m.senderUserId === msg.senderUserId && m.createdAt === msg.createdAt)
    );
    if (!exists) {
      state.chatMessages.push(msg);
    }
    // Re-render if chat view is open
    if (!dom.chatView.classList.contains("hidden")) {
      renderChatView();
    }
    // Also update sidebar chat
    renderChat();
    // Sync mobile panel if open
    if (dom.mobileMatchPanel && dom.mobileMatchPanel.classList.contains("open")) {
      syncMobileMatchPanel();
    }
    return;
  }

  if (data.type === "match_confirmed") {
    showMatchBanner(data.matchedWith, data.requestId);
    // Refresh session workspace to show the match
    void refreshSessionWorkspace();
    return;
  }
}

/* ==== Full-Screen Chat View ==== */

function openChatView(requestIdOverride) {
  const request = requestIdOverride
    ? state.feed.find((r) => r.id === requestIdOverride) || state.activeRequest
    : getActiveChatRequest();
  if (!request) {
    showToast("No matched request to chat in.");
    return;
  }

  // Set the active request so messages load for it
  state.activeRequest = request;

  // Update header
  const otherName = getMatchedUserName(request);
  dom.chatViewTitle.textContent = request.title || "Chat";
  dom.chatViewSubtitle.textContent = otherName ? `with ${otherName}` : "";

  // Show the view
  dom.chatView.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  // Close mobile panel if open
  closeMobileMatchPanel();

  // Load messages and render
  loadChatMessages().then(() => renderChatView());
}

function closeChatView() {
  dom.chatView.classList.add("hidden");
  document.body.style.overflow = "";
}

function renderChatView() {
  if (!dom.chatViewMessages) return;

  if (!Array.isArray(state.chatMessages) || state.chatMessages.length === 0) {
    dom.chatViewMessages.innerHTML = `<div class="chat-msg system"><div class="chat-msg-body">No messages yet. Say hello!</div></div>`;
    return;
  }

  dom.chatViewMessages.innerHTML = state.chatMessages
    .map((msg) => {
      const isSystem = msg.senderType === "system";
      const isSelf = !isSystem && state.auth.user && String(msg.senderUserId) === String(state.auth.user.id);
      const sender = isSystem ? "Tag Along" : (msg.senderName || "Member");
      const cssClass = isSystem ? "system" : (isSelf ? "self" : "");
      return `
        <div class="chat-msg ${cssClass}">
          <span class="chat-msg-meta">${escapeHtml(sender)} · ${escapeHtml(formatRelativeTime(msg.createdAt))}</span>
          <div class="chat-msg-body">${escapeHtml(msg.content || "")}</div>
        </div>
      `;
    })
    .join("");

  // Auto-scroll to bottom
  dom.chatViewMessages.scrollTop = dom.chatViewMessages.scrollHeight;
}

function getMatchedUserName(request) {
  if (!request) return "";
  const isOwner = state.auth.user && String(request.createdBy) === String(state.auth.user.id);
  // If I'm the owner, show matched user name; if I'm the joiner, show owner name
  if (isOwner) {
    return request.matchedDisplayName || request.matchedUserName || "";
  }
  return request.ownerDisplayName || request.ownerName || "";
}

/* ==== Match Notification Banner ==== */

let matchBannerTimer = null;

function showMatchBanner(matchedWith, requestId) {
  if (!dom.matchBanner) return;

  dom.matchBannerText.textContent = `🎉 You matched with ${matchedWith || "someone"}!`;
  dom.matchBanner.classList.remove("hidden");
  state._matchBannerRequestId = requestId;

  // Also show toast for mobile
  showToast(`🎉 Match confirmed with ${matchedWith || "someone"}!`);
  updateMobileMatchDot();

  if (matchBannerTimer) clearTimeout(matchBannerTimer);
  matchBannerTimer = setTimeout(() => {
    dom.matchBanner.classList.add("hidden");
  }, 8000);
}

function hideMatchBanner() {
  if (!dom.matchBanner) return;
  dom.matchBanner.classList.add("hidden");
  if (matchBannerTimer) clearTimeout(matchBannerTimer);
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

function openSessionChat() {
  // Open the dedicated full-screen chat view
  openChatView();
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

function updateSearchUI() {
  const hasQuery = Boolean(String(dom.searchInput.value || "").trim());
  dom.clearSearchBtn.classList.toggle("hidden", !hasQuery);
}

function updateSearch(value) {
  state.searchQuery = String(value || "").trim().toLowerCase();
  updateSearchUI();
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

async function saveAccountSettings(event) {
  event.preventDefault();
  if (!state.auth.user) {
    closeSettingsModal();
    return;
  }

  const aboutMe = String(dom.settingsAboutMe.value || "").trim();
  try {
    const payload = await apiFetch("/api/account/settings", {
      method: "POST",
      body: JSON.stringify({ aboutMe }),
    });
    if (payload && payload.user) {
      state.auth.user = payload.user;
    } else {
      state.auth.user.aboutMe = aboutMe;
    }
    if (state.profile.data && String(state.profile.data.userId || "") === String(state.auth.user.id)) {
      state.profile.data.aboutMe = state.auth.user.aboutMe || "";
      renderProfileModal();
    }
    closeSettingsModal();
    showToast("Account settings updated.");
  } catch (error) {
    if (handleApiAuthError(error)) {
      return;
    }
    showToast(safeApiErrorMessage(error, "Could not update account settings."));
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
    openSettingsModal();
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

  let areaUpdateTimeout;
  dom.viewerAreaInput.addEventListener("input", () => {
    clearTimeout(areaUpdateTimeout);
    areaUpdateTimeout = setTimeout(applyAreaFilterFromControls, 500);
  });
  dom.viewerAreaRadius.addEventListener("change", () => {
    applyAreaFilterFromControls();
  });

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
      openJoinPrompt(actionBtn.dataset.requestId);
      return;
    }

    if (action === "open-profile") {
      openProfileModal(actionBtn.dataset.userId);
      return;
    }

    if (action === "toggle-request-description") {
      const requestId = String(actionBtn.dataset.requestId || "");
      if (!requestId) {
        return;
      }
      state.expandedRequestDescriptions[requestId] = !state.expandedRequestDescriptions[requestId];
      renderRequestsFeed();
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
      state.helpfulReactions[key] = true;
      renderPostsFeed();
      return;
    }

    if (action === "toggle-post-text") {
      const postId = String(actionBtn.dataset.postId || "");
      if (!postId) {
        return;
      }
      state.expandedPostTexts[postId] = !state.expandedPostTexts[postId];
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
      return;
    }

    if (button.dataset.action === "open-join-review") {
      openJoinReviewModal(button.dataset.requestId);
    }
  });

  dom.matchList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }
    const { action } = button.dataset;
    if (action === "view-profile") {
      openMatchModal(button.dataset.matchId);
      return;
    }
    if (action === "open-chat") {
      openSessionChat();
      return;
    }
    if (action === "plan-checkin") {
      void toggleCheckIn();
      return;
    }
    if (action === "complete-success" || action === "complete-report") {
      void completeMatchSession(button.dataset.requestId, action);
      return;
    }
    if (action === "rate-yes" || action === "rate-no") {
      void rateCompanionMatch(button.dataset.requestId, action);
      return;
    }
    if (action === "open-share-prefilled") {
      openShareModal();
      if (dom.sharePostText) {
        dom.sharePostText.value = `My meetup for "${button.dataset.requestTitle}" in ${button.dataset.requestArea} went well! `;
      }
      return;
    }
    if (action === "open-profile") {
      openProfileModal(button.dataset.userId);
    }
  });

  dom.refreshChatBtn.addEventListener("click", () => {
    void loadChatMessages();
  });

  dom.chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendChatMessage(dom.chatInput.value);
    dom.chatInput.value = "";
  });

  if (dom.mobileMatchTab) {
    dom.mobileMatchTab.addEventListener("click", (event) => {
      event.preventDefault();
      openMobileMatchPanel();
    });
  }
  if (dom.mobileMatchCloseBtn) {
    dom.mobileMatchCloseBtn.addEventListener("click", closeMobileMatchPanel);
  }
  if (dom.mobileMatchOverlay) {
    dom.mobileMatchOverlay.addEventListener("click", closeMobileMatchPanel);
  }

  // Chat view events
  dom.chatViewBackBtn.addEventListener("click", closeChatView);
  dom.chatViewForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = dom.chatViewInput.value.trim();
    if (!text) return;
    dom.chatViewInput.value = "";
    await sendChatMessage(text);
    renderChatView();
  });

  // Match banner events
  dom.matchBannerClose.addEventListener("click", hideMatchBanner);
  dom.matchBannerChatBtn.addEventListener("click", () => {
    hideMatchBanner();
    openChatView(state._matchBannerRequestId);
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
  dom.locationInput.addEventListener("input", () => {
    updateRadiusValue();
  });
  dom.safetyOptionsToggleBtn.addEventListener("click", () => {
    const nextExpanded = dom.safetyOptionsPanel.classList.contains("hidden");
    setSafetyOptionsExpanded(nextExpanded);
  });

  dom.requestBackdrop.addEventListener("click", closeRequestModal);
  dom.requestCloseBtn.addEventListener("click", closeRequestModal);

  dom.sharePostForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createPost();
  });
  dom.shareBackdrop.addEventListener("click", closeShareModal);
  dom.shareCloseBtn.addEventListener("click", closeShareModal);

  dom.joinPromptForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!state.joinPrompt.requestId) {
      return;
    }
    void joinRequest(state.joinPrompt.requestId, dom.joinIntroInput.value);
  });
  dom.joinPromptCancelBtn.addEventListener("click", closeJoinPrompt);
  dom.joinPromptBackdrop.addEventListener("click", closeJoinPrompt);
  dom.joinPromptCloseBtn.addEventListener("click", closeJoinPrompt);

  dom.joinReviewBackdrop.addEventListener("click", closeJoinReviewModal);
  dom.joinReviewCloseBtn.addEventListener("click", closeJoinReviewModal);
  dom.joinReviewList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }
    const action = String(button.dataset.action || "");
    if (action === "open-profile") {
      openProfileModal(button.dataset.userId);
      return;
    }
    if (action === "accept-join") {
      void acceptJoinApplicant(button.dataset.requestId, button.dataset.userId);
      return;
    }
    if (action === "decline-join") {
      void declineJoinApplicant(button.dataset.requestId, button.dataset.userId);
    }
  });

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

  dom.authBackdrop.addEventListener("click", closeAuthModal);
  dom.authCloseBtn.addEventListener("click", closeAuthModal);

  dom.settingsBackdrop.addEventListener("click", closeSettingsModal);
  dom.settingsCloseBtn.addEventListener("click", closeSettingsModal);
  dom.settingsForm.addEventListener("submit", saveAccountSettings);

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
      } else if (state.modals.settings) {
        closeSettingsModal();
      } else if (state.modals.admin) {
        closeModal("admin");
      } else if (state.modals.match) {
        closeMatchModal();
      } else if (state.modals.request) {
        closeRequestModal();
      } else if (state.modals.share) {
        closeShareModal();
      } else if (state.modals.joinPrompt) {
        closeJoinPrompt();
      } else if (state.modals.joinReview) {
        closeJoinReviewModal();
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
  setSafetyOptionsExpanded(false);
  setAuthMode("login");
  setAuthAuxPanels({ verifyVisible: false, resetVisible: false });
  loadAreaFilterState();
  updateAreaFilterUI();
  updateSearch("");
  wireEvents();

  await checkBackend();
  initializeGoogleAuth();
  window.setTimeout(() => initializeGoogleAuth(), 1000);

  await restoreSession();
  connectWebSocket();
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
