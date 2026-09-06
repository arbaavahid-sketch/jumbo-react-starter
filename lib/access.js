import { AUTH_COOKIE, verifySession } from "./auth";
import { PUBLIC_SHARE_MAP } from "./publicShareMap";

export function shareScope(slug) {
  return typeof slug === "string" && Object.hasOwn(PUBLIC_SHARE_MAP, slug) ? PUBLIC_SHARE_MAP[slug] : null;
}
export function canShareRead(scope, pathname) {
  if (!scope) return false;
  if (["/api/data", "/api/news", "/api/news-en", "/api/rates", "/api/tgju-rates", "/api/nima"].includes(pathname)) return true;
  return (scope === "TECHNICAL" && pathname === "/api/technical") ||
    (scope === "SUPPLY" && ["/api/supply", "/api/supply-history"].includes(pathname));
}
export function requireReadAccess(req, res, pathname) {
  res.setHeader("Cache-Control", "private, no-store");
  const slug = req.query?.share;
  // A share request stays scoped even when a manager is signed in.
  if (slug !== undefined) {
    const scope = shareScope(slug);
    if (req.method === "GET" && canShareRead(scope, pathname)) return { scope };
  } else if (verifySession(req.cookies?.[AUTH_COOKIE])) return { scope: null };
  res.status(401).json({ error: "Unauthorized" });
  return null;
}
const groupKey = (value) => {
  const key = String(value || "").replace(/group/gi, "").replace(/[^a-z0-9]/gi, "").toUpperCase();
  return ({ 1: "A", 2: "B", 3: "C" })[key] || key;
};
export function scopePayload(payload, scope) {
  if (!scope) return payload;
  const messages = payload.ceo_messages || {};
  if (scope === "TECHNICAL") return {
    ceo_messages: Object.fromEntries(Object.entries(messages).filter(([key]) => ["TECH", "TECHNICAL"].includes(key))),
    technical_queue: payload.technical_queue || [],
  };
  if (scope === "SUPPLY") return {
    ceo_messages: Object.fromEntries(Object.entries(messages).filter(([key]) => key.toUpperCase() === "SUPPLY")),
  };
  if (!["A", "B", "C"].includes(scope)) return {};
  const result = {};
  for (const key of ["weekly_reports", "deals_exec", "ar_list", "mega_deals_details", "total_deals_details", "weekly_trips_details", "group_offers"]) {
    result[key] = (payload[key] || []).filter((row) => groupKey(row.group_key || row.group) === scope);
  }
  result.groups = (payload.groups || []).filter((row) => groupKey(row.key) === scope);
  for (const key of ["members", "latest", "ceo_messages", "history"]) {
    result[key] = Object.fromEntries(Object.entries(payload[key] || {}).filter(([group]) => groupKey(group) === scope));
  }
  // Logistics has no ownership field; do not expose it through group links.
  result.logistic_aa = [];
  return result;
}
