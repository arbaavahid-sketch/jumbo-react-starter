// pages/api/supply.js
// خواندن داشبورد Supply از Google Sheets CSV

function parseCSV(text) {
  const rows = [];
  let i = 0;
  let field = "";
  let insideQuotes = false;
  let row = [];

  while (i < text.length) {
    const c = text[i];

    if (insideQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          insideQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      insideQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = "";
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== '\r') {
      field += c;
    }

    i += 1;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map((h) => String(h || "").trim());

  return rows
    .slice(1)
    .filter((r) => r.some(Boolean))
    .map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = r[idx];
      });
      return obj;
    });
}

const pickField = (row, keys) => {
  for (const key of keys) {
    if (key in row && row[key] != null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  return "";
};

const toNum = (value) => {
  if (value == null || value === "") return 0;
  const normalized = String(value).replace(/,/g, "").trim();
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};


const defaultRows = [
  { manager: "Albert Kunafin", deals_ytd: 13, deals_last_30_days: 11, deals_last_week: 3, deals_in_supply_side_stage_now: 1, undelivered_items: 0, nonplaced_items: 0, late_items: 0, open_po_count: 0, po_val_sub_ytd: 0, out_not_billed: 0, out_not_delivered: 0 },
  { manager: "Alexander Nikitin", deals_ytd: 12, deals_last_30_days: 11, deals_last_week: 1, deals_in_supply_side_stage_now: 0, undelivered_items: 0, nonplaced_items: 0, late_items: 0, open_po_count: 0, po_val_sub_ytd: 0, out_not_billed: 0, out_not_delivered: 0 },
  { manager: "Hesam Abbasi", deals_ytd: 1, deals_last_30_days: 1, deals_last_week: 0, deals_in_supply_side_stage_now: 1, undelivered_items: 0, nonplaced_items: 0, late_items: 0, open_po_count: 0, po_val_sub_ytd: 0, out_not_billed: 0, out_not_delivered: 0 },
  { manager: "Karina Shaydullina", deals_ytd: 2, deals_last_30_days: 2, deals_last_week: 1, deals_in_supply_side_stage_now: 0, undelivered_items: 0, nonplaced_items: 0, late_items: 0, open_po_count: 0, po_val_sub_ytd: 0, out_not_billed: 0, out_not_delivered: 0 },
  { manager: "Milad Hooshyar", deals_ytd: 1, deals_last_30_days: 1, deals_last_week: 0, deals_in_supply_side_stage_now: 0, undelivered_items: 0, nonplaced_items: 0, late_items: 0, open_po_count: 0, po_val_sub_ytd: 0, out_not_billed: 0, out_not_delivered: 0 },
  { manager: "Mostafa Hajivali", deals_ytd: 13, deals_last_30_days: 11, deals_last_week: 0, deals_in_supply_side_stage_now: 5, undelivered_items: 0, nonplaced_items: 0, late_items: 0, open_po_count: 0, po_val_sub_ytd: 0, out_not_billed: 0, out_not_delivered: 0 },
  { manager: "Ulyana Smakova", deals_ytd: 8, deals_last_30_days: 8, deals_last_week: 2, deals_in_supply_side_stage_now: 6, undelivered_items: 0, nonplaced_items: 0, late_items: 0, open_po_count: 0, po_val_sub_ytd: 0, out_not_billed: 0, out_not_delivered: 0 },
  { manager: "Azat Akhmerov", deals_ytd: 1, deals_last_30_days: 1, deals_last_week: 0, deals_in_supply_side_stage_now: 1, undelivered_items: 0, nonplaced_items: 0, late_items: 0, open_po_count: 0, po_val_sub_ytd: 0, out_not_billed: 0, out_not_delivered: 0 },
  { manager: "Unassigned", deals_ytd: 8, deals_last_30_days: 7, deals_last_week: 0, deals_in_supply_side_stage_now: 0, undelivered_items: 0, nonplaced_items: 0, late_items: 0, open_po_count: 0, po_val_sub_ytd: 0, out_not_billed: 0, out_not_delivered: 0 },
];

const calcTotals = (rows) => rows.reduce(
  (acc, r) => {
    acc.deals_ytd += r.deals_ytd;
    acc.deals_last_30_days += r.deals_last_30_days;
    acc.deals_last_week += r.deals_last_week;
    acc.deals_in_supply_side_stage_now += r.deals_in_supply_side_stage_now;
    acc.undelivered_items += r.undelivered_items;
    acc.nonplaced_items += r.nonplaced_items;
    acc.late_items += r.late_items;
    acc.open_po_count += r.open_po_count;
    acc.po_val_sub_ytd += r.po_val_sub_ytd;
    acc.out_not_billed += r.out_not_billed;
    acc.out_not_delivered += r.out_not_delivered;
    return acc;
  },
  { deals_ytd: 0, deals_last_30_days: 0, deals_last_week: 0, deals_in_supply_side_stage_now: 0, undelivered_items: 0, nonplaced_items: 0, late_items: 0, open_po_count: 0, po_val_sub_ytd: 0, out_not_billed: 0, out_not_delivered: 0 }
);


export default async function handler(req, res) {
  try {
    const fallbackUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRXsGTD45h3nBYxHI4VBfTnBQdE7roWfm3coN4Ful7hdV7fcshPd2lg5Ueymf_I5sgGVIr9bl77LA2a/pub?gid=1845248185&single=true&output=csv";

    const sheetUrl = process.env.SHEET_SUPPLY_CSV_URL || fallbackUrl;

    const response = await fetch(sheetUrl);
    if (!response.ok) {
      throw new Error(`CSV HTTP ${response.status}`);
    }

    const csvText = await response.text();
    const rawRows = parseCSV(csvText);

    const rows = rawRows.map((r) => ({
      manager: pickField(r, ["Supply side manager", "Supply Side manager", "Supply Manager", "manager"]),
      deals_ytd: toNum(pickField(r, ["Deals YTD", "deals_ytd"])),
      deals_last_30_days: toNum(pickField(r, ["Deals last 30 days", "deals_last_30_days"])),
      deals_last_week: toNum(pickField(r, ["Deals last week", "deals_last_week"])),
      deals_in_supply_side_stage_now: toNum(
        pickField(r, ["Deals in supply side stage now", "Deals in supply stage now", "deals_in_supply_side_stage_now"])
      ),
      undelivered_items: toNum(pickField(r, ["#Undelivered items (ERP)", "undelivered_items", "# Undelivered Items"])),
      nonplaced_items: toNum(pickField(r, ["#Nonplaced items (ERP)", "nonplaced_items"])),
      late_items: toNum(pickField(r, ["#Late items (ERP)", "late_items"])),
      open_po_count: toNum(pickField(r, ["Open PO count (ERP)", "open_po_count"])),
      po_val_sub_ytd: toNum(pickField(r, ["PO Val Sub YTD", "po_val_sub_ytd"])),
      out_not_billed: toNum(pickField(r, ["Out not billed", "out_not_billed"])),
      out_not_delivered: toNum(pickField(r, ["Out not delivered", "out_not_delivered"])),
    }));

    const cleanRows = rows.filter((r) => r.manager);

    const totals = calcTotals(cleanRows);
    res.status(200).json({ rows: cleanRows, totals, source: sheetUrl, fallback: false });
  } catch (error) {
    console.warn("API /api/supply failed, using built-in fallback:", String(error.message || error));
    res.status(200).json({ rows: defaultRows, totals: calcTotals(defaultRows), source: "fallback", fallback: true });
  }
}
