import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createSession, verifySession, SESSION_SECONDS } from "../lib/auth";
import { requireReadAccess, scopePayload, shareScope, canShareRead } from "../lib/access";
import { PUBLIC_SHARE_MAP } from "../lib/publicShareMap";
import { shareRequestKey } from "../lib/share-client";
import login from "../pages/api/login";
import dataHandler from "../pages/api/data";
import ceoHandler from "../pages/api/ceo-message";
import { proxy } from "../proxy";
import { NextRequest } from "next/server";

const slug = Object.keys(PUBLIC_SHARE_MAP).find((key) => PUBLIC_SHARE_MAP[key] === "A");
const response = () => ({ setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn(), end: vi.fn() });
beforeEach(() => {
  vi.stubEnv("LOGIN_USER", "test-user");
  vi.stubEnv("LOGIN_PASS", "test-password");
  vi.stubEnv("AUTH_SECRET", "a".repeat(64));
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("signed sessions", () => {
  it("accepts valid sessions, rejects expired, forged and malformed cookies", () => {
    const now = Date.now();
    const token = createSession(now);
    expect(verifySession(token, now)).toBe(true);
    for (const forged of ["ok", "", undefined, token + "x", token + ".extra", "x.y"]) expect(verifySession(forged, now)).toBe(false);
    expect(verifySession(token, now + SESSION_SECONDS * 1000)).toBe(false);
    const [payload, sig] = token.split(".");
    const altered = JSON.parse(Buffer.from(payload, "base64url").toString());
    altered.exp += 3600;
    expect(verifySession(`${Buffer.from(JSON.stringify(altered)).toString("base64url")}.${sig}`, now)).toBe(false);
  });
  it("invalidates sessions after credentials or secret change", () => {
    const token = createSession();
    vi.stubEnv("LOGIN_PASS", "changed");
    expect(verifySession(token)).toBe(false);
    vi.stubEnv("AUTH_SECRET", "");
    expect(verifySession(token)).toBe(false);
    expect(() => createSession()).toThrow();
  });
  it("issues a signed HttpOnly cookie only for configured credentials", () => {
    const res = response();
    login({ method: "POST", body: { username: "test-user", password: "test-password" } }, res);
    const cookie = res.setHeader.mock.calls.find(([key]) => key === "Set-Cookie")[1];
    expect(cookie).toContain("HttpOnly");
    expect(verifySession(cookie.split(";")[0].slice("dashboard_auth=".length))).toBe(true);
    const denied = response();
    login({ method: "POST", body: { username: "test-user", password: "wrong" } }, denied);
    expect(denied.status).toHaveBeenCalledWith(401);
    vi.stubEnv("LOGIN_PASS", "");
    const missing = response();
    login({ method: "POST", body: {} }, missing);
    expect(missing.status).toHaveBeenCalledWith(503);
  });
});

describe("API access boundaries", () => {
  it("rejects anonymous data reads and forged message writes before any fetch", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    for (const handler of [dataHandler, ceoHandler]) {
      const res = response();
      await handler({ method: "POST", cookies: { dashboard_auth: "ok" }, query: {} }, res);
      expect(res.status).toHaveBeenCalledWith(401);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it("limits public tokens to their endpoints and read-only requests", () => {
    expect(shareScope("toString")).toBeNull();
    expect(shareScope([slug])).toBeNull();
    expect(canShareRead("A", "/api/technical")).toBe(false);
    expect(canShareRead("TECHNICAL", "/api/technical")).toBe(true);
    expect(canShareRead("SUPPLY", "/api/supply-history")).toBe(true);
    expect(canShareRead("A", "/api/ceo-message")).toBe(false);
    const req = { method: "GET", cookies: { dashboard_auth: createSession() }, query: { share: slug } };
    expect(requireReadAccess(req, response(), "/api/data")).toEqual({ scope: "A" });
    expect(requireReadAccess({ ...req, method: "POST" }, response(), "/api/data")).toBeNull();
    expect(requireReadAccess({ ...req, query: { share: "bad" } }, response(), "/api/data")).toBeNull();
  });
  it("protects routes and allows the exact shared API", () => {
    const request = (path, cookie) => new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie: `dashboard_auth=${cookie}` } : {} });
    expect(proxy(request("/api/data")).status).toBe(401);
    expect(proxy(request("/admin", "ok")).status).toBe(307);
    expect(proxy(request("/admin", createSession())).status).toBe(200);
    expect(proxy(request(`/api/data?share=${slug}`)).status).toBe(200);
    expect(proxy(request(`/api/data.test?share=${slug}`)).status).toBe(401);
    expect(proxy(request(`/api/supply?share=${slug}`)).status).toBe(401);
  });
  it("removes other groups, unowned logistics, and unknown fields from public responses", () => {
    const payload = { groups: [{ key: "A" }, { key: "B" }], weekly_reports: [{ group: "A" }, { group: "B" }],
      members: { A: [1], B: [2] }, latest: { A: {}, B: {} }, ceo_messages: { A: "a", B: "b", TECH: "t", SUPPLY: "s" },
      group_offers: [{ group_key: "A" }, { group_key: "B" }], logistic_aa: [{ secret: true }], internal: "private", technical_queue: [1] };
    const result = scopePayload(payload, "A");
    expect(result.groups).toEqual([{ key: "A" }]);
    expect(result.weekly_reports).toEqual([{ group: "A" }]);
    expect(result.members).toEqual({ A: [1] });
    expect(result.group_offers).toEqual([{ group_key: "A" }]);
    expect(result.logistic_aa).toEqual([]);
    expect(result.internal).toBeUndefined();
    expect(result.technical_queue).toBeUndefined();
    expect(scopePayload(payload, "SUPPLY")).toEqual({ ceo_messages: { SUPPLY: "s" } });
    expect(scopePayload(payload, "TECHNICAL")).toEqual({ ceo_messages: { TECH: "t" }, technical_queue: [1] });
    expect(scopePayload(payload, null)).toBe(payload);
  });
  it("separates public cache keys and preserves query parameters", () => {
    expect(shareRequestKey("/api/data", slug)).toBe(`/api/data?share=${slug}`);
    expect(shareRequestKey("/api/data?x=1", slug)).toContain("?x=1&share=");
    expect(shareRequestKey("/api/data", undefined)).toBe("/api/data");
  });
});
