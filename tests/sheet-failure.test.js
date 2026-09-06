import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import main from "../pages/api/data";
import supply from "../pages/api/supply";
import history from "../pages/api/supply-history";
import technical from "../pages/api/technical";
import nima from "../pages/api/nima";
import { createSession } from "../lib/auth";
import { fetchSheetText, SHEET_ERROR_MESSAGE } from "../lib/sheet-fetch";
import { fetchJson } from "../lib/fetch-json";

const sources = ["WEEKLY", "MEMBERS", "LATEST", "GROUPS", "DEALS", "CEO_MSG", "AR_LIST", "TECH_QUEUE", "MEGA_DEALS", "TOTAL_DEALS", "WEEKLY_TRIPS", "LOGISTIC_AA", "GROUP_OFFERS"];
const resMock = () => ({ setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() });
const reqMock = () => ({ method: "GET", query: {}, cookies: { dashboard_auth: createSession() } });
const csv = (text) => new Response(text, { headers: { "Content-Type": "text/csv" } });

beforeEach(() => {
  vi.stubEnv("LOGIN_USER", "test");
  vi.stubEnv("LOGIN_PASS", "test-password");
  vi.stubEnv("AUTH_SECRET", "a".repeat(64));
  for (const name of sources) vi.stubEnv(`SHEET_${name}_CSV_URL`, `https://sheets.test/${name}`);
  vi.stubEnv("SHEET_TECH_CSV_URL", "https://sheets.test/tech");
  vi.stubEnv("SHEET_NIMA_CSV_URL", "https://sheets.test/nima");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("sheet failures never produce sample or empty success payloads", () => {
  for (const [name, handler] of Object.entries({ main, supply, history, technical, nima })) {
    for (const mode of ["network", "http", "html", "empty", "timeout"]) {
      it(`${name}: reports ${mode} as unavailable without business values`, async () => {
        vi.stubGlobal("fetch", vi.fn(async () => {
          if (mode === "network") throw new Error("network failure");
          if (mode === "timeout") throw new DOMException("Timed out", "TimeoutError");
          if (mode === "http") return new Response("Forbidden", { status: 403 });
          if (mode === "html") return new Response("<!doctype html><html>Sign in</html>", { headers: { "Content-Type": "text/html" } });
          return csv("");
        }));
        const res = resMock();
        await handler(reqMock(), res);
        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({ error: "SHEET_UNAVAILABLE", message: SHEET_ERROR_MESSAGE });
        expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "private, no-store");
      });
    }
  }
  it("does not silently empty failed group offers or total deals", async () => {
    for (const source of ["GROUP_OFFERS", "TOTAL_DEALS"]) {
      vi.stubGlobal("fetch", vi.fn(async (url) => {
        if (url.endsWith(source)) throw new Error("Offline");
        return csv("group,week\nA,1\n");
      }));
      const res = resMock();
      await main(reqMock(), res);
      expect(res.status).toHaveBeenCalledWith(503);
    }
  });
  it("rejects missing required weekly configuration", async () => {
    vi.stubEnv("SHEET_WEEKLY_CSV_URL", "");
    const res = resMock();
    await main(reqMock(), res);
    expect(res.status).toHaveBeenCalledWith(503);
  });
});

describe("successful sources and recovery", () => {
  it("recovers on the next request and preserves genuine zero values", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error("Offline"))
      .mockImplementation(async () => csv("Supply side manager,week,Deals YTD\nTest Manager,2,0\n"));
    vi.stubGlobal("fetch", fetch);
    const failed = resMock();
    await supply(reqMock(), failed);
    expect(failed.status).toHaveBeenCalledWith(503);
    const recovered = resMock();
    await supply(reqMock(), recovered);
    expect(recovered.status).toHaveBeenCalledWith(200);
    expect(recovered.json.mock.calls[0][0]).toMatchObject({ rows: [{ manager: "Test Manager", deals_ytd: 0 }], fallback: false });
  });
  it("keeps a valid header-only source empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => csv("Supply side manager,week,Deals YTD\n")));
    const res = resMock();
    await supply(reqMock(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].rows).toEqual([]);
  });
  it("still maps real main rows, without requiring unconfigured optional tabs", async () => {
    vi.stubEnv("SHEET_GROUP_OFFERS_CSV_URL", "");
    vi.stubGlobal("fetch", vi.fn(async () => csv("group,week,weekly_sales_eur\nA,2,123\n")));
    const res = resMock();
    await main(reqMock(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].weekly_reports[0].weekly_sales_eur).toBe(123);
  });
  it("uses a deadline and disables cached sheet responses", async () => {
    const fetch = vi.fn(async () => csv("group\nA\n"));
    vi.stubGlobal("fetch", fetch);
    await fetchSheetText("https://sheets.test/data");
    expect(fetch.mock.calls[0][1]).toMatchObject({ cache: "no-store", signal: expect.any(AbortSignal) });
  });
  it("passes the readable API error through to the page", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: SHEET_ERROR_MESSAGE }), { status: 503 })));
    await expect(fetchJson("/api/data")).rejects.toThrow(SHEET_ERROR_MESSAGE);
  });
});
