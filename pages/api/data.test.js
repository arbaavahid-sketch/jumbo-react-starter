import { describe, expect, it } from "vitest";
import { mapSheetsToPayload } from "./data";

describe("logistic sheet mapping", () => {
  it("maps the still-in-customs column by its Google Sheets header", () => {
    const payload = mapSheetsToPayload({
      logisticAASheet: [
        {
          "10% of these shipments are still in customs": "Europe Truck23/8269/Anion resin",
        },
      ],
    });

    expect(payload.logistic_aa[0]).toMatchObject({
      shipments_still_in_customs: "Europe Truck23/8269/Anion resin",
      still_in_customs_parts: {
        center: "Europe Truck23",
        dealNumber: "8269",
        item: "Anion resin",
      },
    });
  });
});
