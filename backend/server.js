const http = require("node:http");
const crypto = require("node:crypto");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");
const { URL } = require("node:url");

const { hashPassword, verifyPassword, signToken, verifyToken } = require("./lib/auth");
const {
  sendVerificationCodeEmail,
  sendPasswordResetCodeEmail,
  emailProviderName,
} = require("./lib/email-sender");
const { PostgresStore } = require("./lib/postgres-store");
const { verifyGoogleIdToken } = require("./lib/google-auth");
const { initWebSocket, broadcastChatMessage, broadcastMatchConfirmed } = require("./lib/websocket");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_FILE = path.join(__dirname, "data", "store.json");
const MAX_BODY_SIZE = 1_000_000;

function parseEnvLine(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separator = trimmed.indexOf("=");
  if (separator <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separator).trim();
  let value = trimmed.slice(separator + 1).trim();
  if (!key) {
    return null;
  }

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFile(filePath) {
  try {
    if (!fsSync.existsSync(filePath)) {
      return;
    }

    const raw = fsSync.readFileSync(filePath, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) {
        continue;
      }
      if (typeof process.env[parsed.key] === "undefined") {
        process.env[parsed.key] = parsed.value;
      }
    }
  } catch (error) {
    console.warn(`Could not load env file at ${filePath}: ${error.message}`);
  }
}

loadEnvFile(path.join(ROOT_DIR, ".env"));

const PORT = Number(process.env.PORT) || 8787;

const STORAGE_DRIVER = process.env.STORAGE_DRIVER || (process.env.DATABASE_URL ? "postgres" : "json");
const AUTH_REQUIRED = process.env.AUTH_REQUIRED === "true";
const TOKEN_SECRET = process.env.TOKEN_SECRET || "dev-token-secret-change-before-production";
const TOKEN_TTL_SECONDS = Number(process.env.TOKEN_TTL_SECONDS || 60 * 60 * 24 * 7);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 120);
const AUTH_RATE_LIMIT_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX || 40);
const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || "").trim();
const BOOTSTRAP_ADMIN_EMAIL = String(process.env.BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
const VERIFICATION_CODE_TTL_MS = Number(process.env.VERIFICATION_CODE_TTL_MS || 1000 * 60 * 30);
const PASSWORD_RESET_CODE_TTL_MS = Number(process.env.PASSWORD_RESET_CODE_TTL_MS || 1000 * 60 * 20);
const APP_ENV = String(process.env.APP_ENV || process.env.NODE_ENV || "development").trim().toLowerCase();
const IS_PRODUCTION = APP_ENV === "production" || APP_ENV === "prod";
const EXPOSE_DEV_AUTH_CODES = process.env.EXPOSE_DEV_AUTH_CODES === "true";
const EMAIL_PROVIDER = emailProviderName();
const REAL_EMAIL_PROVIDERS = new Set(["resend", "postmark", "sendgrid"]);

const METRICS = {
  social: { matchTime: "9 min", completionRate: "84%", verifiedShare: "75%" },
  errand: { matchTime: "13 min", completionRate: "90%", verifiedShare: "82%" },
};

const CATEGORIES = {
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
};

const DEFAULT_COMPANIONS = [
  {
    id: "c1",
    name: "Rhea",
    supports: ["social"],
    tags: ["music", "food", "photos", "chill"],
    distanceKm: 4,
    reliability: 93,
    verified: true,
    completed: 48,
  },
  {
    id: "c2",
    name: "Karan",
    supports: ["social", "errand"],
    tags: ["city-walk", "paperwork", "quick", "calm"],
    distanceKm: 6,
    reliability: 89,
    verified: true,
    completed: 61,
  },
  {
    id: "c3",
    name: "Ishita",
    supports: ["errand"],
    tags: ["hospital", "calm", "support", "travel"],
    distanceKm: 3,
    reliability: 96,
    verified: true,
    completed: 73,
  },
  {
    id: "c4",
    name: "Aman",
    supports: ["social"],
    tags: ["party", "sports", "food"],
    distanceKm: 9,
    reliability: 80,
    verified: false,
    completed: 21,
  },
  {
    id: "c5",
    name: "Neha",
    supports: ["social", "errand"],
    tags: ["explore", "shopping", "travel", "new-friends"],
    distanceKm: 5,
    reliability: 91,
    verified: true,
    completed: 57,
  },
  {
    id: "c6",
    name: "Dev",
    supports: ["errand"],
    tags: ["travel", "paperwork", "support", "shopping"],
    distanceKm: 7,
    reliability: 88,
    verified: true,
    completed: 39,
  },
];

const FALLBACK_STORE = {
  version: 3,
  updatedAt: new Date().toISOString(),
  nextRequestId: 1,
  nextEventId: 1,
  nextJoinRequestId: 1,
  nextMessageId: 1,
  nextPostId: 1,
  nextUserId: 1,
  nextReportId: 1,
  metrics: METRICS,
  categories: CATEGORIES,
  companions: DEFAULT_COMPANIONS,
  requests: [],
  events: [],
  joinRequests: [],
  messages: [],
  posts: [],
  users: [],
  emailVerificationCodes: [],
  passwordResetCodes: [],
  reports: [],
};

const runtime = {
  postgresStore: null,
  writeChain: Promise.resolve(),
  rateBuckets: new Map(),
};

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function usingPostgres() {
  return Boolean(runtime.postgresStore);
}

function applyCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res, statusCode, payload) {
  applyCorsHeaders(res);
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message);
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".md":
      return "text/markdown; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8);
  }

  return [];
}

function parseMode(value) {
  return value === "errand" ? "errand" : "social";
}

function clampRadius(value) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) {
    return 8;
  }
  return Math.min(30, Math.max(1, Math.round(numberValue)));
}

function timeText(rawTime) {
  const parsed = new Date(rawTime);
  if (Number.isNaN(parsed.getTime())) {
    return "Custom time";
  }

  return parsed.toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function overlapCount(left, right) {
  const set = new Set(left);
  return right.reduce((count, value) => (set.has(value) ? count + 1 : count), 0);
}

function scoreCompanion(companion, request) {
  if (!companion.supports.includes(request.mode)) {
    return null;
  }
  if (request.verifiedOnly && !companion.verified) {
    return null;
  }

  const radius = clampRadius(request.radius);
  const distance = Number(companion.distanceKm);
  const distanceScore = Math.max(0, 30 - Math.round((distance / radius) * 30));
  const sharedTags = overlapCount(request.tags, companion.tags);
  const tagScore = Math.min(24, sharedTags * 8);
  const reliabilityScore = Math.round((Number(companion.reliability) / 100) * 26);
  const categoryBonus = companion.tags.includes(request.category) ? 6 : 0;
  const verifiedBonus = companion.verified ? 4 : 0;

  return distanceScore + tagScore + reliabilityScore + categoryBonus + verifiedBonus;
}

function buildMatches(store, request) {
  return store.companions
    .map((companion) => ({ companion, score: scoreCompanion(companion, request) }))
    .filter((entry) => entry.score !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, 20)
    .map(({ companion, score }) => ({
      id: companion.id,
      name: companion.name,
      supports: companion.supports,
      tags: companion.tags,
      distanceKm: companion.distanceKm,
      reliability: companion.reliability,
      verified: companion.verified,
      completed: companion.completed,
      score,
    }));
}

function buildFeed(store, mode, limit = 8) {
  const usersById = new Map((store.users || []).map((entry) => [entry.id, entry]));
  const pendingByRequest = new Map();
  for (const join of Array.isArray(store.joinRequests) ? store.joinRequests : []) {
    if (join.status !== "pending") {
      continue;
    }
    pendingByRequest.set(join.requestId, Number(pendingByRequest.get(join.requestId) || 0) + 1);
  }
  return store.requests
    .filter((request) => request.mode === mode && request.status === "open")
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, limit)
    .map((request) => ({
      id: request.id,
      mode: request.mode,
      title: request.title,
      category: request.category,
      location: request.location,
      timeText: timeText(request.time),
      tags: request.tags,
      verifiedOnly: request.verifiedOnly,
      postedByName:
        (request.createdBy && usersById.get(request.createdBy) && usersById.get(request.createdBy).displayName) || "Member",
      pendingJoinCount: Number(pendingByRequest.get(request.id) || 0),
    }));
}

function computeUserBadgesFromStore(store, userId) {
  const user = (store.users || []).find((entry) => entry.id === userId);
  if (!user) {
    return {
      verified: false,
      reliabilityScore: 0,
      completionRate: 0,
    };
  }

  const requests = (store.requests || []).filter((entry) => entry.createdBy === userId);
  const totalRequests = requests.length;
  const closedRequests = requests.filter((entry) => entry.status === "closed").length;
  const matchedRequests = requests.filter((entry) => entry.status === "matched").length;
  const completionRate = totalRequests > 0 ? Math.round((closedRequests / totalRequests) * 100) : 0;
  const reliabilityScore =
    totalRequests > 0 ? Math.min(99, Math.round(((closedRequests + matchedRequests * 0.6) / totalRequests) * 100)) : 80;

  return {
    verified: Boolean(user.emailVerified),
    reliabilityScore,
    completionRate,
  };
}

