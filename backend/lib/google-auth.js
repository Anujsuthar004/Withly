const crypto = require("node:crypto");

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

const jwksCache = {
  keys: [],
  expiresAt: 0,
};

function decodeBase64Url(value) {
  const normalized = String(value || "")
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(String(value || "").length / 4) * 4, "=");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function parseJwt(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid Google token format.");
  }

  let header;
  let payload;
  try {
    header = JSON.parse(decodeBase64Url(parts[0]));
    payload = JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    throw new Error("Invalid Google token payload.");
  }

  return {
    header,
    payload,
    signature: parts[2],
    signingInput: `${parts[0]}.${parts[1]}`,
  };
}

function parseMaxAge(cacheControl) {
  const value = String(cacheControl || "");
  const match = value.match(/max-age=(\d+)/i);
  if (!match) {
    return 300;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
}

async function fetchGoogleJwks() {
  const now = Date.now();
  if (jwksCache.keys.length > 0 && now < jwksCache.expiresAt) {
    return jwksCache.keys;
  }

  const response = await fetch(GOOGLE_JWKS_URL);
  if (!response.ok) {
    throw new Error("Could not fetch Google signing keys.");
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.keys)) {
    throw new Error("Invalid Google signing key payload.");
  }

  const maxAgeSeconds = parseMaxAge(response.headers.get("cache-control"));
  jwksCache.keys = payload.keys;
  jwksCache.expiresAt = now + maxAgeSeconds * 1000;

  return jwksCache.keys;
}

function verifySignature(signingInput, signature, jwk) {
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(signingInput);
  verifier.end();

  const keyObject = crypto.createPublicKey({
    key: jwk,
    format: "jwk",
  });

  const signatureBuffer = Buffer.from(
    String(signature)
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(String(signature).length / 4) * 4, "="),
    "base64"
  );

  return verifier.verify(keyObject, signatureBuffer);
}

function audMatches(audienceClaim, expectedAudience) {
  if (Array.isArray(audienceClaim)) {
    return audienceClaim.includes(expectedAudience);
  }
  return String(audienceClaim || "") === expectedAudience;
}

async function verifyGoogleIdToken(idToken, { expectedAudience }) {
  if (!expectedAudience) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }

  const token = parseJwt(idToken);
  if (token.header.alg !== "RS256") {
    throw new Error("Unsupported Google token algorithm.");
  }

  const keys = await fetchGoogleJwks();
  const key = keys.find((entry) => entry.kid === token.header.kid);
  if (!key) {
    throw new Error("Google signing key not found for token.");
  }

  if (!verifySignature(token.signingInput, token.signature, key)) {
    throw new Error("Google token signature verification failed.");
  }

  const payload = token.payload;
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!ISSUERS.has(String(payload.iss || ""))) {
    throw new Error("Invalid Google token issuer.");
  }
  if (!audMatches(payload.aud, expectedAudience)) {
    throw new Error("Google token audience mismatch.");
  }
  if (Number(payload.exp || 0) <= nowSeconds) {
    throw new Error("Google token has expired.");
  }
  if (payload.nbf && Number(payload.nbf) > nowSeconds) {
    throw new Error("Google token is not yet valid.");
  }
  if (!payload.sub) {
    throw new Error("Google token missing subject.");
  }
  if (!payload.email || !payload.email_verified) {
    throw new Error("Google account email is missing or not verified.");
  }

  return {
    sub: String(payload.sub),
    email: String(payload.email).toLowerCase(),
    name: payload.name ? String(payload.name) : "",
    picture: payload.picture ? String(payload.picture) : "",
  };
}

module.exports = {
  verifyGoogleIdToken,
};
