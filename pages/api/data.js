// pages/api/data.js — خواندن داده‌ها از Google Sheets CSV + پیام‌های CEO

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
}) {
  const weekly_reports = weeklySheet
    .map((r) => {
      const inSales = Number(
        r["deals in Sales process"] || r.in_sales_process || 0
      );
      const inSupply = Number(
        r["Deals in Supply process"] || r.in_supply || 0
      );
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

        weekly_sales_eur: Number(
          r.weekly_sales_eur || r.Weekly_Sales_EUR || r.weekly_sales || 0
        ),
        total_sales_eur: Number(
          r.total_sales_eur || r.Total_Sales_EUR || r.total_sales || 0
        ),
        active_companies: Number(
          r.active_companies || r.Active_Companies || 0
        ),
        mega_deals: Number(r.mega_deals || r.Mega_Deals || 0),

        in_technical: inTechnical,

        last_meeting: r.last_meeting || r.last_group_meeting || "",
        weekly_trips: Number(r.weekly_trips || r.Weekly_trips || 0),

        in_supply: inSupply,

        // total_deals محاسبه‌ای
        total_deals: offers + inSales,
      };
    })
    .filter((x) => x.group);

  // groups
  let groups = groupsSheet.map((g, idx) => ({
    id: Number(g.id || idx + 1),
    key: String(g.key || g.code || g.slug || g.group || "").toUpperCase(),
    name: g.name || g.title || `Group ${idx + 1}`,
  }));
  if (!groups.length) {
    const uniq = Array.from(new Set(weekly_reports.map((w) => w.group)));
    groups = uniq.map((key, idx) => ({
      id: idx + 1,
      key,
      name: `Group ${key}`,
    }));
  }

  // members
  const members = {};
  for (const m of membersSheet) {
    const g = String(m.group || m.Group || "").toUpperCase();
    if (!g) continue;
    if (!members[g]) members[g] = [];
    members[g].push({
      name: m.member || m.Member || "",
      deals: Number(m.deals || m.Deals || 0),
      offers_sent: Number(
        m.offers_sent || m.Offers_sent || m.Offers_Sent || 0
      ),
    });
  }

  // latest: یا از شیت جدا، یا از آخرین weekly هر گروه
  let latest = {};
  if (latestSheet && latestSheet.length) {
    for (const l of latestSheet) {
      const g = String(l.group || l.Group || "").toUpperCase();
      if (!g) continue;
      latest[g] = {
        date: l.date || l.Date,
        mega_deals: Number(l.mega_deals || l.MEGA_DEALS || 0),
        active_companies: Number(
          l.active_companies || l.ACTIVE_COMPANIES || 0
        ),
        total_sales_eur: Number(
          l.total_sales_eur || l.TOTAL_SALES_EUR || 0
        ),
        weekly_sales_eur: Number(
          l.weekly_sales_eur || l.WEEKLY_SALES_EUR || 0
        ),
        offers_sent: Number(l.offers_sent || l.OFFERS_SENT || 0),
        total_deals: Number(l.total_deals || l.TOTAL_DEALS || 0),
        last_meeting:
          l.last_meeting ||
          l.last_group_meeting ||
          l.Last_meeting ||
          l.Last_group_meeting ||
          "",
        weekly_trips: Number(
          l.weekly_trips || l.Weekly_trips || l.WeeklyTrips || 0
        ),
      };
    }
  } else {
    const byG = {};
    for (const row of weekly_reports) {
      if (!byG[row.group]) byG[row.group] = [];
      byG[row.group].push(row);
    }
    for (const [g, arr] of Object.entries(byG)) {
      arr.sort(
        (a, b) =>
          new Date(a.date || 0) - new Date(b.date || 0) ||
          String(a.week).localeCompare(String(b.week))
      );
      const last = arr[arr.length - 1] || {};
      latest[g] = {
        date: last.date || last.week || "",
        mega_deals: Number(last.mega_deals || 0),
        active_companies: Number(last.active_companies || 0),
        total_sales_eur: Number(last.total_sales_eur || 0),
        weekly_sales_eur: Number(last.weekly_sales_eur || 0),
        offers_sent: Number(last.offers_sent || 0),
        total_deals: Number(last.total_deals || 0),
        last_meeting: last.last_meeting || "",
        weekly_trips: Number(last.weekly_trips || 0),
      };
    }
  }

  // deals_exec از شیت deal
  const allDeals = Array.isArray(dealsSheet)
    ? dealsSheet
        .map((r) => ({
          group: String(r.group || r.Group || "").toUpperCase(),
          deal: String(r.deal || r.Deal || "").trim(),
          responsible: (r.responsible || r.Responsible || "").trim(),
          status: (r.status || r.Status || "").trim(),
          amount_eur: Number(r.amount_eur || r.amount || r.Amount || 0),
          active: (r.active ?? r.Active ?? "").toString().trim(),
        }))
        .filter((d) => d.group && d.deal)
    : [];

  const CLOSED_WORDS = [
    "delivered",
    "closed",
    "done",
    "completed",
    "تحویل",
    "بسته",
  ];

  const deals_exec = allDeals.filter((d) => {
    if (d.active === "0") return false;
    const s = (d.status || "").toLowerCase();
    return !CLOSED_WORDS.some((w) => s.includes(w));
  });

  // history آخرین ۱۲ هفته هر گروه برای نمودار
  const byGroup = {};
  for (const w of weekly_reports) {
    if (!byGroup[w.group]) byGroup[w.group] = [];
    byGroup[w.group].push(w);
  }

  const history = {};
  for (const [g, arr] of Object.entries(byGroup)) {
    arr.sort(
      (a, b) =>
        new Date(a.date || 0) - new Date(b.date || 0) ||
        String(a.week).localeCompare(String(b.week))
    );

    history[g] = arr.slice(-12).map((r) => ({
      week: r.week,
      date: r.date,
      weekly_sales_eur: r.weekly_sales_eur,
      offers_sent: r.offers_sent,
      in_sales_process: r.in_sales_process,
      total_deals: r.total_deals,
    }));
  }

  // ceo_messages از شیت ceo_messages
  const ceo_messages = {};
  for (const row of ceoSheet) {
    const g = String(row.group || row.Group || "").toUpperCase();
    if (!g) continue;
    ceo_messages[g] = row.message || row.Message || "";
  }

  return {
    groups,
    weekly_reports,
    members,
    latest,
    deals_exec,
    ceo_messages,
    history,
  };
}