function ensureStoreShape(store) {
  return {
    version: Number(store.version || FALLBACK_STORE.version),
    updatedAt: store.updatedAt || FALLBACK_STORE.updatedAt,
    nextRequestId: Number(store.nextRequestId || FALLBACK_STORE.nextRequestId),
    nextEventId: Number(store.nextEventId || FALLBACK_STORE.nextEventId),
    nextJoinRequestId: Number(store.nextJoinRequestId || FALLBACK_STORE.nextJoinRequestId),
    nextMessageId: Number(store.nextMessageId || FALLBACK_STORE.nextMessageId),
    nextPostId: Number(store.nextPostId || FALLBACK_STORE.nextPostId),
    nextUserId: Number(store.nextUserId || FALLBACK_STORE.nextUserId),
    nextReportId: Number(store.nextReportId || FALLBACK_STORE.nextReportId),
    metrics: store.metrics || METRICS,
    categories: store.categories || CATEGORIES,
    companions: Array.isArray(store.companions) && store.companions.length > 0 ? store.companions : DEFAULT_COMPANIONS,
    requests: Array.isArray(store.requests)
      ? store.requests.map((entry) => ({
        ...entry,
        matchedUserId: entry.matchedUserId || null,
        matchedCompanionId: entry.matchedCompanionId || null,
        matchedAt: entry.matchedAt || null,
        createdByName: entry.createdByName || null,
        matchedUserName: entry.matchedUserName || null,
        createdByVerified: typeof entry.createdByVerified === "boolean" ? entry.createdByVerified : null,
        description: String(entry.description || ""),
        pendingJoinCount: Number(entry.pendingJoinCount || 0),
      }))
      : [],
    events: Array.isArray(store.events) ? store.events : [],
    joinRequests: Array.isArray(store.joinRequests)
      ? store.joinRequests.map((entry) => ({
        ...entry,
        introMessage: String(entry.introMessage || ""),
        status: String(entry.status || "pending"),
        createdAt: entry.createdAt || new Date().toISOString(),
        updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString(),
      }))
      : [],
    messages: Array.isArray(store.messages) ? store.messages : [],
    posts: Array.isArray(store.posts) ? store.posts : [],
    users: Array.isArray(store.users)
      ? store.users.map((entry) => ({
        ...entry,
        emailVerified:
          typeof entry.emailVerified === "boolean"
            ? entry.emailVerified
            : Boolean(entry.googleSub || entry.passwordHash || entry.role === "admin"),
        emailVerifiedAt: entry.emailVerifiedAt || null,
        aboutMe: String(entry.aboutMe || ""),
      }))
      : [],
    emailVerificationCodes: Array.isArray(store.emailVerificationCodes) ? store.emailVerificationCodes : [],
    passwordResetCodes: Array.isArray(store.passwordResetCodes) ? store.passwordResetCodes : [],
    reports: Array.isArray(store.reports) ? store.reports : [],
  };
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt,
    aboutMe: String(user.aboutMe || ""),
    googleLinked: Boolean(user.googleSub),
    hasPassword: Boolean(user.passwordHash),
    emailVerified: Boolean(user.emailVerified),
  };
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function cleanRequestPayload(payload) {
  const mode = parseMode(payload.mode);
  const title = String(payload.title || "").trim();
  const description = String(payload.description || "").trim();
  const fallbackCategory = mode === "errand" ? "paperwork" : "explore";
  const category = String(payload.category || "").trim().toLowerCase() || fallbackCategory;
  const location = String(payload.location || "").trim();
  const tags = normalizeTags(payload.tags);

  if (!title) {
    throw new ApiError(400, "Title is required.");
  }
  if (!description) {
    throw new ApiError(400, "Description is required.");
  }
  if (description.length > 500) {
    throw new ApiError(400, "Description must be 500 characters or less.");
  }
  if (!location) {
    throw new ApiError(400, "Location is required.");
  }

  return {
    mode,
    title,
    description,
    category,
    time: String(payload.time || ""),
    location,
    radius: Math.min(25, clampRadius(payload.radius)),
    tags: tags.length ? tags : [mode, category],
    verifiedOnly: Boolean(payload.verifiedOnly),
    checkIn: Boolean(payload.checkIn),
  };
}

function cleanRegistrationPayload(payload) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  const displayName = String(payload.displayName || "").trim() || email.split("@")[0] || "Member";

  if (!isValidEmail(email)) {
    throw new ApiError(400, "Valid email is required.");
  }
  if (password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters.");
  }

  return { email, password, displayName };
}

function cleanGoogleAuthPayload(payload) {
  const idToken = String(payload.idToken || "").trim();
  if (!idToken) {
    throw new ApiError(400, "Google idToken is required.");
  }

  return { idToken };
}

function cleanEmailPayload(payload) {
  const email = normalizeEmail(payload.email);
  if (!isValidEmail(email)) {
    throw new ApiError(400, "Valid email is required.");
  }
  return { email };
}

function cleanVerifyEmailConfirmPayload(payload) {
  const { email } = cleanEmailPayload(payload);
  const code = String(payload.code || "").trim();
  if (!/^\d{6}$/.test(code)) {
    throw new ApiError(400, "Verification code must be 6 digits.");
  }
  return { email, code };
}

function cleanResetPasswordPayload(payload) {
  const { email } = cleanEmailPayload(payload);
  const code = String(payload.code || "").trim();
  const newPassword = String(payload.newPassword || "");

  if (!/^\d{6}$/.test(code)) {
    throw new ApiError(400, "Reset code must be 6 digits.");
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters.");
  }

  return { email, code, newPassword };
}

function cleanReportPayload(payload) {
  const reason = String(payload.reason || "").trim();
  const details = String(payload.details || "").trim();
  const requestId = payload.requestId ? String(payload.requestId).trim() : null;
  const companionId = payload.companionId ? String(payload.companionId).trim() : null;

  if (!reason) {
    throw new ApiError(400, "Report reason is required.");
  }

  return {
    reason,
    details,
    requestId,
    companionId,
  };
}

function cleanRolePayload(payload) {
  const userId = String(payload.userId || "").trim();
  const role = String(payload.role || "").trim();

  if (!userId || !["admin", "member"].includes(role)) {
    throw new ApiError(400, "userId and role(admin|member) are required.");
  }

  return { userId, role };
}

function cleanRequestStatusPayload(payload) {
  const requestId = String(payload.requestId || "").trim();
  const status = String(payload.status || "").trim();

  if (!requestId || !["open", "matched", "closed", "cancelled"].includes(status)) {
    throw new ApiError(400, "requestId and status(open|matched|closed|cancelled) are required.");
  }

  return { requestId, status };
}

function cleanAccountSettingsPayload(payload) {
  const aboutMe = String(payload.aboutMe || "").trim();
  if (aboutMe.length > 300) {
    throw new ApiError(400, "About me must be 300 characters or less.");
  }
  return { aboutMe };
}

function cleanMessagePayload(payload) {
  const requestId = String(payload.requestId || "").trim();
  const content = String(payload.content || "").trim();

  if (!requestId) {
    throw new ApiError(400, "requestId is required.");
  }
  if (!content) {
    throw new ApiError(400, "Message content is required.");
  }
  if (content.length > 700) {
    throw new ApiError(400, "Message is too long (max 700 characters).");
  }

  return { requestId, content };
}

function cleanJoinRequestPayload(payload) {
  const requestId = String(payload.requestId || "").trim();
  const introMessage = String(payload.introMessage || "").trim();

  if (!requestId) {
    throw new ApiError(400, "requestId is required.");
  }
  if (introMessage.length > 200) {
    throw new ApiError(400, "Join intro message must be 200 characters or less.");
  }

  return { requestId, introMessage };
}

function cleanPostPayload(payload) {
  const text = String(payload.text || "").trim();
  const tags = normalizeTags(payload.tags);
  const visibility = String(payload.visibility || "public").trim().toLowerCase();

  if (!text) {
    throw new ApiError(400, "Post text is required.");
  }
  if (text.length > 280) {
    throw new ApiError(400, "Post text must be 280 characters or less.");
  }
  if (!["public", "verified-only"].includes(visibility)) {
    throw new ApiError(400, "visibility must be public or verified-only.");
  }

  return {
    text,
    tags,
    visibility,
  };
}

function generateSixDigitCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function ttlToMinutes(ttlMs) {
  return Math.max(1, Math.ceil(Number(ttlMs || 0) / 60_000));
}

function isExpired(isoTime) {
  const parsed = new Date(isoTime);
  if (Number.isNaN(parsed.getTime())) {
    return true;
  }
  return Date.now() > parsed.getTime();
}

function extractBearerToken(authHeader) {
  const raw = String(authHeader || "");
  if (!raw.startsWith("Bearer ")) {
    return null;
  }
  return raw.slice("Bearer ".length).trim();
}

function createAuthResponse(user) {
  const safeUser = sanitizeUser(user);
  const token = signToken(
    { sub: safeUser.id, email: safeUser.email, role: safeUser.role },
    TOKEN_SECRET,
    TOKEN_TTL_SECONDS
  );

  return {
    token,
    tokenType: "Bearer",
    expiresIn: TOKEN_TTL_SECONDS,
    user: safeUser,
  };
}

function consumeRateLimit(req, pathname) {
  if (!pathname.startsWith("/api/") || pathname === "/api/health") {
    return true;
  }

  const isAuthPath = pathname.startsWith("/api/auth/");
  const limit = isAuthPath ? AUTH_RATE_LIMIT_MAX : RATE_LIMIT_MAX;
  const remoteAddress = req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const key = `${remoteAddress}:${isAuthPath ? "auth" : "api"}`;

  const bucket = runtime.rateBuckets.get(key) || {
    count: 0,
    windowStart: now,
  };

  if (now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    bucket.count = 0;
    bucket.windowStart = now;
  }

  bucket.count += 1;
  runtime.rateBuckets.set(key, bucket);

  if (runtime.rateBuckets.size > 6000) {
    for (const [entryKey, entryValue] of runtime.rateBuckets.entries()) {
      if (now - entryValue.windowStart >= RATE_LIMIT_WINDOW_MS * 2) {
        runtime.rateBuckets.delete(entryKey);
      }
    }
  }

  return bucket.count <= limit;
}

async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(new ApiError(413, "Request body too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        const raw = Buffer.concat(chunks).toString("utf-8");
        const parsed = JSON.parse(raw);
        resolve(parsed);
      } catch {
        reject(new ApiError(400, "Invalid JSON body."));
      }
    });

    req.on("error", () => {
      reject(new ApiError(400, "Failed to read request body."));
    });
  });
}

async function ensureStoreFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(FALLBACK_STORE, null, 2));
  }
}

async function readStore() {
  await ensureStoreFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  const parsed = JSON.parse(raw);
  return ensureStoreShape(parsed);
}

async function writeStore(store) {
  store.updatedAt = new Date().toISOString();
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2));
}

function mutateStore(mutator) {
  const operation = runtime.writeChain.then(async () => {
    const store = await readStore();
    const result = await mutator(store);
    await writeStore(store);
    return result;
  });

  runtime.writeChain = operation.catch(() => { });
  return operation;
}

