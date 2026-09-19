import { describe, expect, it } from "vitest";
import {
  isNewOffer,
  nextOfferChange,
  offerAddedAt,
  OFFER_NEW_WINDOW_MS,
} from "../lib/group-offers";
import { prepareOffersUpdate } from "../lib/group-offers-import.mjs";
import { mapSheetsToPayload } from "../pages/api/data";
import { scopePayload } from "../lib/access";

const importedAt = "2026-09-19T12:00:00+03:30";
const start = Date.parse(importedAt);
const deal = (id, name = "Test offer", extra = {}) => ({
  "Record ID": id,
  "Deal Name": name,
  "Deal Stage": "V Offer sent",
  "Deal owner": "Test Owner",
  "Close Date": 46284,
  Amount: 100,
  ...extra,
});
const existing = (extra = {}) => ({
  "Record ID": "old",
  "Deal Name": "Old offer",
  "Deal owner": "Test Owner",
  Group: "Group A",
  Amount: 80,
  "Added At": "",
  ...extra,
});

describe("seven-day offer highlighting", () => {
  it("starts at the shared import timestamp and ends at exactly seven days", () => {
    const row = { added_at: importedAt };
    expect(isNewOffer(row, start - 1)).toBe(false);
    expect(isNewOffer(row, start)).toBe(true);
    expect(isNewOffer(row, start + OFFER_NEW_WINDOW_MS - 1)).toBe(true);
    expect(isNewOffer(row, start + OFFER_NEW_WINDOW_MS)).toBe(false);
    expect(isNewOffer(row, start + 14 * 86400000)).toBe(false);
  });

  it("never treats missing, malformed, or last-modified dates as new", () => {
    for (const added_at of [
      null,
      "",
      "not-a-date",
      "2026-02-30",
      "19/09/2026",
      "2026-09-19 12:00",
    ]) {
      expect(offerAddedAt(added_at)).toBeNull();
      expect(isNewOffer({ added_at, last_modified_date: importedAt }, start)).toBe(false);
    }
    expect(isNewOffer({ added_at: importedAt }, null)).toBe(false);
  });

  it("interprets a date-only source in Tehran regardless of browser timezone", () => {
    expect(offerAddedAt("2026-09-19")).toBe("2026-09-18T20:30:00.000Z");
    expect(offerAddedAt(importedAt)).toBe("2026-09-19T08:30:00.000Z");
  });

  it("schedules expiry without another import or page reload", () => {
    const rows = [{ added_at: importedAt }, { added_at: "" }];
    expect(nextOfferChange(rows, start - 1)).toBe(start);
    expect(nextOfferChange(rows, start)).toBe(start + OFFER_NEW_WINDOW_MS);
    expect(nextOfferChange(rows, start + OFFER_NEW_WINDOW_MS)).toBe(Infinity);
  });
});

describe("recurring offers imports", () => {
  it("marks only newly added IDs and keeps existing dates through edits and sorting", () => {
    const result = prepareOffersUpdate({
      currentDeals: [deal("new"), deal("old", "Renamed offer", { Amount: 200 })],
      existingRows: [existing({ "Added At": "2026-09-01T00:00:00Z" })],
      importedAt,
    });
    expect(result.addedIds).toEqual(["new"]);
    expect(result.offers[0]["Added At"]).toBe(new Date(start).toISOString());
    expect(result.offers[1]["Added At"]).toBe("2026-09-01T00:00:00Z");
    expect(result.offers[1].Amount).toBe(200);
    expect(result.offers[1]["Close Date"]).toBe(46284);
    expect(result.counts).toEqual({ A: 2, B: 0, C: 0 });
    const repeated = prepareOffersUpdate({
      currentDeals: [deal("old"), deal("new")],
      existingRows: result.offers,
      importedAt: "2026-10-03T09:00:00Z",
    });
    expect(repeated.addedIds).toEqual([]);
    expect(repeated.offers.find((r) => r["Record ID"] === "new")["Added At"]).toBe(
      result.offers[0]["Added At"],
    );
  });

  it("migrates legacy rows using the previous export's stable IDs", () => {
    const result = prepareOffersUpdate({
      currentDeals: [deal("old", "Renamed offer"), deal("new")],
      existingRows: [existing({ "Record ID": "" })],
      previousDeals: [deal("old", "Old offer")],
      importedAt,
    });
    expect(result.addedIds).toEqual(["new"]);
    expect(result.offers[0]["Added At"]).toBe("");
  });

  it("keeps the existing group policy and reports unmapped owners", () => {
    const result = prepareOffersUpdate({
      currentDeals: [
        deal("old"),
        deal("new", "Unmapped", { "Deal owner": "Other Owner" }),
        deal("closed", "Closed", { "Deal Stage": "Closed won" }),
      ],
      existingRows: [existing()],
      importedAt,
    });
    expect(result.offers).toHaveLength(1);
    expect(result.excludedOwners).toEqual({ "Other Owner": 1 });
  });

  it("preserves blank amounts and deliberate zero amounts", () => {
    const result = prepareOffersUpdate({
      currentDeals: [deal("old", "Blank", { Amount: null }), deal("new", "Zero", { Amount: 0 })],
      existingRows: [existing()],
      importedAt,
    });
    expect(result.offers.map((r) => r.Amount)).toEqual(["", 0]);
  });

  it("rejects missing/duplicate IDs and ambiguous legacy matches before a write", () => {
    const base = { existingRows: [existing()], importedAt };
    expect(() => prepareOffersUpdate({ ...base, currentDeals: [deal("")] })).toThrow();
    expect(() =>
      prepareOffersUpdate({ ...base, currentDeals: [deal("old"), deal("old")] }),
    ).toThrow();
    expect(() =>
      prepareOffersUpdate({
        ...base,
        currentDeals: [deal("old")],
        existingRows: [existing({ "Record ID": "" })],
      }),
    ).toThrow();
  });
});

describe("offers API integration", () => {
  it("passes persisted IDs and timestamps through normal and scoped responses", () => {
    const payload = mapSheetsToPayload({
      groupOffersSheet: [
        existing({ "Added At": importedAt }),
        existing({ "Record ID": "b", Group: "Group B" }),
      ],
    });
    const [row] = scopePayload(payload, "A").group_offers;
    expect(scopePayload(payload, "A").group_offers).toHaveLength(1);
    expect(row.record_id).toBe("old");
    expect(row.added_at).toBe(new Date(start).toISOString());
    expect(isNewOffer(row, start)).toBe(true);
  });

  it("keeps legacy rows unhighlighted even if close/modified dates are today", () => {
    const payload = mapSheetsToPayload({
      groupOffersSheet: [existing({ "Close Date": importedAt, "Last Modified Date": importedAt })],
    });
    expect(payload.group_offers[0].added_at).toBeNull();
  });
});
