import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE = "dashboard_auth";
export const SESSION_SECONDS = 8 * 60 * 60;
export function authConfigured() {
  return Boolean(process.env.LOGIN_USER && process.env.LOGIN_PASS && process.env.AUTH_SECRET?.length >= 32);
}
export function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const digest = (value) => createHmac("sha256", "credential-comparison").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}
function signature(payload) {
  return createHmac("sha256", process.env.AUTH_SECRET)
    .update(`${process.env.LOGIN_USER}\0${process.env.LOGIN_PASS}\0${payload}`).digest("base64url");
}
export function createSession(now = Date.now()) {
  if (!authConfigured()) throw new Error("Authentication is not configured");
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + SESSION_SECONDS,
    nonce: randomBytes(24).toString("base64url") })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}
export function verifySession(token, now = Date.now()) {
  if (!authConfigured() || typeof token !== "string" || token.length > 1024) return false;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined || !constantTimeEqual(sig, signature(payload))) return false;
  try {
    const { exp, nonce } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return Number.isSafeInteger(exp) && exp > Math.floor(now / 1000) &&
      exp <= Math.floor(now / 1000) + SESSION_SECONDS && typeof nonce === "string" && nonce.length > 0;
  } catch { return false; }
}