function staticPath(pathname) {
  if (pathname === "/") {
    return path.join(ROOT_DIR, "index.html");
  }
  if (pathname.startsWith("/profile/")) {
    return path.join(ROOT_DIR, "index.html");
  }

  if (pathname.startsWith("/assets/")) {
    const assetsRoot = path.join(ROOT_DIR, "assets");
    const resolved = path.normalize(path.join(ROOT_DIR, pathname.slice(1)));
    if (!resolved.startsWith(`${assetsRoot}${path.sep}`)) {
      return null;
    }
    return resolved;
  }

  const allowed = new Set([
    "/index.html",
    "/styles.css",
    "/app.js",
    "/README.md",
    "/CONCEPT_NOTE.md",
  ]);

  if (!allowed.has(pathname)) {
    return null;
  }

  return path.join(ROOT_DIR, pathname.slice(1));
}

async function serveStatic(res, pathname) {
  const filePath = staticPath(pathname);
  if (!filePath) {
    sendText(res, 404, "Not found");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
    res.end(data);
  } catch {
    sendText(res, 404, "Not found");
  }
}

async function initStorage() {
  if (STORAGE_DRIVER !== "postgres") {
    console.log("Storage mode: json");
    return;
  }

  const ssl = process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false };
  const postgresStore = new PostgresStore({
    connectionString: process.env.DATABASE_URL,
    metrics: METRICS,
    categories: CATEGORIES,
    ssl,
  });

  await postgresStore.init();
  runtime.postgresStore = postgresStore;
  console.log("Storage mode: postgres");
}

async function shutdownStorage() {
  if (runtime.postgresStore) {
    await runtime.postgresStore.close();
  }
}

async function storageGetBootstrap(mode) {
  if (usingPostgres()) {
    return runtime.postgresStore.getBootstrap(mode);
  }

  const store = await readStore();
  const companions = store.companions.filter((entry) => entry.supports.includes(mode));

  return {
    mode,
    metrics: store.metrics,
    categories: store.categories,
    companions,
    feed: buildFeed(store, mode, 8),
  };
}

async function storageGetFeed(mode, limit) {
  if (usingPostgres()) {
    return runtime.postgresStore.getFeed(mode, limit);
  }

  const store = await readStore();
  return buildFeed(store, mode, limit);
}

async function storageListRequests(mode = null) {
  if (usingPostgres()) {
    return runtime.postgresStore.listRequests(mode);
  }

  const store = await readStore();
  const usersById = new Map(store.users.map((entry) => [entry.id, entry]));
  const pendingByRequest = new Map();
  for (const joinRequest of store.joinRequests) {
    if (joinRequest.status !== "pending") {
      continue;
    }
    pendingByRequest.set(joinRequest.requestId, Number(pendingByRequest.get(joinRequest.requestId) || 0) + 1);
  }
  return store.requests
    .filter((entry) => (mode ? entry.mode === mode : true))
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .map((entry) => ({
      ...entry,
      description: String(entry.description || ""),
      createdByName:
        (entry.createdBy && usersById.get(entry.createdBy) && usersById.get(entry.createdBy).displayName) || "Member",
      createdByVerified: Boolean(
        entry.createdBy && usersById.get(entry.createdBy) && usersById.get(entry.createdBy).emailVerified
      ),
      matchedUserName:
        (entry.matchedUserId && usersById.get(entry.matchedUserId) && usersById.get(entry.matchedUserId).displayName) || null,
      pendingJoinCount: Number(pendingByRequest.get(entry.id) || 0),
    }));
}

async function storageFindRequestById(requestId) {
  if (usingPostgres()) {
    return runtime.postgresStore.findRequestById(requestId);
  }

  const store = await readStore();
  const request = store.requests.find((entry) => entry.id === requestId) || null;
  if (!request) {
    return null;
  }
  const owner = request.createdBy ? store.users.find((entry) => entry.id === request.createdBy) : null;
  const matchedUser = request.matchedUserId ? store.users.find((entry) => entry.id === request.matchedUserId) : null;
  const pendingJoinCount = store.joinRequests.filter(
    (entry) => entry.requestId === request.id && entry.status === "pending"
  ).length;
  return {
    ...request,
    description: String(request.description || ""),
    createdByName: owner ? owner.displayName : "Member",
    createdByVerified: Boolean(owner && owner.emailVerified),
    matchedUserName: matchedUser ? matchedUser.displayName : null,
    pendingJoinCount,
  };
}

async function storageFindCompanionById(companionId) {
  if (usingPostgres()) {
    return runtime.postgresStore.findCompanionById(companionId);
  }

  const store = await readStore();
  return store.companions.find((entry) => entry.id === companionId) || null;
}

async function storageCreateRequest(payload, actorUserId = null) {
  if (usingPostgres()) {
    return runtime.postgresStore.createRequest(payload, actorUserId);
  }

  return mutateStore((store) => {
    const owner =
      actorUserId && Array.isArray(store.users) ? store.users.find((entry) => entry.id === actorUserId) : null;
    const request = {
      id: `req-${store.nextRequestId}`,
      ...payload,
      description: String(payload.description || ""),
      status: "open",
      matchedUserId: null,
      matchedCompanionId: null,
      matchedAt: null,
      createdAt: new Date().toISOString(),
      createdBy: actorUserId,
      createdByName: owner ? owner.displayName : "Member",
    };

    store.nextRequestId += 1;
    store.requests.unshift(request);

    if (store.requests.length > 300) {
      store.requests = store.requests.slice(0, 300);
    }

    return {
      request,
      matches: buildMatches(store, request),
      feed: buildFeed(store, request.mode, 8),
    };
  });
}

async function storageGetMatchesForRequest(request) {
  if (usingPostgres()) {
    return runtime.postgresStore.getMatchesForRequest(request);
  }

  const store = await readStore();
  return buildMatches(store, request);
}

async function storageCreateEvent({ type, requestId, companionId = null, actorUserId = null, metadata = null }) {
  if (usingPostgres()) {
    return runtime.postgresStore.createEvent({ type, requestId, companionId, actorUserId, metadata });
  }

  return mutateStore((store) => {
    const event = {
      id: `evt-${store.nextEventId}`,
      type,
      requestId,
      companionId,
      actorUserId,
      metadata,
      createdAt: new Date().toISOString(),
    };

    store.nextEventId += 1;
    store.events.unshift(event);

    if (store.events.length > 500) {
      store.events = store.events.slice(0, 500);
    }

    return event;
  });
}

async function storageAcceptMatch({ requestId, companionId, actorUserId = null }) {
  if (usingPostgres()) {
    return runtime.postgresStore.acceptMatch({ requestId, companionId, actorUserId });
  }

  return mutateStore((store) => {
    const request = store.requests.find((entry) => entry.id === requestId);
    const companion = store.companions.find((entry) => entry.id === companionId);

    if (!request || !companion) {
      return null;
    }

    if (request.status !== "open") {
      throw new ApiError(409, "This request is no longer open for matching.");
    }

    if (!Array.isArray(companion.supports) || !companion.supports.includes(request.mode)) {
      throw new ApiError(400, "Selected companion does not support this lane.");
    }

    if (request.verifiedOnly && !companion.verified) {
      throw new ApiError(400, "Selected companion is not verified for this request.");
    }

    const now = new Date().toISOString();
    request.status = "matched";
    request.matchedUserId = null;
    request.matchedCompanionId = companion.id;
    request.matchedAt = now;

    const event = {
      id: `evt-${store.nextEventId}`,
      type: "accept",
      requestId,
      companionId,
      actorUserId,
      metadata: null,
      createdAt: now,
    };

    store.nextEventId += 1;
    store.events.unshift(event);
    if (store.events.length > 500) {
      store.events = store.events.slice(0, 500);
    }

    return {
      request,
      companion,
      event,
      feed: buildFeed(store, request.mode, 8),
    };
  });
}

async function storageMatchRequestWithUser({ requestId, matchedUserId, actorUserId = null }) {
  if (usingPostgres()) {
    return runtime.postgresStore.matchRequestWithUser({ requestId, matchedUserId, actorUserId });
  }

  return mutateStore((store) => {
    const request = store.requests.find((entry) => entry.id === requestId);
    if (!request) {
      return null;
    }
    if (request.status !== "open") {
      return null;
    }

    const now = new Date().toISOString();
    request.status = "matched";
    request.matchedUserId = matchedUserId;
    request.matchedCompanionId = null;
    request.matchedAt = now;

    const event = {
      id: `evt-${store.nextEventId}`,
      type: "join-match",
      requestId,
      companionId: null,
      actorUserId,
      metadata: { matchedUserId },
      createdAt: now,
    };

    store.nextEventId += 1;
    store.events.unshift(event);
    if (store.events.length > 500) {
      store.events = store.events.slice(0, 500);
    }

    return {
      request,
      event,
      feed: buildFeed(store, request.mode, 8),
    };
  });
}

async function storageCompleteRequest({ requestId, userId, outcome }) {
  if (usingPostgres()) {
    return runtime.postgresStore.completeRequest({ requestId, userId, outcome });
  }

  return mutateStore((store) => {
    const request = store.requests.find((entry) => entry.id === requestId);
    if (!request || request.status !== "matched") return null;

    if (String(request.createdBy) === String(userId)) {
      request.posterOutcome = outcome;
    } else if (String(request.matchedUserId) === String(userId) || String(request.matchedCompanionId) === String(userId)) {
      request.peerOutcome = outcome;
    } else {
      return null;
    }

    request.completedAt = request.completedAt || new Date().toISOString();
    return request;
  });
}

async function storageRateCompanion({ requestId, userId, meetAgain }) {
  if (usingPostgres()) {
    return runtime.postgresStore.rateCompanion({ requestId, userId, meetAgain });
  }

  return mutateStore((store) => {
    const request = store.requests.find((entry) => entry.id === requestId);
    if (!request || request.status !== "matched") return null;

    if (String(request.createdBy) === String(userId)) {
      request.posterMeetAgain = meetAgain;
    } else if (String(request.matchedUserId) === String(userId) || String(request.matchedCompanionId) === String(userId)) {
      request.peerMeetAgain = meetAgain;
    } else {
      return null;
    }

    return request;
  });
}

