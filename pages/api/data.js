// pages/api/data.js
import fs from "fs/promises";
import path from "path";

// ----------------- CSV PARSER -----------------
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
      } else field += c;
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
      } else if (c !== "\r") field += c;
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

// ----------------- MAPPER -----------------
function mapSheetsToPayload({
  weeklySheet = [],
  membersSheet = [],
  latestSheet = [],
  groupsSheet = [],
  dealsSheet = [],
  ceoSheet = [],
  arListSheet = [],
  techQueueSheet = [],
  megaDealsSheet = [],
  weeklyTripsSheet = [], // ✅ اضافه شد
 logisticAASheet = [], // ✅ اضافه شد

}) {
  // ✅ weekly_trips_details: فقط آخرین تاریخ برای هر گروه
const weekly_trips_details = weeklyTripsSheet
  .map((r) => ({
    date: (r.date || r.Date || "").trim(),
    group: String(r.group || r.Group || "").toUpperCase().trim(),
    company_name: (r.company_name || r.Company_Name || r.company || r.Company || "").trim(),
    owner: (r.owner || r.Owner || "").trim(),
  }))
  .filter((r) => r.group && r.date);

// ✅ انتخاب آخرین تاریخ برای هر گروه
const tripsByGroup = {};
for (const row of weekly_trips_details) {
  if (!tripsByGroup[row.group]) tripsByGroup[row.group] = [];
  tripsByGroup[row.group].push(row);
}

const weekly_trips_details_latest = Object.entries(tripsByGroup).flatMap(
  ([g, arr]) => {
    // مرتب‌سازی بر اساس تاریخ (بهتره تاریخ‌ها YYYY/MM/DD یا YYYY-MM-DD باشن)
    arr.sort((a, b) => new Date(a.date) - new Date(b.date));
    const lastDate = arr[arr.length - 1]?.date;

    // فقط ردیف‌های همان آخرین تاریخ را نگه دار
    return arr.filter((x) => x.date === lastDate);
  }
);


  // weekly_reports
  const weekly_reports = weeklySheet
    .map((r) => {
      const inSales = Number(
        r["deals in Sales process"] || r.in_sales_process || 0
      );
      const inSupply = Number(r["Deals in Supply process"] || r.in_supply || 0);
      const inTechnical = Number(
        r["deals in technical process"] || r.in_technical || 0
      );
      const offers = Number(
        r.offers_sent || r.Offers_sent || r["offers_sent"] || 0
      );

      return {
        group: String(r.group || r.Group || "").toUpperCase(),
        week: r.week || r.Week || "",
        date: r.date || r.Date || "",

        in_sales_process: inSales,
        offers_sent: offers,
        weekly_sales_eur: Number(r.weekly_sales_eur || r.Weekly_Sales_EUR || 0),
        total_sales_eur: Number(r.total_sales_eur || r.Total_Sales_EUR || 0),
        active_companies: Number(
          r.active_companies || r.Active_Companies || 0
        ),
        mega_deals: Number(r.mega_deals || r.Mega_Deals || 0),

        in_technical: inTechnical,
        last_meeting: r.last_meeting || "",
        weekly_trips: Number(r.weekly_trips || r.Weekly_trips || 0),
        in_supply: inSupply,

        total_deals: offers + inSales,

        // MOM
        mom: r.mom || "",
      };
    })
    .filter((x) => x.group);

  // groups
  let groups = groupsSheet.map((g, idx) => ({
    id: Number(g.id || idx + 1),
    key: String(g.key || g.code || g.group || "").toUpperCase(),
    name: g.name || g.title || `Group ${idx + 1}`,
  }));

  if (!groups.length) {
    const uniq = [...new Set(weekly_reports.map((w) => w.group))];
    groups = uniq.map((key, i) => ({
      id: i + 1,
      key,
      name: `Group ${key}`,
    }));
  }
// ✅ logistic_aa (index-based, safe)
const logistic_aa = logisticAASheet.map((r) => ({
  plane_dispatch_within_2_months:
    (r["plane Dispatch(within 2 months)"] ??
      r.plane_dispatch_within_2_months ??
      "").trim(),

  on_the_way_to_iran_within_1_month:
    (r["on the way to iran(within 1 month)"] ??
      r.on_the_way_to_iran_within_1_month ??
      "").trim(),

  customs_within_2_week:
    (r["customs(within 2 week)"] ?? r.customs_within_2_week ?? "").trim(),
}));



  // members (آخرین رکورد هر نفر)
  const members = {};

  for (const m of membersSheet) {
    const g = String(m.group || m.Group || "").toUpperCase();
    if (!g) continue;

    const name = (m.member || m.name || "").trim();
    if (!name) continue;

    if (!members[g]) members[g] = {};

    members[g][name] = {
      name,
      deals: Number(m.deals || m.Deals || 0),
      offers_sent: Number(m.offers_sent || m.Offers_sent || 0),
    };
  }

  Object.keys(members).forEach((g) => {
    members[g] = Object.values(members[g]);
  });

  // latest
  const latest = {};
  if (latestSheet.length) {
    for (const l of latestSheet) {
      const g = String(l.group || "").toUpperCase();
      if (!g) continue;

      latest[g] = {
        date: l.date,
        mega_deals: Number(l.mega_deals || 0),
        active_companies: Number(l.active_companies || 0),
        total_sales_eur: Number(l.total_sales_eur || 0),
        weekly_sales_eur: Number(l.weekly_sales_eur || 0),
        offers_sent: Number(l.offers_sent || 0),
        total_deals: Number(l.total_deals || 0),
        last_meeting: l.last_meeting || "",
        weekly_trips: Number(l.weekly_trips || 0),
        mom: l.mom || "",
      };
    }
  } else {
    // از weekly محاسبه کن
    const byG = {};
    for (const row of weekly_reports) {
      if (!byG[row.group]) byG[row.group] = [];
      byG[row.group].push(row);
    }

    for (const [g, arr] of Object.entries(byG)) {
      arr.sort((a, b) => new Date(a.date) - new Date(b.date));
      const last = arr[arr.length - 1] || {};

      latest[g] = {
        date: last.date,
        mega_deals: last.mega_deals || 0,
        active_companies: last.active_companies || 0,
        total_sales_eur: last.total_sales_eur || 0,
        weekly_sales_eur: last.weekly_sales_eur || 0,
        offers_sent: last.offers_sent || 0,
        total_deals: last.total_deals || 0,
        last_meeting: last.last_meeting || "",
        weekly_trips: last.weekly_trips || 0,
        mom: last.mom || "",
      };
    }
  }

  // deals_exec
  const CLOSED_WORDS = ["delivered", "closed", "done", "بسته"]; // ✅ completed حذف شد
  const deals_exec = dealsSheet
    .map((r) => ({
      group: String(r.group || "").toUpperCase(),
      deal: r.deal || "",
      responsible: r.responsible || "",
      status: (r.status || "").trim(),
      amount_eur: Number(r.amount_eur || 0),
      active: (r.active || "").toString().trim(),
    }))
    .filter((d) => {
      if (!d.group || !d.deal) return false;
      if (d.active === "0") return false;
      const s = d.status.toLowerCase();
      return !CLOSED_WORDS.some((w) => s.includes(w));
    });

  // history
  const byGroup = {};
  for (const w of weekly_reports) {
    if (!byGroup[w.group]) byGroup[w.group] = [];
    byGroup[w.group].push(w);
  }

  const history = {};
  for (const [g, arr] of Object.entries(byGroup)) {
    arr.sort((a, b) => new Date(a.date) - new Date(b.date));
    history[g] = arr.slice(-12).map((r) => ({
      week: r.week,
      date: r.date,
      weekly_sales_eur: r.weekly_sales_eur,
      offers_sent: r.offers_sent,
      in_sales_process: r.in_sales_process,
      total_deals: r.total_deals,
    }));
  }

  // ceo messages
  const ceo_messages = {};
  for (const row of ceoSheet) {
    const g = String(row.group || "").toUpperCase();
    if (!g) continue;
    ceo_messages[g] = row.message || "";
  }

  // AR list
  const ar_list = arListSheet
    .map((r) => ({
      group: String(r.group || "").toUpperCase(),
      deal_no: r.deal_no || "",
      payment_currency: r.payment_currency || r.payment_curren || "",
      percentage:
        parseFloat(
          (r.percentage || "")
            .toString()
            .replace("%", "")
            .replace("٪", "")
            .trim()
        ) || 0,
    }))
    .filter((r) => r.group && r.deal_no);

    // ✅ technical_queue: Owner + deal + center + subject + status
  const technical_queue = techQueueSheet
    .map((r) => {
      // تو شیت ستون اسمش Owner است، اینجا به عنوان group استفاده می‌کنیم
      const group = String(
        r.group || r.Group || r.Owner || r.owner || ""
      ).trim();

      const deal = (r.deal || r.Deal || "").trim();
      const center = (r.center || r.Center || "").trim();
      const subject = (r.subject || r.Subject || "").trim();
      const status = (r.status || r.Status || "").trim();

      return {
        group,   // در UI به عنوان Owner نمایش داده می‌شود
        deal,
        center,
        subject,
        status,      };
    })
    // فقط مطمئن شو شماره دیل خالی نباشه
    .filter((r) => r.deal);
  // ✅ mega_deals_details: از شیت mega_deals (date, group, mega_deal_id, project_name, owner)
  const mega_deals_details = megaDealsSheet
    .map((r) => ({
      date: r.date || "",
      group: String(r.group || "").toUpperCase(),
      mega_deal_id: r.mega_deal_id || r.mega_deal_id || "",
      project_name: r.project_name || "",
      owner: r.owner || "",
    }))
    .filter((r) => r.group && r.mega_deal_id);


  return {
    groups,
    weekly_reports,
    members,
    latest,
    deals_exec,
    ceo_messages,
    history,
    ar_list,
    technical_queue,
    mega_deals_details,   // 👈 این
    weekly_trips_details: weekly_trips_details_latest,
    logistic_aa,
  };
}

