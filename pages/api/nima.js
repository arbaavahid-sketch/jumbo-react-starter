// pages/api/nima.js
// Second-hall ("تالار دوم") exchange-center rates, entered manually in a small
// Google Sheet tab so the spread matches ice.ir exactly. Neither ice.ir nor
// fxmarketrate.cbi.ir expose a stable public JSON API that works server-side.
//
// Expected tab (published as CSV), one row per currency:
//   currency | second_hall
//   usd      | 149000
//   eur      | 168000
//
// Values are in Toman (same as Navasan's free-market `usd`/`eur`).
// Set SHEET_NIMA_CSV_URL to the published CSV URL.

function parseCSV(text) {
  const rows = [];
  let i = 0;
  let field = "";
  let q = false;
  let row = [];
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
    i += 1;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => String(h || "").trim().toLowerCase());
  return rows
    .slice(1)
    .filter((r) => r.some(Boolean))
    .map((r) => {
      const o = {};
      headers.forEach((h, idx) => (o[h] = r[idx]));
      return o;
    });
}

const toNum = (v) => {
  if (v == null || v === "") return NaN;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
};

export default async function handler(req, res) {
  const empty = { rates: {}, configured: false };
  try {
    const url = process.env.SHEET_NIMA_CSV_URL;
    if (!url) {
      res.status(200).json(empty);
      return;
    }

    const r = await fetch(url);
    if (!r.ok) throw new Error(`CSV HTTP ${r.status}`);

    const rows = parseCSV(await r.text());
    const rates = {};
    for (const row of rows) {
      const cur = String(row.currency || row.symbol || row.code || "").trim().toLowerCase();
      const val = toNum(row.second_hall ?? row.nima ?? row.rate ?? row.value);
      if (cur && Number.isFinite(val)) rates[cur] = val;
    }

    res.status(200).json({ rates, configured: Object.keys(rates).length > 0 });
  } catch (error) {
    console.warn("API /api/nima failed:", String(error.message || error));
    res.status(200).json(empty);
  }
}
