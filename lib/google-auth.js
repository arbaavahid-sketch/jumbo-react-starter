// Service-account access to Google Drive (read-only). Share the planning file or folder with
// GOOGLE_SERVICE_ACCOUNT_EMAIL as Viewer; no OAuth screen or Apps Script is involved.
import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

// Rebuilds a clean PEM from whatever was pasted into the env var: literal "\n", real newlines,
// surrounding quotes or a clipped BEGIN/END line all normalise to the same base64 body.
export function normalizePrivateKey(raw) {
  const body = raw
    .replace(/\\n/g, "\n")
    .replace(/-*\s*(BEGIN|END) PRIVATE KEY\s*-*/gi, "")
    .replace(/[^A-Za-z0-9+/=]/g, "");
  const lines = body.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----\n`;
}

export function serviceAccountFromEnv(env = process.env) {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const raw = env.GOOGLE_PRIVATE_KEY?.trim();
  if (!email || !raw) return null;
  return { email, privateKey: normalizePrivateKey(raw) };
}

const b64url = (input) =>
  Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

let cached = null;

// Exchanges a signed JWT for a short-lived access token, cached in-process until near expiry.
export async function getAccessToken(sa, fetchImpl = fetch) {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.email === sa.email && cached.expiresAt - 60 > now) return cached.token;
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: sa.email, scope: SCOPES, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${b64url(signer.sign(sa.privateKey))}`;
  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  cached = { email: sa.email, token: json.access_token, expiresAt: now + json.expires_in };
  return json.access_token;
}

export function resetTokenCache() {
  cached = null;
}

export async function googleFetch(token, url, fetchImpl = fetch) {
  const res = await fetchImpl(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok)
    throw new Error(`Google API ${res.status} for ${url.split("?")[0]}: ${await res.text()}`);
  return res;
}
