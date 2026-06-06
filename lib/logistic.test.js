import { describe, it, expect } from "vitest";
import { splitDeal, hasMeaningful } from "./logistic";

describe("splitDeal", () => {
  const cases = [
    // [input, fallbackDealNumber, expected]
    ["Dubai Truck 1/7866GOLVES", "", { center: "Dubai Truck 1", dealNumber: "7866", item: "GOLVES" }],
    ["Dubai Truck 1/8064 Active carbon", "", { center: "Dubai Truck 1", dealNumber: "8064", item: "Active carbon" }],
    ["Russia Truck 16/8089", "", { center: "Russia Truck 16", dealNumber: "8089", item: "" }],
    // explicit 3-part with slashes
    ["Russia Truck15/8837/Chromatec", "", { center: "Russia Truck15", dealNumber: "8837", item: "Chromatec" }],
    ["Russia Truck 16/Werehouse122025 11 pt/IVKAZ", "", { center: "Russia Truck 16", dealNumber: "Werehouse122025 11 pt", item: "IVKAZ" }],
    // empty middle => no deal number, text goes to item
    ["Russia Truck15//warehouse122025 12 PT IVKAZ", "", { center: "Russia Truck15", dealNumber: "", item: "warehouse122025 12 PT IVKAZ" }],
    // comma-separated item kept as-is (UI converts commas to lines)
    ["Europe Truck20/9049Techcomp,Wenk", "", { center: "Europe Truck20", dealNumber: "9049", item: "Techcomp,Wenk" }],
    // deal number with a -N suffix
    ["Europe Truck 22/7686-1", "", { center: "Europe Truck 22", dealNumber: "7686-1", item: "" }],
    // surrounding spaces around slashes
    ["Korea Sea 1 / 7949 / Gloves", "", { center: "Korea Sea 1", dealNumber: "7949", item: "Gloves" }],
    ["China Sea 4 /8853", "", { center: "China Sea 4", dealNumber: "8853", item: "" }],
    // empty cell falls back to provided deal number
    ["", "5555", { center: "", dealNumber: "5555", item: "" }],
  ];

  for (const [input, fallback, expected] of cases) {
    it(`parses ${JSON.stringify(input)}`, () => {
      expect(splitDeal(input, fallback)).toEqual(expected);
    });
  }
});

describe("hasMeaningful", () => {
  it("treats non-empty text as meaningful", () => {
    expect(hasMeaningful("x")).toBe(true);
  });

  it("treats empty, whitespace, and a lone dash as not meaningful", () => {
    expect(hasMeaningful("")).toBe(false);
    expect(hasMeaningful("   ")).toBe(false);
    expect(hasMeaningful("-")).toBe(false);
  });
});
