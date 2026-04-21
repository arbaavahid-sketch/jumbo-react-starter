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
      } else if (c !== "\r") {
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

export default async function handler(req, res) {
  try {
    const SHEET_URL = process.env.SHEET_TECH_CSV_URL;
    if (!SHEET_URL) {
      throw new Error("SHEET_TECH_CSV_URL is not set in env");
    }

    const r = await fetch(SHEET_URL);
    if (!r.ok) throw new Error(`CSV HTTP ${r.status}`);

    const text = await r.text();
    const csvRows = parseCSV(text);

    // یک helper کوچک برای تبدیل عدد
    const num = (v) => {
      if (v == null || v === "") return 0;
      const n = Number(String(v).replace(/,/g, "."));
      return isNaN(n) ? 0 : n;
    };

    // مپ کردن هر ردیف شیت به آبجکت تمیز
    const rows = csvRows.map((r) => {
      const obj = {
        date: r.date || r.Date || "",

        // آمار اصلی
        deals_added_technical: num(r.deals_added_technical),
        total_deals_week: num(r.total_deals_week),

        aref: num(r.aref),
        golsanam: num(r.golsanam),
        vahid: num(r.vahid),
        pouria: num(r.pouria),

        // تعداد دیل‌های انجام‌شده در هفته برای هر نفر
        aref_deals_done: num(
          r["aref deals done during the week"] ||
            r.aref_deals_done ||
            r["aref_deals_done"]
        ),
        golsanam_deals_done: num(
          r["golsanam deals done during the week"] ||
            r.golsanam_deals_done ||
            r["golsanam_deals_done"]
        ),
        vahid_deals_done: num(
          r["vahid deals done during the week"] ||
            r.vahid_deals_done ||
            r["vahid_deals_done"]
        ),
        pouria_deals_done: num(
          r["pouria deals done during the week"] ||
            r.pouria_deals_done ||
            r["pouria_deals_done"]
        ),

        // صف فنی و صف نصب
        remaining_queue: num(
          r["Technical Approval Queue"] ||
            r.technical_queue ||
            r.remaining_queue
        ),

        waiting_installation: num(
          r["Waiting for Installation"] ||
            r.waiting_installation ||
            r["waiting_installation"]
        ),

        waiting_installation_ids: (
          r.waiting_installation_ids ||
          r["waiting_installation_ids"] ||
          r["waiting installation ids"] ||
          ""
        ).trim(),

        promotion_trips: num(r.promotion_trips),
        demo_shows: num(r.demo_shows),
        internal_trainings: num(r.internal_trainings),

        mom_link: (r.mom_link || "").trim(),
last_meeting: (
  r.last_meeting ||
  r["last_meeting"] ||
  r["Last Meeting"] ||
  r["LAST MEETING"] ||
  r["last meeting"] ||
  ""
).trim(),
        // ✅ لیست دیل‌های نصب‌شده
        // اینجا چند اسم احتمالی برای ستون در نظر گرفتیم
        installed_ids: (
          r.installed_ids ||
          r["installed_ids_2026"] ||
          r["installed deals"] ||
          r["installed_deals_ids"] ||
          r["Installed deals IDs"] ||
          ""
        ).trim(),
      };

      return obj;
    });

    // مرتب‌سازی براساس تاریخ و گرفتن آخرین ردیف
    rows.sort(
      (a, b) => new Date(a.date || 0) - new Date(b.date || 0)
    );
    const latest = rows.length ? rows[rows.length - 1] : null;

    res.status(200).json({ rows, latest });
  } catch (err) {
    console.error("API /api/technical error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
}
