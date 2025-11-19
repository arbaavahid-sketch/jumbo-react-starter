// pages/api/technical.js
// خواندن داشبورد فنی از Google Sheets (شیت technical_dashboard)

function parseCSV(text) {
  const rows = [];
  let i = 0,
    field = "",
    insideQuotes = false,
    row = [];

  while (i < text.length) {
    const c = text[i];
    if (insideQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') insideQuotes = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // ignore
      } else {
        field += c;
      }
    }
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some(Boolean)).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx];
    });
    return obj;
  });
}

export default async function handler(req, res) {
  try {
    const SHEET_URL = process.env.SHEET_TECH_CSV_URL;
    if (!SHEET_URL) {
      throw new Error("SHEET_TECH_CSV_URL is not set in env");
    }

    const r = await fetch(SHEET_URL);
    if (!r.ok) {
      throw new Error(`CSV HTTP ${r.status}`);
    }
    const text = await r.text();
    const csvRows = parseCSV(text);

    // مپ بر اساس هدرهای شیت technical_dashboard
    const rows = csvRows.map((r) => ({
      date: r.date || r.Date || "",
      deals_added_technical: Number(
        r.deals_added_technical || r.deals_added_technical || 0
      ),
      total_deals_week: Number(r.total_deals_week || 0),
      aref: Number(r.aref || 0),
      golsanam: Number(r.golsanam || 0),
      vahid: Number(r.vahid || 0),
      pouria: Number(r.pouria || 0),
      remaining_queue: Number(r.remaining_queue || 0),
      waiting_installation: Number(r.waiting_installation || 0),
      waiting_installation_ids:
        (r.waiting_installation_ids || "").trim(),
      promotion_trips: Number(r.promotion_trips || 0),
      demo_shows: Number(r.demo_shows || 0),
      internal_trainings: Number(r.internal_trainings || 0),
      mom_link: (r.mom_link || "").trim(),
    }));

    // مرتب‌سازی بر اساس تاریخ و انتخاب آخرین ردیف
    rows.sort(
      (a, b) =>
        new Date(a.date || 0) - new Date(b.date || 0)
    );
    const latest = rows.length ? rows[rows.length - 1] : null;

    res.status(200).json({ rows, latest });
  } catch (err) {
    console.error("API /api/technical error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
}