async function storageCreateJoinRequest({ requestId, joinerUserId, introMessage = "" }) {
  if (usingPostgres()) {
    return runtime.postgresStore.createJoinRequest({ requestId, joinerUserId, introMessage });
  }

  return mutateStore((store) => {
    const request = store.requests.find((entry) => entry.id === requestId);
    if (!request) {
      return null;
    }

    const now = new Date().toISOString();
    const existing = store.joinRequests.find(
      (entry) => entry.requestId === requestId && entry.joinerUserId === joinerUserId
    );
    if (existing) {
      existing.introMessage = String(introMessage || "");
      existing.status = "pending";
      existing.updatedAt = now;
      return {
        id: existing.id,
        requestId: existing.requestId,
        joinerUserId: existing.joinerUserId,
        introMessage: existing.introMessage,
        status: existing.status,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      };
    }

    const joinRequest = {
      id: `jr-${store.nextJoinRequestId}`,
      requestId,
      joinerUserId,
      introMessage: String(introMessage || ""),
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    store.nextJoinRequestId += 1;
    store.joinRequests.unshift(joinRequest);

    const event = {
      id: `evt-${store.nextEventId}`,
      type: "join-request",
      requestId,
      companionId: null,
      actorUserId: joinerUserId,
      metadata: {
        introMessage: joinRequest.introMessage,
      },
      createdAt: now,
    };
    store.nextEventId += 1;
    store.events.unshift(event);
    if (store.events.length > 500) {
      store.events = store.events.slice(0, 500);
    }

    return {
      id: joinRequest.id,
      requestId: joinRequest.requestId,
      joinerUserId: joinRequest.joinerUserId,
      introMessage: joinRequest.introMessage,
      status: joinRequest.status,
      createdAt: joinRequest.createdAt,
      updatedAt: joinRequest.updatedAt,
    };
  });
}

async function storageListPendingJoinRequests(requestId) {
  if (usingPostgres()) {
    return runtime.postgresStore.listPendingJoinRequests(requestId);
  }

  const store = await readStore();
  const usersById = new Map(store.users.map((entry) => [entry.id, entry]));
  const items = store.joinRequests
    .filter((entry) => entry.requestId === requestId && entry.status === "pending")
    .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));

  return items.map((entry) => {
    const user = usersById.get(entry.joinerUserId);
    const badges = computeUserBadgesFromStore(store, entry.joinerUserId);
    return {
      id: entry.id,
      requestId: entry.requestId,
      joinerUserId: entry.joinerUserId,
      introMessage: String(entry.introMessage || ""),
      createdAt: entry.createdAt,
      displayName: user ? user.displayName : "Member",
      badges,
    };
  });
}

async function storageAcceptJoinRequest({ requestId, joinerUserId, actorUserId }) {
  if (usingPostgres()) {
    return runtime.postgresStore.acceptJoinRequest({ requestId, joinerUserId, actorUserId });
  }

  return mutateStore((store) => {
    const request = store.requests.find((entry) => entry.id === requestId);
    if (!request || request.status !== "open") {
      return null;
    }

    const pendingJoin = store.joinRequests.find(
      (entry) => entry.requestId === requestId && entry.joinerUserId === joinerUserId && entry.status === "pending"
    );
    if (!pendingJoin) {
      return null;
    }

    const now = new Date().toISOString();
    request.status = "matched";
    request.matchedUserId = joinerUserId;
    request.matchedCompanionId = null;
    request.matchedAt = now;

    for (const joinRequest of store.joinRequests) {
      if (joinRequest.requestId !== requestId || joinRequest.status !== "pending") {
        continue;
      }
      joinRequest.status = joinRequest.joinerUserId === joinerUserId ? "accepted" : "declined";
      joinRequest.updatedAt = now;
    }

    const event = {
      id: `evt-${store.nextEventId}`,
      type: "join-match",
      requestId,
      companionId: null,
      actorUserId,
      metadata: { matchedUserId: joinerUserId },
      createdAt: now,
    };
    store.nextEventId += 1;
    store.events.unshift(event);
    if (store.events.length > 500) {
      store.events = store.events.slice(0, 500);
    }

    return {
      request,
      event,
      acceptedJoinRequest: {
        id: pendingJoin.id,
        requestId: pendingJoin.requestId,
        joinerUserId: pendingJoin.joinerUserId,
        introMessage: String(pendingJoin.introMessage || ""),
        status: "accepted",
      },
    };
  });
}

async function storageDeclineJoinRequest({ requestId, joinerUserId, actorUserId }) {
  if (usingPostgres()) {
    return runtime.postgresStore.declineJoinRequest({ requestId, joinerUserId, actorUserId });
  }

  return mutateStore((store) => {
    const target = store.joinRequests.find(
      (entry) => entry.requestId === requestId && entry.joinerUserId === joinerUserId && entry.status === "pending"
    );
    if (!target) {
      return null;
    }

    const now = new Date().toISOString();
    target.status = "declined";
    target.updatedAt = now;

    const event = {
      id: `evt-${store.nextEventId}`,
      type: "join-decline",
      requestId,
      companionId: null,
      actorUserId,
      metadata: { declinedUserId: joinerUserId },
      createdAt: now,
    };
    store.nextEventId += 1;
    store.events.unshift(event);
    if (store.events.length > 500) {
      store.events = store.events.slice(0, 500);
    }

    return {
      id: target.id,
      requestId: target.requestId,
      joinerUserId: target.joinerUserId,
      status: target.status,
      updatedAt: target.updatedAt,
    };
  });
}

async function storageCreateUser({ email, passwordHash = null, displayName }) {
  if (usingPostgres()) {
    return runtime.postgresStore.createUser({ email, passwordHash, displayName });
  }

  return mutateStore((store) => {
    const normalizedEmail = normalizeEmail(email);
    const alreadyExists = store.users.some((entry) => normalizeEmail(entry.email) === normalizedEmail);

    if (alreadyExists) {
      throw new ApiError(409, "Email is already registered.");
    }

    const isFirstUser = store.users.length === 0;
    const user = {
      id: `usr-${store.nextUserId}`,
      email: normalizedEmail,
      passwordHash,
      displayName,
      role: isFirstUser ? "admin" : "member",
      googleSub: null,
      emailVerified: false,
      emailVerifiedAt: null,
      createdAt: new Date().toISOString(),
    };

    store.nextUserId += 1;
    store.users.push(user);
    return user;
  });
}

