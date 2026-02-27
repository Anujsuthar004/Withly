const crypto = require("node:crypto");

const HASH_ALGO = "scrypt";
const HASH_KEYLEN = 64;

function toBase64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = `${normalized}${"=".repeat(paddingLength)}`;
  return Buffer.from(padded, "base64");
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function hashPassword(password) {
  const raw = String(password || "");
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(raw, salt, HASH_KEYLEN).toString("hex");
  return `${HASH_ALGO}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  const raw = String(password || "");
  const parts = String(storedHash || "").split("$");

  if (parts.length !== 3) {
    return false;
  }

  const [algo, salt, hash] = parts;
  if (algo !== HASH_ALGO || !salt || !hash) {
    return false;
  }

  const candidate = crypto.scryptSync(raw, salt, HASH_KEYLEN).toString("hex");
  return safeCompare(hash, candidate);
}

function signToken(payload, secret, ttlSeconds = 604800) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + Number(ttlSeconds || 0),
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(fullPayload));
  const message = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", String(secret || ""))
    .update(message)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${message}.${signature}`;
}

function verifyToken(token, secret) {
  const raw = String(token || "").trim();
  const parts = raw.split(".");

  if (parts.length !== 3) {
    throw new Error("Malformed token.");
  }

  const [encodedHeader, encodedPayload, incomingSignature] = parts;
  const message = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac("sha256", String(secret || ""))
    .update(message)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  if (!safeCompare(expectedSignature, incomingSignature)) {
    throw new Error("Invalid token signature.");
  }

  let payload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload).toString("utf-8"));
  } catch {
    throw new Error("Invalid token payload.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || now >= Number(payload.exp)) {
    throw new Error("Token expired.");
  }

  return payload;
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
};
