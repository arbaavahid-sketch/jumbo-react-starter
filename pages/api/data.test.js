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

describe("total deals sheet mapping", () => {
  it("maps the provided sheet headers and normalizes group values", () => {
    const payload = mapSheetsToPayload({
      totalDealsSheet: [
        {
          Group: "Group A",
          Mounth: "01/2026",
          Center: "PGSOC-IVKAZ",
          Product: "IVKAZ(2.5)",
          "Deal ID": "8730",
          "Sales Amount": "€85,401.63",
        },
      ],
    });

    expect(payload.total_deals_details).toEqual([
      {
        group: "A",
        month: "01/2026",
        center: "PGSOC-IVKAZ",
        product: "IVKAZ(2.5)",
        deal_id: "8730",
        sales_amount_label: "€85,401.63",
        sales_amount_eur: 85401.63,
      },
    ]);
  });

  it("ignores placeholder rows without a deal id", () => {
    const payload = mapSheetsToPayload({
      totalDealsSheet: [{ Group: "B" }],
    });

    expect(payload.total_deals_details).toEqual([]);
  });
});

describe("weekly trips sheet mapping", () => {
  it("keeps the complete trip history for year-to-date reporting", () => {
    const payload = mapSheetsToPayload({
      weeklyTripsSheet: [
        { group: "A", date: "28/01/2026", company_name: "Dacom", owner: "Afshar" },
        { group: "A", date: "05/08/2026", company_name: "Iotco", owner: "Ali" },
        { group: "B", date: "04/08/2026", company_name: "NIGC", owner: "Mahnaz" },
      ],
    });

    expect(payload.weekly_trips_details).toEqual([
      { group: "A", date: "28/01/2026", company_name: "Dacom", owner: "Afshar" },
      { group: "B", date: "04/08/2026", company_name: "NIGC", owner: "Mahnaz" },
      { group: "A", date: "05/08/2026", company_name: "Iotco", owner: "Ali" },
    ]);
  });
});