// ----------------- HANDLER -----------------
export default async function handler(req, res) {
  try {
    const {
      SHEET_WEEKLY_CSV_URL,
      SHEET_MEMBERS_CSV_URL,
      SHEET_LATEST_CSV_URL,
      SHEET_GROUPS_CSV_URL,
      SHEET_DEALS_CSV_URL,
      SHEET_CEO_MSG_CSV_URL,
    } = process.env;

    let weeklySheet = [],
      membersSheet = [],
      latestSheet = [],
      groupsSheet = [],
      dealsSheet = [],
      ceoSheet = [];

    const fetchCSV = async (url) => {
      if (!url) return [];
      const r = await fetch(url);
      if (!r.ok) throw new Error(`CSV HTTP ${r.status}`);
      const text = await r.text();
      return parseCSV(text);
    };

    try {
      weeklySheet = await fetchCSV(SHEET_WEEKLY_CSV_URL);
      membersSheet = await fetchCSV(SHEET_MEMBERS_CSV_URL);
      latestSheet = await fetchCSV(SHEET_LATEST_CSV_URL);
      groupsSheet = await fetchCSV(SHEET_GROUPS_CSV_URL);
      dealsSheet = await fetchCSV(SHEET_DEALS_CSV_URL);
      ceoSheet = await fetchCSV(SHEET_CEO_MSG_CSV_URL);
    } catch (e) {
      console.warn("CSV fetch failed, fallback to local sample.json", e);
      const file = path.join(process.cwd(), "public", "data", "sample.json");
      const raw = await fs.readFile(file, "utf8");
      const j = JSON.parse(raw);

      weeklySheet = j.weekly_reports || [];
      const rawMembers = j.members || {};
      membersSheet = Array.isArray(rawMembers)
        ? rawMembers
        : Object.entries(rawMembers).flatMap(([g, arr]) =>
            arr.map((m) => ({ group: g, ...m }))
          );
      latestSheet = Object.entries(j.latest || {}).map(
        ([group, payload]) => ({ group, ...payload })
      );
      groupsSheet = j.groups || [];
      dealsSheet = j.deals_exec || [];
      ceoSheet = Object.entries(j.ceo_messages || {}).map(
        ([group, message]) => ({ group, message })
      );
    }

    const payload = mapSheetsToPayload({
      weeklySheet,
      membersSheet,
      latestSheet,
      groupsSheet,
      dealsSheet,
      ceoSheet,
    });

    res.status(200).json(payload);
  } catch (err) {
    console.error("API /api/data error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
}