async function storageCreateGoogleUser({ email, displayName, googleSub }) {
  if (usingPostgres()) {
    return runtime.postgresStore.createGoogleUser({ email, displayName, googleSub });
  }

  return mutateStore((store) => {
    const normalizedEmail = normalizeEmail(email);
    const existingByEmail = store.users.find((entry) => normalizeEmail(entry.email) === normalizedEmail);
    if (existingByEmail) {
      throw new ApiError(409, "Email is already registered.");
    }
    const existingByGoogle = store.users.find((entry) => entry.googleSub && entry.googleSub === googleSub);
    if (existingByGoogle) {
      throw new ApiError(409, "Google account is already linked.");
    }

    const isFirstUser = store.users.length === 0;
    const user = {
      id: `usr-${store.nextUserId}`,
      email: normalizedEmail,
      passwordHash: null,
      displayName,
      role: isFirstUser ? "admin" : "member",
      googleSub,
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    store.nextUserId += 1;
    store.users.push(user);
    return user;
  });
}

async function storageFindUserByEmail(email) {
  if (usingPostgres()) {
    return runtime.postgresStore.findUserByEmail(email);
  }

  const store = await readStore();
  return store.users.find((entry) => normalizeEmail(entry.email) === normalizeEmail(email)) || null;
}

async function storageFindUserById(userId) {
  if (usingPostgres()) {
    return runtime.postgresStore.findUserById(userId);
  }

  const store = await readStore();
  return store.users.find((entry) => entry.id === userId) || null;
}

async function storageFindUserByGoogleSub(googleSub) {
  if (usingPostgres()) {
    return runtime.postgresStore.findUserByGoogleSub(googleSub);
  }

  const store = await readStore();
  return store.users.find((entry) => entry.googleSub && entry.googleSub === googleSub) || null;
}

async function storageLinkGoogleSub({ userId, googleSub }) {
  if (usingPostgres()) {
    return runtime.postgresStore.linkGoogleSub({ userId, googleSub });
  }

  return mutateStore((store) => {
    const conflict = store.users.find((entry) => entry.googleSub && entry.googleSub === googleSub && entry.id !== userId);
    if (conflict) {
      throw new ApiError(409, "Google account is already linked to another user.");
    }

    const user = store.users.find((entry) => entry.id === userId);
    if (!user) {
      return null;
    }

    user.googleSub = googleSub;
    return user;
  });
}

async function storageCreateEmailVerificationCode({ userId, code, expiresAt }) {
  if (usingPostgres()) {
    return runtime.postgresStore.createEmailVerificationCode({ userId, code, expiresAt });
  }

  return mutateStore((store) => {
    const record = {
      id: `evc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      code,
      expiresAt,
      usedAt: null,
      createdAt: new Date().toISOString(),
    };

    store.emailVerificationCodes = store.emailVerificationCodes.filter(
      (entry) => entry.userId !== userId || entry.usedAt || !isExpired(entry.expiresAt)
    );
    store.emailVerificationCodes.unshift(record);
    if (store.emailVerificationCodes.length > 1000) {
      store.emailVerificationCodes = store.emailVerificationCodes.slice(0, 1000);
    }
    return record;
  });
}

async function storageFindValidEmailVerificationCode({ email, code }) {
  if (usingPostgres()) {
    return runtime.postgresStore.findValidEmailVerificationCode({ email, code });
  }

  const store = await readStore();
  const user = store.users.find((entry) => normalizeEmail(entry.email) === normalizeEmail(email));
  if (!user) {
    return null;
  }

  const match = store.emailVerificationCodes.find(
    (entry) => entry.userId === user.id && entry.code === code && !entry.usedAt && !isExpired(entry.expiresAt)
  );
  if (!match) {
    return null;
  }

  return {
    id: match.id,
    userId: user.id,
  };
}

async function storageConsumeEmailVerificationCode(codeId) {
  if (usingPostgres()) {
    return runtime.postgresStore.consumeEmailVerificationCode(codeId);
  }

  return mutateStore((store) => {
    const record = store.emailVerificationCodes.find((entry) => entry.id === codeId);
    if (!record) {
      return null;
    }
    record.usedAt = new Date().toISOString();
    return record;
  });
}

async function storageMarkUserEmailVerified(userId) {
  if (usingPostgres()) {
    return runtime.postgresStore.markUserEmailVerified(userId);
  }

  return mutateStore((store) => {
    const user = store.users.find((entry) => entry.id === userId);
    if (!user) {
      return null;
    }
    user.emailVerified = true;
    user.emailVerifiedAt = user.emailVerifiedAt || new Date().toISOString();
    return user;
  });
}

async function storageCreatePasswordResetCode({ userId, code, expiresAt }) {
  if (usingPostgres()) {
    return runtime.postgresStore.createPasswordResetCode({ userId, code, expiresAt });
  }

  return mutateStore((store) => {
    const record = {
      id: `prc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      code,
      expiresAt,
      usedAt: null,
      createdAt: new Date().toISOString(),
    };

    store.passwordResetCodes = store.passwordResetCodes.filter(
      (entry) => entry.userId !== userId || entry.usedAt || !isExpired(entry.expiresAt)
    );
    store.passwordResetCodes.unshift(record);
    if (store.passwordResetCodes.length > 1000) {
      store.passwordResetCodes = store.passwordResetCodes.slice(0, 1000);
    }
    return record;
  });
}

async function storageFindValidPasswordResetCode({ email, code }) {
  if (usingPostgres()) {
    return runtime.postgresStore.findValidPasswordResetCode({ email, code });
  }

  const store = await readStore();
  const user = store.users.find((entry) => normalizeEmail(entry.email) === normalizeEmail(email));
  if (!user) {
    return null;
  }

  const match = store.passwordResetCodes.find(
    (entry) => entry.userId === user.id && entry.code === code && !entry.usedAt && !isExpired(entry.expiresAt)
  );
  if (!match) {
    return null;
  }

  return {
    id: match.id,
    userId: user.id,
  };
}

async function storageConsumePasswordResetCode(codeId) {
  if (usingPostgres()) {
    return runtime.postgresStore.consumePasswordResetCode(codeId);
  }

  return mutateStore((store) => {
    const record = store.passwordResetCodes.find((entry) => entry.id === codeId);
    if (!record) {
      return null;
    }
    record.usedAt = new Date().toISOString();
    return record;
  });
}

async function storageUpdateUserPassword({ userId, passwordHash }) {
  if (usingPostgres()) {
    return runtime.postgresStore.updateUserPassword({ userId, passwordHash });
  }

  return mutateStore((store) => {
    const user = store.users.find((entry) => entry.id === userId);
    if (!user) {
      return null;
    }
    user.passwordHash = passwordHash;
    return user;
  });
}

async function storageUpdateUserAboutMe({ userId, aboutMe }) {
  if (usingPostgres()) {
    return runtime.postgresStore.updateUserAboutMe({ userId, aboutMe });
  }

  return mutateStore((store) => {
    const user = store.users.find((entry) => entry.id === userId);
    if (!user) {
      return null;
    }
    user.aboutMe = String(aboutMe || "");
    return user;
  });
}

async function storageListMessagesForRequest(requestId) {
  if (usingPostgres()) {
    return runtime.postgresStore.listMessagesForRequest(requestId);
  }

  const store = await readStore();
  return store.messages
    .filter((entry) => entry.requestId === requestId)
    .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
}

async function storageCreateMessage({ requestId, senderType, senderUserId = null, senderName, content }) {
  if (usingPostgres()) {
    return runtime.postgresStore.createMessage({ requestId, senderType, senderUserId, senderName, content });
  }

  return mutateStore((store) => {
    const message = {
      id: `msg-${store.nextMessageId}`,
      requestId,
      senderType,
      senderUserId,
      senderName,
      content,
      createdAt: new Date().toISOString(),
    };

    store.nextMessageId += 1;
    store.messages.push(message);
    if (store.messages.length > 5000) {
      store.messages = store.messages.slice(-5000);
    }
    return message;
  });
}

function canViewPost(post, viewer) {
  if (!post || post.visibility !== "verified-only") {
    return true;
  }
  if (!viewer) {
    return false;
  }
  if (viewer.role === "admin") {
    return true;
  }
  if (viewer.id && post.userId === viewer.id) {
    return true;
  }
  return Boolean(viewer.emailVerified);
}

async function storageListPosts({ userId = null, limit = 20, offset = 0, viewer = null }) {
  if (usingPostgres()) {
    return runtime.postgresStore.listPosts({ userId, limit, offset, viewer });
  }

  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const store = await readStore();
  const usersById = new Map(store.users.map((entry) => [entry.id, entry]));

  return store.posts
    .filter((entry) => (userId ? entry.userId === userId : true))
    .filter((entry) => canViewPost(entry, viewer))
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(safeOffset, safeOffset + safeLimit)
    .map((entry) => {
      const owner = usersById.get(entry.userId);
      return {
        id: entry.id,
        userId: entry.userId,
        displayName: owner ? owner.displayName : "Member",
        text: entry.text,
        tags: Array.isArray(entry.tags) ? entry.tags : [],
        visibility: entry.visibility === "verified-only" ? "verified-only" : "public",
        helpfulCount: Number(entry.helpfulCount || 0),
        createdAt: entry.createdAt,
      };
    });
}

async function storageCreatePost({ userId, text, tags = [], visibility = "public" }) {
  if (usingPostgres()) {
    return runtime.postgresStore.createPost({ userId, text, tags, visibility });
  }

  return mutateStore((store) => {
    const post = {
      id: `post-${store.nextPostId}`,
      userId,
      text,
      tags,
      visibility,
      helpfulCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.nextPostId += 1;
    store.posts.unshift(post);
    if (store.posts.length > 4000) {
      store.posts = store.posts.slice(0, 4000);
    }

    const owner = store.users.find((entry) => entry.id === userId);
    return {
      id: post.id,
      userId: post.userId,
      displayName: owner ? owner.displayName : "Member",
      text: post.text,
      tags: post.tags,
      visibility: post.visibility,
      helpfulCount: 0,
      createdAt: post.createdAt,
    };
  });
}

async function storageGetPublicProfile(userId) {
  if (usingPostgres()) {
    return runtime.postgresStore.getPublicProfile(userId);
  }

  const store = await readStore();
  const user = store.users.find((entry) => entry.id === userId);
  if (!user) {
    return null;
  }

  const requests = store.requests
    .filter((entry) => entry.createdBy === userId)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  const totalRequests = requests.length;
  const openRequests = requests.filter((entry) => entry.status === "open").length;
  const matchedRequests = requests.filter((entry) => entry.status === "matched").length;
  const closedRequests = requests.filter((entry) => entry.status === "closed").length;
  const postCount = store.posts.filter((entry) => entry.userId === userId).length;

  const completionRate = totalRequests > 0 ? Math.round((closedRequests / totalRequests) * 100) : 0;
  const reliabilityScore =
    totalRequests > 0 ? Math.min(99, Math.round(((closedRequests + matchedRequests * 0.6) / totalRequests) * 100)) : 80;

  return {
    userId: user.id,
    displayName: user.displayName,
    joinDate: user.createdAt,
    aboutMe: String(user.aboutMe || ""),
    badges: {
      verified: Boolean(user.emailVerified),
      reliabilityScore,
      completionRate,
    },
    summary: {
      postCount,
      requestCount: totalRequests,
      activeRequests: openRequests + matchedRequests,
      completedRequests: closedRequests,
    },
    requests: requests.slice(0, 30).map((entry) => ({
      ...entry,
      createdByName: user.displayName,
    })),
  };
}

async function storageListUsers() {
  if (usingPostgres()) {
    return runtime.postgresStore.listUsers();
  }

  const store = await readStore();
  return [...store.users].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

async function storageUpdateUserRole({ userId, role }) {
  if (usingPostgres()) {
    return runtime.postgresStore.updateUserRole({ userId, role });
  }

  return mutateStore((store) => {
    const user = store.users.find((entry) => entry.id === userId);
    if (!user) {
      return null;
    }
    user.role = role;
    return user;
  });
}

async function storageUpdateRequestStatus({ requestId, status }) {
  if (usingPostgres()) {
    return runtime.postgresStore.updateRequestStatus({ requestId, status });
  }

  return mutateStore((store) => {
    const request = store.requests.find((entry) => entry.id === requestId);
    if (!request) {
      return null;
    }
    request.status = status;
    if (status !== "matched") {
      request.matchedUserId = null;
      request.matchedCompanionId = null;
      request.matchedAt = null;
    }
    return request;
  });
}

async function storageEnsureAdminByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return null;
  }

  if (usingPostgres()) {
    return runtime.postgresStore.ensureAdminByEmail(normalized);
  }

  return mutateStore((store) => {
    const user = store.users.find((entry) => normalizeEmail(entry.email) === normalized);
    if (!user) {
      return null;
    }
    user.role = "admin";
    user.emailVerified = true;
    user.emailVerifiedAt = user.emailVerifiedAt || new Date().toISOString();
    return user;
  });
}

async function storageGetAdminOverview() {
  if (usingPostgres()) {
    return runtime.postgresStore.getAdminOverview();
  }

  const store = await readStore();
  const usersTotal = store.users.length;
  const adminsTotal = store.users.filter((entry) => entry.role === "admin").length;
  const requestsTotal = store.requests.length;
  const requestsOpen = store.requests.filter((entry) => entry.status === "open").length;
  const requestsMatched = store.requests.filter((entry) => entry.status === "matched").length;
  const reportsTotal = store.reports.length;
  const reportsOpen = store.reports.filter((entry) => entry.status === "open").length;
  const eventsTotal = store.events.length;

  return {
    usersTotal,
    adminsTotal,
    membersTotal: usersTotal - adminsTotal,
    requestsTotal,
    requestsOpen,
    requestsMatched,
    reportsTotal,
    reportsOpen,
    eventsTotal,
  };
}

async function storageCreateReport({ reporterUserId, requestId = null, companionId = null, reason, details = "" }) {
  if (usingPostgres()) {
    return runtime.postgresStore.createReport({ reporterUserId, requestId, companionId, reason, details });
  }

  return mutateStore((store) => {
    const report = {
      id: store.nextReportId,
      reporterUserId,
      requestId,
      companionId,
      reason,
      details,
      status: "open",
      resolutionNote: "",
      resolvedByUserId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.nextReportId += 1;
    store.reports.unshift(report);
    return report;
  });
}

async function storageListReports(status = null) {
  if (usingPostgres()) {
    return runtime.postgresStore.listReports(status);
  }

  const store = await readStore();
  return store.reports
    .filter((entry) => (status ? entry.status === status : true))
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

async function storageResolveReport({ reportId, status, resolutionNote = "", resolverUserId = null }) {
  if (usingPostgres()) {
    return runtime.postgresStore.resolveReport({ reportId, status, resolutionNote, resolverUserId });
  }

  return mutateStore((store) => {
    const report = store.reports.find((entry) => Number(entry.id) === Number(reportId));
    if (!report) {
      return null;
    }

    report.status = status;
    report.resolutionNote = resolutionNote;
    report.resolvedByUserId = resolverUserId;
    report.updatedAt = new Date().toISOString();
    return report;
  });
}

async function authenticateRequest(req, { optional = false } = {}) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    if (optional) {
      return null;
    }
    throw new ApiError(401, "Authentication required.");
  }

  let payload;
  try {
    payload = verifyToken(token, TOKEN_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired token.");
  }

  const user = await storageFindUserById(payload.sub);
  if (!user) {
    throw new ApiError(401, "User not found for token.");
  }

  return sanitizeUser(user);
}

function requireAdmin(user) {
  if (!user || user.role !== "admin") {
    throw new ApiError(403, "Admin privileges required.");
  }
}

function requireVerifiedUser(user) {
  if (!user || !user.emailVerified) {
    throw new ApiError(403, "Email verification required before this action.");
  }
}

function requireRequestAccess(user, request) {
  if (!user) {
    throw new ApiError(401, "Authentication required.");
  }
  if (user.role === "admin") {
    return;
  }
  if (request && request.createdBy && request.createdBy === user.id) {
    return;
  }
  if (request && request.matchedUserId && request.matchedUserId === user.id) {
    return;
  }
  throw new ApiError(403, "You do not have access to this request session.");
}

async function seedUserMatchConversation({ request, ownerName, peerName }) {
  const intro = `Match confirmed between ${ownerName} and ${peerName}. Use this thread to align exact location, arrival time, and safety preferences.`;
  await storageCreateMessage({
    requestId: request.id,
    senderType: "system",
    senderUserId: null,
    senderName: "Tag Along",
    content: intro,
  });
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") {
    applyCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  const { pathname, searchParams } = url;

  if (!consumeRateLimit(req, pathname)) {
    sendJson(res, 429, {
      error: "Too many requests. Please try again shortly.",
      retryAfterMs: RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/health") {
    if (usingPostgres()) {
      await runtime.postgresStore.health();
    }

    sendJson(res, 200, {
      status: "ok",
      now: new Date().toISOString(),
      storage: usingPostgres() ? "postgres" : "json",
      authRequired: AUTH_REQUIRED,
      appEnv: APP_ENV,
      emailProvider: EMAIL_PROVIDER,
      googleAuthEnabled: Boolean(GOOGLE_CLIENT_ID),
      googleClientId: GOOGLE_CLIENT_ID || null,
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/register") {
    const body = await parseJsonBody(req);
    const payload = cleanRegistrationPayload(body);

    const existingUser = await storageFindUserByEmail(payload.email);
    if (existingUser) {
      throw new ApiError(409, "Email is already registered.");
    }

    const passwordHash = hashPassword(payload.password);
    const user = await storageCreateUser({
      email: payload.email,
      passwordHash,
      displayName: payload.displayName,
    });

    const verificationCode = generateSixDigitCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS).toISOString();
    await storageCreateEmailVerificationCode({
      userId: user.id,
      code: verificationCode,
      expiresAt,
    });

    let emailDelivered = false;
    try {
      await sendVerificationCodeEmail({
        to: payload.email,
        code: verificationCode,
        expiresMinutes: ttlToMinutes(VERIFICATION_CODE_TTL_MS),
      });
      emailDelivered = true;
    } catch (error) {
      console.error(`Verification email delivery failed for ${payload.email}: ${error.message}`);
    }

    sendJson(res, 201, {
      verificationRequired: true,
      email: payload.email,
      emailDelivered,
      ...(EXPOSE_DEV_AUTH_CODES ? { devVerificationCode: verificationCode } : {}),
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/login") {
    const body = await parseJsonBody(req);
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required.");
    }

    const user = await storageFindUserByEmail(email);
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      throw new ApiError(401, "Invalid email or password.");
    }
    if (!user.emailVerified) {
      throw new ApiError(403, "Email is not verified. Verify your email first.");
    }

    sendJson(res, 200, createAuthResponse(user));
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/google") {
    if (!GOOGLE_CLIENT_ID) {
      throw new ApiError(503, "Google auth is not configured.");
    }

    const body = await parseJsonBody(req);
    const payload = cleanGoogleAuthPayload(body);
    const profile = await verifyGoogleIdToken(payload.idToken, { expectedAudience: GOOGLE_CLIENT_ID });

    let user = await storageFindUserByGoogleSub(profile.sub);
    if (!user) {
      const existingByEmail = await storageFindUserByEmail(profile.email);
      if (existingByEmail) {
        const linked = existingByEmail.googleSub
          ? existingByEmail
          : await storageLinkGoogleSub({ userId: existingByEmail.id, googleSub: profile.sub });
        user = linked;
        if (!user.emailVerified) {
          const verifiedUser = await storageMarkUserEmailVerified(user.id);
          if (verifiedUser) {
            user = verifiedUser;
          }
        }
      } else {
        user = await storageCreateGoogleUser({
          email: profile.email,
          displayName: profile.name || profile.email.split("@")[0] || "Member",
          googleSub: profile.sub,
        });
      }
    }

    sendJson(res, 200, createAuthResponse(user));
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/verify-email/request") {
    const body = await parseJsonBody(req);
    const payload = cleanEmailPayload(body);
    const user = await storageFindUserByEmail(payload.email);

    if (!user) {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (user.emailVerified) {
      sendJson(res, 200, { ok: true, alreadyVerified: true });
      return;
    }

    const verificationCode = generateSixDigitCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS).toISOString();
    await storageCreateEmailVerificationCode({
      userId: user.id,
      code: verificationCode,
      expiresAt,
    });

    try {
      await sendVerificationCodeEmail({
        to: payload.email,
        code: verificationCode,
        expiresMinutes: ttlToMinutes(VERIFICATION_CODE_TTL_MS),
      });
    } catch (error) {
      console.error(`Verification re-send failed for ${payload.email}: ${error.message}`);
      if (IS_PRODUCTION) {
        throw new ApiError(503, "Could not deliver verification email. Please try again.");
      }
    }

    sendJson(res, 200, {
      ok: true,
      verificationRequired: true,
      ...(EXPOSE_DEV_AUTH_CODES ? { devVerificationCode: verificationCode } : {}),
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/verify-email/confirm") {
    const body = await parseJsonBody(req);
    const payload = cleanVerifyEmailConfirmPayload(body);
    const match = await storageFindValidEmailVerificationCode(payload);
    if (!match) {
      throw new ApiError(400, "Invalid or expired verification code.");
    }

    await storageMarkUserEmailVerified(match.userId);
    await storageConsumeEmailVerificationCode(match.id);
    sendJson(res, 200, { ok: true, verified: true });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/password/forgot") {
    const body = await parseJsonBody(req);
    const payload = cleanEmailPayload(body);
    const user = await storageFindUserByEmail(payload.email);

    if (!user) {
      sendJson(res, 200, { ok: true });
      return;
    }

    const resetCode = generateSixDigitCode();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_CODE_TTL_MS).toISOString();
    await storageCreatePasswordResetCode({
      userId: user.id,
      code: resetCode,
      expiresAt,
    });

    try {
      await sendPasswordResetCodeEmail({
        to: payload.email,
        code: resetCode,
        expiresMinutes: ttlToMinutes(PASSWORD_RESET_CODE_TTL_MS),
      });
    } catch (error) {
      console.error(`Password reset email delivery failed for ${payload.email}: ${error.message}`);
      if (IS_PRODUCTION) {
        throw new ApiError(503, "Could not deliver password reset email. Please try again.");
      }
    }

    sendJson(res, 200, {
      ok: true,
      ...(EXPOSE_DEV_AUTH_CODES ? { devResetCode: resetCode } : {}),
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/password/reset") {
    const body = await parseJsonBody(req);
    const payload = cleanResetPasswordPayload(body);
    const match = await storageFindValidPasswordResetCode(payload);
    if (!match) {
      throw new ApiError(400, "Invalid or expired reset code.");
    }

    const passwordHash = hashPassword(payload.newPassword);
    await storageUpdateUserPassword({
      userId: match.userId,
      passwordHash,
    });
    await storageConsumePasswordResetCode(match.id);
    sendJson(res, 200, { ok: true, passwordUpdated: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/auth/me") {
    const user = await authenticateRequest(req, { optional: false });
    sendJson(res, 200, { user });
    return;
  }

  if (req.method === "GET" && pathname === "/api/account/settings") {
    const user = await authenticateRequest(req, { optional: false });
    sendJson(res, 200, {
      settings: {
        aboutMe: String(user.aboutMe || ""),
      },
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/account/settings") {
    const actor = await authenticateRequest(req, { optional: false });
    const body = await parseJsonBody(req);
    const payload = cleanAccountSettingsPayload(body);
    const updatedUser = await storageUpdateUserAboutMe({
      userId: actor.id,
      aboutMe: payload.aboutMe,
    });
    if (!updatedUser) {
      throw new ApiError(404, "User not found.");
    }
    sendJson(res, 200, { user: sanitizeUser(updatedUser) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/bootstrap") {
    const mode = parseMode(searchParams.get("mode"));
    const payload = await storageGetBootstrap(mode);
    sendJson(res, 200, payload);
    return;
  }

  if (req.method === "GET" && pathname === "/api/feed") {
    const mode = parseMode(searchParams.get("mode"));
    const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit")) || 8));
    const feed = await storageGetFeed(mode, limit);
    sendJson(res, 200, { feed });
    return;
  }

  if (req.method === "GET" && pathname === "/api/requests") {
    const modeParam = searchParams.get("mode");
    const mode = modeParam ? parseMode(modeParam) : null;
    const createdBy = String(searchParams.get("createdBy") || "").trim();
    const participantId = String(searchParams.get("participantId") || "").trim();
    let requests = await storageListRequests(mode);
    if (participantId) {
      requests = requests.filter(
        (entry) => String(entry.createdBy || "") === participantId || String(entry.matchedUserId || "") === participantId
      );
    } else if (createdBy) {
      requests = requests.filter((entry) => entry.createdBy === createdBy);
    }
    sendJson(res, 200, { requests });
    return;
  }

  if (req.method === "POST" && pathname === "/api/requests") {
    const actor = await authenticateRequest(req, { optional: !AUTH_REQUIRED });
    if (actor) {
      requireVerifiedUser(actor);
    }
    const body = await parseJsonBody(req);
    const payload = cleanRequestPayload(body);
    const created = await storageCreateRequest(payload, actor ? actor.id : null);
    sendJson(res, 201, created);
    return;
  }

  if (req.method === "GET" && pathname === "/api/posts") {
    const viewer = await authenticateRequest(req, { optional: true });
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
    const posts = await storageListPosts({ limit, offset, viewer });
    sendJson(res, 200, { posts, limit, offset });
    return;
  }

  if (req.method === "POST" && pathname === "/api/posts") {
    const actor = await authenticateRequest(req, { optional: false });
    requireVerifiedUser(actor);
    const body = await parseJsonBody(req);
    const payload = cleanPostPayload(body);

    const post = await storageCreatePost({
      userId: actor.id,
      text: payload.text,
      tags: payload.tags,
      visibility: payload.visibility,
    });
    sendJson(res, 201, { post });
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/posts/")) {
    const userId = pathname.slice("/api/posts/".length).trim();
    if (!userId) {
      throw new ApiError(400, "userId is required.");
    }
    const viewer = await authenticateRequest(req, { optional: true });
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
    const posts = await storageListPosts({ userId, limit, offset, viewer });
    sendJson(res, 200, { userId, posts, limit, offset });
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/profile/")) {
    const userId = pathname.slice("/api/profile/".length).trim();
    if (!userId) {
      throw new ApiError(400, "userId is required.");
    }
    const profile = await storageGetPublicProfile(userId);
    if (!profile) {
      throw new ApiError(404, "Profile not found.");
    }
    sendJson(res, 200, { profile });
    return;
  }

  if (req.method === "GET" && pathname === "/api/requests/join-requests") {
    const actor = await authenticateRequest(req, { optional: false });
    requireVerifiedUser(actor);
    const requestId = String(searchParams.get("requestId") || "").trim();
    if (!requestId) {
      throw new ApiError(400, "requestId is required.");
    }

    const request = await storageFindRequestById(requestId);
    if (!request) {
      throw new ApiError(404, "Request not found.");
    }
    if (actor.role !== "admin" && String(request.createdBy || "") !== String(actor.id)) {
      throw new ApiError(403, "Only the request poster can review join requests.");
    }

    const joinRequests = await storageListPendingJoinRequests(requestId);
    sendJson(res, 200, { request, joinRequests });
    return;
  }

  if (req.method === "GET" && pathname === "/api/requests/session") {
    const actor = await authenticateRequest(req, { optional: false });
    requireVerifiedUser(actor);

    const requestId = String(searchParams.get("requestId") || "").trim();
    if (!requestId) {
      throw new ApiError(400, "requestId is required.");
    }

    const request = await storageFindRequestById(requestId);
    if (!request) {
      throw new ApiError(404, "Request not found.");
    }

    requireRequestAccess(actor, request);
    sendJson(res, 200, { request });
    return;
  }

  if (req.method === "GET" && pathname === "/api/matches") {
    const requestId = String(searchParams.get("requestId") || "").trim();
    if (!requestId) {
      throw new ApiError(400, "requestId is required.");
    }

    const request = await storageFindRequestById(requestId);
    if (!request) {
      throw new ApiError(404, "Request not found.");
    }

    const matches = await storageGetMatchesForRequest(request);
    sendJson(res, 200, { requestId, matches });
    return;
  }

  if (req.method === "POST" && pathname === "/api/actions/ping") {
    const actor = await authenticateRequest(req, { optional: !AUTH_REQUIRED });
    if (actor) {
      requireVerifiedUser(actor);
    }
    const body = await parseJsonBody(req);

    const requestId = String(body.requestId || "").trim();
    const companionId = String(body.companionId || "").trim();

    if (!requestId || !companionId) {
      throw new ApiError(400, "requestId and companionId are required.");
    }

    const event = await storageCreateEvent({
      type: "ping",
      requestId,
      companionId,
      actorUserId: actor ? actor.id : null,
    });

    sendJson(res, 201, { event });
    return;
  }

  if (req.method === "POST" && pathname === "/api/actions/join") {
    const actor = await authenticateRequest(req, { optional: false });
    requireVerifiedUser(actor);
    const body = await parseJsonBody(req);
    const payload = cleanJoinRequestPayload(body);
    const requestId = payload.requestId;

    const targetRequest = await storageFindRequestById(requestId);
    if (!targetRequest) {
      throw new ApiError(404, "Request not found.");
    }
    if (!targetRequest.createdBy) {
      throw new ApiError(409, "This request cannot be joined right now.");
    }
    if (targetRequest.createdBy === actor.id) {
      throw new ApiError(400, "You cannot join your own request.");
    }
    if (targetRequest.status === "matched") {
      if (targetRequest.matchedUserId === actor.id) {
        const messages = await storageListMessagesForRequest(targetRequest.id);
        sendJson(res, 200, { request: targetRequest, messages, alreadyMatched: true });
        return;
      }
      throw new ApiError(409, "This request has been filled or the poster passed.");
    }
    if (targetRequest.status !== "open") {
      throw new ApiError(409, "This request has been filled or the poster passed.");
    }

    const joinRequest = await storageCreateJoinRequest({
      requestId,
      joinerUserId: actor.id,
      introMessage: payload.introMessage,
    });
    if (!joinRequest) {
      throw new ApiError(409, "Could not send join request.");
    }

    sendJson(res, 201, {
      request: targetRequest,
      joinRequest,
      pendingReview: true,
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/actions/join/decline") {
    const actor = await authenticateRequest(req, { optional: false });
    requireVerifiedUser(actor);
    const body = await parseJsonBody(req);
    const requestId = String(body.requestId || "").trim();
    const joinUserId = String(body.joinUserId || "").trim();

    if (!requestId || !joinUserId) {
      throw new ApiError(400, "requestId and joinUserId are required.");
    }

    const request = await storageFindRequestById(requestId);
    if (!request) {
      throw new ApiError(404, "Request not found.");
    }
    if (actor.role !== "admin" && String(request.createdBy || "") !== String(actor.id)) {
      throw new ApiError(403, "Only the request poster can decline join requests.");
    }
    if (request.status !== "open") {
      throw new ApiError(409, "This request has been filled or the poster passed.");
    }

    const declined = await storageDeclineJoinRequest({
      requestId,
      joinerUserId: joinUserId,
      actorUserId: actor.id,
    });
    if (!declined) {
      throw new ApiError(404, "Join request not found.");
    }

    sendJson(res, 200, { declined: true });
    return;
  }

  if (req.method === "POST" && pathname === "/api/actions/accept") {
    const actor = await authenticateRequest(req, { optional: !AUTH_REQUIRED });
    if (actor) {
      requireVerifiedUser(actor);
    }
    const body = await parseJsonBody(req);
    const requestId = String(body.requestId || "").trim();
    const joinUserId = String(body.joinUserId || "").trim();
    const companionId = String(body.companionId || "").trim();

    if (!requestId) {
      throw new ApiError(400, "requestId is required.");
    }

    const request = await storageFindRequestById(requestId);
    if (!request) {
      throw new ApiError(404, "Request not found.");
    }
    if (joinUserId) {
      if (!actor || (actor.role !== "admin" && String(request.createdBy || "") !== String(actor.id))) {
        throw new ApiError(403, "Only the request poster can accept join requests.");
      }
      if (request.status !== "open") {
        throw new ApiError(409, "This request has been filled or the poster passed.");
      }

      const acceptedJoin = await storageAcceptJoinRequest({
        requestId,
        joinerUserId: joinUserId,
        actorUserId: actor.id,
      });
      if (!acceptedJoin) {
        throw new ApiError(409, "Could not accept this join request.");
      }

      const owner = await storageFindUserById(acceptedJoin.request.createdBy);
      const joiner = await storageFindUserById(joinUserId);
      const ownerName = owner ? owner.displayName || owner.email : "Request owner";
      const peerName = joiner ? joiner.displayName || joiner.email : "Companion";
      await seedUserMatchConversation({
        request: acceptedJoin.request,
        ownerName,
        peerName,
      });

      const messages = await storageListMessagesForRequest(requestId);

      // Broadcast match_confirmed via WebSocket to both users
      broadcastMatchConfirmed({
        requestId,
        ownerUserId: String(acceptedJoin.request.createdBy),
        matchedUserId: joinUserId,
        ownerName,
        matchedName: peerName,
      });

      sendJson(res, 200, {
        ...acceptedJoin,
        messages,
      });
      return;
    }

    if (!companionId) {
      throw new ApiError(400, "companionId is required.");
    }
    if (request.status !== "open") {
      throw new ApiError(409, "This request is no longer open for matching.");
    }

    const companion = await storageFindCompanionById(companionId);
    if (!companion) {
      throw new ApiError(404, "Companion not found.");
    }
    if (!Array.isArray(companion.supports) || !companion.supports.includes(request.mode)) {
      throw new ApiError(400, "Selected companion does not support this lane.");
    }
    if (request.verifiedOnly && !companion.verified) {
      throw new ApiError(400, "Selected companion is not verified for this request.");
    }

    const accepted = await storageAcceptMatch({
      requestId,
      companionId,
      actorUserId: actor ? actor.id : null,
    });

    if (!accepted) {
      throw new ApiError(409, "Could not complete accept flow. Request may have been matched already.");
    }

    const messages = await storageListMessagesForRequest(requestId);

    // Broadcast match_confirmed via WebSocket
    const compOwner = await storageFindUserById(accepted.request.createdBy);
    const compOwnerName = compOwner ? (compOwner.displayName || compOwner.email) : "Request owner";
    broadcastMatchConfirmed({
      requestId,
      ownerUserId: String(accepted.request.createdBy),
      matchedUserId: String(accepted.request.matchedUserId),
      ownerName: compOwnerName,
      matchedName: companion.name || "Companion",
    });

    sendJson(res, 200, {
      ...accepted,
      messages,
    });
    return;
  }

  if (req.method === "POST" && pathname.match(/^\/api\/requests\/[^/]+\/complete$/)) {
    const actor = await authenticateRequest(req, { optional: false });
    requireVerifiedUser(actor);
    const parts = pathname.split("/");
    const requestId = parts[3];
    const body = await parseJsonBody(req);
    const outcome = String(body.outcome || "").trim();

    if (!requestId || !outcome) {
      throw new ApiError(400, "requestId and outcome are required.");
    }

    const request = await storageFindRequestById(requestId);
    if (!request) {
      throw new ApiError(404, "Request not found.");
    }
    requireRequestAccess(actor, request);

    const updated = await storageCompleteRequest({ requestId, userId: actor.id, outcome });
    if (!updated) {
      throw new ApiError(400, "Could not complete this request. You may not be a participant.");
    }

    sendJson(res, 200, { request: updated });
    return;
  }

  if (req.method === "POST" && pathname.match(/^\/api\/requests\/[^/]+\/rate$/)) {
    const actor = await authenticateRequest(req, { optional: false });
    requireVerifiedUser(actor);
    const parts = pathname.split("/");
    const requestId = parts[3];
    const body = await parseJsonBody(req);
    if (typeof body.meetAgain !== "boolean") {
      throw new ApiError(400, "meetAgain boolean is required.");
    }
    const meetAgain = body.meetAgain;

    const request = await storageFindRequestById(requestId);
    if (!request) {
      throw new ApiError(404, "Request not found.");
    }
    requireRequestAccess(actor, request);

    const updated = await storageRateCompanion({ requestId, userId: actor.id, meetAgain });
    if (!updated) {
      throw new ApiError(400, "Could not rate. You may not be a participant.");
    }

    sendJson(res, 200, { request: updated });
    return;
  }

  if (req.method === "POST" && pathname === "/api/checkins") {
    const actor = await authenticateRequest(req, { optional: !AUTH_REQUIRED });
    if (actor) {
      requireVerifiedUser(actor);
    }
    const body = await parseJsonBody(req);

    const requestId = String(body.requestId || "").trim();
    const action = String(body.action || "").trim();

    if (!requestId || !["start", "stop"].includes(action)) {
      throw new ApiError(400, "requestId and action(start|stop) are required.");
    }

    const event = await storageCreateEvent({
      type: `checkin-${action}`,
      requestId,
      actorUserId: actor ? actor.id : null,
    });

    sendJson(res, 201, { event });
    return;
  }

  if (req.method === "GET" && pathname === "/api/messages") {
    const actor = await authenticateRequest(req, { optional: false });
    requireVerifiedUser(actor);

    const requestId = String(searchParams.get("requestId") || "").trim();
    if (!requestId) {
      throw new ApiError(400, "requestId is required.");
    }

    const request = await storageFindRequestById(requestId);
    if (!request) {
      throw new ApiError(404, "Request not found.");
    }

    requireRequestAccess(actor, request);
    const messages = await storageListMessagesForRequest(requestId);
    sendJson(res, 200, { requestId, messages });
    return;
  }

  if (req.method === "POST" && pathname === "/api/messages") {
    const actor = await authenticateRequest(req, { optional: false });
    requireVerifiedUser(actor);
    const body = await parseJsonBody(req);
    const payload = cleanMessagePayload(body);

    const request = await storageFindRequestById(payload.requestId);
    if (!request) {
      throw new ApiError(404, "Request not found.");
    }
    requireRequestAccess(actor, request);

    if (request.status !== "matched" || !request.matchedUserId) {
      throw new ApiError(409, "Messaging is available after a real user join is confirmed.");
    }

    const message = await storageCreateMessage({
      requestId: request.id,
      senderType: "user",
      senderUserId: actor.id,
      senderName: actor.displayName || actor.email,
      content: payload.content,
    });

    const messages = await storageListMessagesForRequest(request.id);

    // Broadcast new chat message via WebSocket
    broadcastChatMessage(
      String(request.createdBy),
      String(request.matchedUserId),
      message
    );

    sendJson(res, 201, { message, messages });
    return;
  }

  if (req.method === "POST" && pathname === "/api/reports") {
    const reporter = await authenticateRequest(req, { optional: false });
    requireVerifiedUser(reporter);
    const body = await parseJsonBody(req);
    const payload = cleanReportPayload(body);

    const report = await storageCreateReport({
      reporterUserId: reporter.id,
      requestId: payload.requestId,
      companionId: payload.companionId,
      reason: payload.reason,
      details: payload.details,
    });

    sendJson(res, 201, { report });
    return;
  }

  if (req.method === "GET" && pathname === "/api/reports") {
    const user = await authenticateRequest(req, { optional: false });
    requireAdmin(user);

    const status = searchParams.get("status");
    const reports = await storageListReports(status || null);
    sendJson(res, 200, { reports });
    return;
  }

  if (req.method === "POST" && pathname === "/api/reports/resolve") {
    const user = await authenticateRequest(req, { optional: false });
    requireAdmin(user);

    const body = await parseJsonBody(req);
    const reportId = body.reportId;
    const status = String(body.status || "").trim();
    const resolutionNote = String(body.resolutionNote || "").trim();

    if (!reportId || !["reviewing", "resolved", "dismissed"].includes(status)) {
      throw new ApiError(400, "reportId and valid status(reviewing|resolved|dismissed) are required.");
    }

    const report = await storageResolveReport({
      reportId,
      status,
      resolutionNote,
      resolverUserId: user.id,
    });

    if (!report) {
      throw new ApiError(404, "Report not found.");
    }

    sendJson(res, 200, { report });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/overview") {
    const user = await authenticateRequest(req, { optional: false });
    requireAdmin(user);

    const overview = await storageGetAdminOverview();
    sendJson(res, 200, { overview });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/users") {
    const user = await authenticateRequest(req, { optional: false });
    requireAdmin(user);

    const users = await storageListUsers();
    sendJson(res, 200, { users: users.map(sanitizeUser) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/users/role") {
    const actor = await authenticateRequest(req, { optional: false });
    requireAdmin(actor);

    const body = await parseJsonBody(req);
    const payload = cleanRolePayload(body);
    const users = await storageListUsers();
    const target = users.find((entry) => entry.id === payload.userId);
    if (!target) {
      throw new ApiError(404, "User not found.");
    }

    if (target.role === "admin" && payload.role === "member") {
      const adminCount = users.filter((entry) => entry.role === "admin").length;
      if (adminCount <= 1) {
        throw new ApiError(409, "At least one admin must remain on the platform.");
      }
    }

    const updated = await storageUpdateUserRole(payload);
    if (!updated) {
      throw new ApiError(404, "User not found.");
    }
    sendJson(res, 200, { user: sanitizeUser(updated) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/requests") {
    const user = await authenticateRequest(req, { optional: false });
    requireAdmin(user);

    const modeParam = searchParams.get("mode");
    const mode = modeParam ? parseMode(modeParam) : null;
    const requests = await storageListRequests(mode);
    sendJson(res, 200, { requests });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/requests/status") {
    const user = await authenticateRequest(req, { optional: false });
    requireAdmin(user);

    const body = await parseJsonBody(req);
    const payload = cleanRequestStatusPayload(body);
    const updated = await storageUpdateRequestStatus(payload);
    if (!updated) {
      throw new ApiError(404, "Request not found.");
    }

    sendJson(res, 200, { request: updated });
    return;
  }

  throw new ApiError(404, "API route not found.");
}

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `localhost:${PORT}`;
    const url = new URL(req.url, `http://${host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    await serveStatic(res, url.pathname);
  } catch (error) {
    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message = error instanceof ApiError ? error.message : error.message || "Unexpected server error.";
    sendJson(res, statusCode, { error: message });
  }
});

async function startServer() {
  if (AUTH_REQUIRED && TOKEN_SECRET === "dev-token-secret-change-before-production") {
    console.warn("AUTH_REQUIRED is enabled but TOKEN_SECRET is using default value. Set a secure secret.");
  }
  if (IS_PRODUCTION && EXPOSE_DEV_AUTH_CODES) {
    throw new Error("EXPOSE_DEV_AUTH_CODES must be false in production.");
  }
  if (IS_PRODUCTION && !REAL_EMAIL_PROVIDERS.has(EMAIL_PROVIDER)) {
    throw new Error("Production requires EMAIL_PROVIDER=resend|postmark|sendgrid.");
  }
  if (IS_PRODUCTION && !String(process.env.EMAIL_FROM || "").trim()) {
    throw new Error("EMAIL_FROM is required in production.");
  }

  await initStorage();

  if (BOOTSTRAP_ADMIN_EMAIL) {
    const promoted = await storageEnsureAdminByEmail(BOOTSTRAP_ADMIN_EMAIL);
    if (promoted) {
      console.log(`Bootstrap admin ensured for ${BOOTSTRAP_ADMIN_EMAIL}`);
    }
  }

  console.log(`Email provider: ${EMAIL_PROVIDER}`);

  initWebSocket(server, {
    verifyToken,
    tokenSecret: TOKEN_SECRET,
    findUserById: storageFindUserById,
  });
  console.log("WebSocket server initialized on /ws");

  server.listen(PORT, () => {
    console.log(`Tag Along backend running on http://localhost:${PORT}`);
  });
}

async function gracefulShutdown(signal) {
  console.log(`${signal} received. Shutting down server...`);
  server.close(async () => {
    try {
      await shutdownStorage();
    } finally {
      process.exit(0);
    }
  });
}

process.on("SIGINT", () => {
  gracefulShutdown("SIGINT").catch(() => process.exit(1));
});

process.on("SIGTERM", () => {
  gracefulShutdown("SIGTERM").catch(() => process.exit(1));
});

startServer().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
