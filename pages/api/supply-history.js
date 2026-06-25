// pages/api/supply-history.js
// Weekly history for the Supply dashboard.
//
// Reads a dedicated Google Sheet tab (published as CSV) where there is ONE ROW
// PER MANAGER PER WEEK. Expected header columns (extra columns are ignored):
//   week | Supply side manager | Deals YTD | Deals last 30 days | Deals last week |
//   Deals in supply side stage now | #Undelivered items (ERP) | #Nonplaced items (ERP) |
//   #Late items (ERP) | Open PO count (ERP) | PO Val Sub YTD | Out not billed | Out not delivered
//
// Set SHEET_SUPPLY_HISTORY_CSV_URL in the environment to the tab's published CSV
// URL. When it is missing or the fetch fails, the API returns empty arrays so
// the dashboard can show a friendly "no history yet" state instead of breaking.

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
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
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
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

// "Week 21", "21", "w21" -> 21 ; returns null when no number is present.
const toWeek = (value) => {
  const m = String(value || "").match(/\d+/);
  return m ? Number(m[0]) : null;
};

const cleanManager = (value) =>
  String(value || "")
    .replace(/#/g, "")
    .trim();

export function mapSupplyHistoryRows(rawRows) {
  const rows = rawRows
    .map((r) => ({
      week: toWeek(pickField(r, ["week", "Week", "هفته"])),
      date: String(pickField(r, ["date", "Date", "publish_date", "Publish date"]) || "").trim(),
      manager: cleanManager(
        pickField(r, ["Supply side manager", "Supply Side manager", "Supply Manager", "manager"]),
      ),
      deals_ytd: toNum(pickField(r, ["Deals YTD", "deals_ytd"])),
      deals_last_30_days: toNum(
        pickField(r, ["Deals last 30 days", "Last 30 Days", "last 30 days", "deals_last_30_days"]),
      ),
      deals_last_week: toNum(pickField(r, ["Deals last week", "deals_last_week"])),
      deals_in_supply_side_stage_now: toNum(
        pickField(r, [
          "Deals in supply side stage now",
          "Deals in supply stage now",
          "deals_in_supply_side_stage_now",
        ]),
      ),
      undelivered_items: toNum(
        pickField(r, ["#Undelivered items (ERP)", "undelivered_items", "# Undelivered Items"]),
      ),
      nonplaced_items: toNum(pickField(r, ["#Nonplaced items (ERP)", "nonplaced_items"])),
      late_items: toNum(pickField(r, ["#Late items (ERP)", "late_items"])),
      open_po_count: toNum(pickField(r, ["Open PO count (ERP)", "open_po_count"])),
      po_val_sub_ytd: toNum(pickField(r, ["PO Val Sub YTD", "po_val_sub_ytd"])),
      out_not_billed: toNum(pickField(r, ["Out not billed", "out_not_billed"])),
      out_not_delivered: toNum(pickField(r, ["Out not delivered", "out_not_delivered"])),
    }))
    .filter((r) => r.manager && r.week != null);

  const weeks = Array.from(new Set(rows.map((r) => r.week))).sort((a, b) => a - b);
  const managers = Array.from(new Set(rows.map((r) => r.manager))).sort((a, b) =>
    a.localeCompare(b),
  );

  return { rows, weeks, managers };
}

export default async function handler(req, res) {
  const empty = { rows: [], weeks: [], managers: [], configured: false };

  // The history reads the same supply tab the live dashboard uses (it just keeps
  // ALL weeks instead of only the latest). A dedicated SHEET_SUPPLY_HISTORY_CSV_URL
  // takes priority if you ever want a separate tab.
  const fallbackUrl =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRXsGTD45h3nBYxHI4VBfTnBQdE7roWfm3coN4Ful7hdV7fcshPd2lg5Ueymf_I5sgGVIr9bl77LA2a/pub?gid=1845248185&single=true&output=csv";
  const sheetUrl =
    process.env.SHEET_SUPPLY_HISTORY_CSV_URL ||
    process.env.SHEET_SUPPLY_SIDE_DASHBOARD_CSV_URL ||
    fallbackUrl;

  try {
    const response = await fetch(sheetUrl);
    if (!response.ok) throw new Error(`CSV HTTP ${response.status}`);

    const parsed = mapSupplyHistoryRows(parseCSV(await response.text()));
    // "configured" is true only once we actually find weekly rows, so the UI
    // shows the setup hint until a week column with data exists.
    res.status(200).json({ ...parsed, configured: parsed.weeks.length > 0 });
  } catch (error) {
    console.warn("API /api/supply-history failed:", String(error.message || error));
    res.status(200).json(empty);
  }
}