// ----------------- HANDLER -----------------
export default async function handler(req, res) {
  try {
    const {
      SHEET_WEEKLY_TRIPS_CSV_URL,
      SHEET_WEEKLY_CSV_URL,
      SHEET_MEMBERS_CSV_URL,
      SHEET_LATEST_CSV_URL,
      SHEET_GROUPS_CSV_URL,
      SHEET_DEALS_CSV_URL,
      SHEET_CEO_MSG_CSV_URL,
      SHEET_AR_LIST_CSV_URL,
      SHEET_TECH_QUEUE_CSV_URL, // 👈 از env
      SHEET_MEGA_DEALS_CSV_URL,
      SHEET_LOGISTIC_AA_CSV_URL,

    } = process.env;

    const fetchCSV = async (url) => {
      if (!url) return [];
      const r = await fetch(url);
      if (!r.ok) throw new Error(`CSV HTTP ${r.status}`);
      return parseCSV(await r.text());
    };
let weeklySheet = [],
  membersSheet = [],
  latestSheet = [],
  groupsSheet = [],
  dealsSheet = [],
  ceoSheet = [],
  arListSheet = [],
  techQueueSheet = [],
  megaDealsSheet = [],
  weeklyTripsSheet = [],
  logisticAASheet = []; // ✅ اینجا باید باشد

    try {
      weeklySheet = await fetchCSV(SHEET_WEEKLY_CSV_URL);
      membersSheet = await fetchCSV(SHEET_MEMBERS_CSV_URL);
      latestSheet = await fetchCSV(SHEET_LATEST_CSV_URL);
      groupsSheet = await fetchCSV(SHEET_GROUPS_CSV_URL);
      dealsSheet = await fetchCSV(SHEET_DEALS_CSV_URL);
      ceoSheet = await fetchCSV(SHEET_CEO_MSG_CSV_URL);
      arListSheet = await fetchCSV(SHEET_AR_LIST_CSV_URL);
      techQueueSheet = await fetchCSV(SHEET_TECH_QUEUE_CSV_URL);
      megaDealsSheet = await fetchCSV(SHEET_MEGA_DEALS_CSV_URL); // 👈 این
      weeklyTripsSheet = await fetchCSV(SHEET_WEEKLY_TRIPS_CSV_URL);
logisticAASheet = await fetchCSV(SHEET_LOGISTIC_AA_CSV_URL);
console.log("LOGISTIC URL:", SHEET_LOGISTIC_AA_CSV_URL);
console.log("LOGISTIC rows:", logisticAASheet.length);
console.log("LOGISTIC first row keys:", logisticAASheet[0] ? Object.keys(logisticAASheet[0]) : null);
console.log("LOGISTIC first row:", logisticAASheet[0] || null);

    } catch (e) {
      console.warn("CSV fetch failed — using sample.json", e);

      const raw = await fs.readFile(
        path.join(process.cwd(), "public", "data", "sample.json"),
        "utf8"
      );
      const j = JSON.parse(raw);

      weeklySheet = j.weekly_reports || [];
      membersSheet = Object.entries(j.members || {}).flatMap(([g, arr]) =>
        arr.map((m) => ({ group: g, ...m }))
      );
      latestSheet = Object.entries(j.latest || {}).map(([g, d]) => ({
        group: g,
        ...d,
      }));
      groupsSheet = j.groups || [];
      dealsSheet = j.deals_exec || [];
      ceoSheet = Object.entries(j.ceo_messages || {}).map(([g, msg]) => ({
        group: g,
        message: msg,
      }));
      arListSheet = j.ar_list || [];
      techQueueSheet = j.technical_queue || [];
    }

    const payload = mapSheetsToPayload({
  weeklySheet,
  membersSheet,
  latestSheet,
  groupsSheet,
  dealsSheet,
  ceoSheet,
  arListSheet,
  techQueueSheet,
  megaDealsSheet,
  weeklyTripsSheet, // ✅ اضافه شد
  logisticAASheet, // ✅ حتماً این هم باشه

});

    res.status(200).json(payload);
  } catch (err) {
    console.error("API /api/data error:", err);
    res.status(500).json({ error: err.message });
  }
}
