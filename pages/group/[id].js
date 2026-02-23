// pages/group/[id].js — داشبورد گروه با پیام CEO + KPI + چارت‌ها + NewsTicker
import LogisticAATable from "../../components/LogisticAATable";

import Head from "next/head";
import { useRouter } from "next/router";
import useSWR from "swr";
import { useState, useEffect } from "react";
import NewsTicker from "../../components/NewsTicker";
import NewsTickerEn from "../../components/NewsTickerEn";
import TgjuTickersBlock from "../../components/TgjuTickersBlock";
import DealsExecTable from "../../components/DealsExecTable";
import ARListTable from "../../components/ARListTable";
import CeoMessage from "../../components/CeoMessage";
import LiveClock from "../../components/LiveClock";
import MembersHistoryChart from "../../components/MembersHistoryChart";
import GroupSalesBars from "../../components/GroupSalesBars";
import EventSlideshow from "../../components/EventSlideshow";

import {
  FiTrendingUp,
  FiSend,
  FiShoppingBag,
  FiTruck,
  FiActivity,
  FiAward,
  FiCalendar,
  FiNavigation,
  FiLink,
} from "react-icons/fi";

// ---------- Helpers ----------
const fetcher = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

const fmtEUR = (n) =>
  typeof n === "number"
    ? new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
      }).format(n)
    : "-";

const toStr = (v) => (v == null ? "" : String(v));
const ensureArray = (v) => (Array.isArray(v) ? v : []);
const dateSortValue = (input) => {
  const raw = String(input || "").trim();
  if (!raw) return 0;

  const normalized = raw.replace(/[.]/g, "/").replace(/-/g, "/");
  const parts = normalized.split("/").map((x) => x.trim()).filter(Boolean);

  if (parts.length === 3) {
    let year;
    let month;
    let day;

    if (parts[0].length === 4) {
      year = Number(parts[0]);
      month = Number(parts[1]);
      day = Number(parts[2]);
    } else {
      day = Number(parts[0]);
      month = Number(parts[1]);
      year = Number(parts[2]);
    }

    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      return year * 10000 + month * 100 + day;
    }
  }

  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? ts : 0;
};
const normalizeGroup = (v) => {
  const cleaned = toStr(v)
    .replace(/group/gi, "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();

  if (["1", "A"].includes(cleaned)) return "A";
  if (["2", "B"].includes(cleaned)) return "B";
  if (["3", "C"].includes(cleaned)) return "C";

  return cleaned;
};
function lastTwo(weekly, groupKey) {
  const rows = ensureArray(weekly)
    .filter((r) => toStr(r.group).toUpperCase() === groupKey)
    .slice()
    .sort(
      (a, b) =>
        dateSortValue(a.date) - dateSortValue(b.date) ||
        String(a.week).localeCompare(String(b.week))
    );
  const n = rows.length;
  return { prev: n >= 2 ? rows[n - 2] : null, curr: n >= 1 ? rows[n - 1] : null };
}

function pctDelta(curr, prev) {
  if (curr == null || prev == null) return { pct: 0, dir: 0 };
  const c = Number(curr) || 0;
  const p = Number(prev) || 0;
  if (p === 0)
    return { pct: c === 0 ? 0 : 100, dir: c === 0 ? 0 : 1, inf: c !== 0 };
  const diff = ((c - p) / Math.abs(p)) * 100;
  return { pct: diff, dir: diff === 0 ? 0 : diff > 0 ? 1 : -1 };
}

// ---------- DeltaBadge ----------
function DeltaBadge({ pct, dir, inf }) {
  const arrow = dir > 0 ? "▲" : dir < 0 ? "▼" : "•";
  const color = dir > 0 ? "#0a7f2e" : dir < 0 ? "#c92a2a" : "#6b7280";
  const text = inf ? "100%+" : `${Math.abs(pct).toFixed(1)}%`;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        color,
        background: "rgba(0,0,0,0.04)",
        padding: "2px 8px",
        borderRadius: 999,
      }}
    >
      <span aria-hidden>{arrow}</span>
      <span>{text}</span>
    </span>
  );
}

// ---------- StatCard ----------
function StatCard({ label, value, delta, Icon, accent = "#2563eb", actionIcon }) {
  return (
    <div
      style={{
        position: "relative",
        background: "#ffffff",
        borderRadius: 18,
        padding: 16,
        boxShadow:
          "0 18px 45px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.25)",
        overflow: "visible",
        transition: "box-shadow 160ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          "0 20px 55px rgba(15,23,42,0.14), 0 0 0 1px rgba(148,163,184,0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow =
          "0 18px 45px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.25)";
      }}
    >

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#6b7280",
              marginBottom: 6,
                  fontWeight: 800,          // 👈 این خط رو اضافه کن برای بولد شدن
            }}
          >
            {label}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div
              className="kpi-value"
              style={{ fontWeight: 800, fontSize: 22, color: "#020617" }}
            >
              {value}
            </div>
            {delta ? <DeltaBadge {...delta} /> : null}
          </div>
        </div>

        {/* اگر actionIcon نداشتیم، آیکون معمولی KPI */}
        {Icon && !actionIcon && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(15,23,42,0.06)",
              color: accent,
              boxShadow: "0 0 0 1px rgba(148,163,184,0.35)",
            }}
          >
            <Icon size={16} />
          </div>
        )}

        {/* اگر actionIcon پاس داده شد (مثل لینک MOM) */}
        {actionIcon}
      </div>
    </div>
  );
}

// ---------- GroupDashboard ----------
export default function GroupDashboard() {
  const { isReady, query } = useRouter();

  // 🔴 حالت نمایش: "dashboard" یا "events"
    const [mode, setMode] = useState("dashboard");
// 👇 اضافه کن کنار بقیه SWRها
  const { data: eventsData } = useSWR("/api/events", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 5 * 60_000, // هر ۵ دقیقه یک‌بار چک کنه
  });

  const eventFiles = ensureArray(eventsData?.files);
  const hasEvents = eventFiles.length > 0;

  useEffect(() => {
    // ❗ اگر هیچ عکس/فیلمی نداریم، اصلاً سوییچ به events نکن
    if (!hasEvents) return;

    // الان برای تست ۲ دقیقه گذاشتیم
    const DASHBOARD_DURATION = 45 * 60 * 1000; // بعداً می‌کنی 60 * 60 * 1000
    const EVENTS_DURATION = 10 * 60 * 1000;    // بعداً می‌کنی 10 * 60 * 1000

    const timeout = setTimeout(() => {
      setMode((prev) => (prev === "dashboard" ? "events" : "dashboard"));
    }, mode === "dashboard" ? DASHBOARD_DURATION : EVENTS_DURATION);

    return () => clearTimeout(timeout);
  }, [mode, hasEvents]);


  const id = String(query.id || "1");
  const groupKey = ({ 1: "A", 2: "B", 3: "C" }[id]) || "A";

  // ✅ useSWR همیشه اجرا می‌شود، ولی وقتی isReady نیست، URL = null است
  const {
    data: raw,
    error,
    isLoading,
  } = useSWR(isReady ? "/api/data" : null, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });
  
  // ⬅️ اینجا دیگه می‌تونیم لودینگ و ارور را هندل کنیم
  if (!isReady || isLoading || !raw) {
    return <div style={{ padding: 16 }}>Loading…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 16, color: "#d44800" }}>
        Error loading data: {String(error.message || error)}
      </div>
    );
  }

  const groups = ensureArray(raw.groups);
  const weekly = ensureArray(raw.weekly_reports);
  const members = raw.members || {};
  const latestMap = raw.latest || {};
  const dealsExecAll = ensureArray(raw.deals_exec);
  const ceoMessages = raw.ceo_messages || {};
  const arAll = ensureArray(raw.ar_list);
  const arForGroup = arAll.filter(
    (r) => toStr(r.group).toUpperCase() === groupKey
  );
  
  const megaDealsAll = ensureArray(raw.mega_deals_details || raw.mega_deals); // هر کدوم تو API هست
  const megaDealsForGroup = megaDealsAll.filter(
    (r) => toStr(r.group).toUpperCase() === groupKey
  );
const tripsAll = ensureArray(raw.weekly_trips_details);
const weeklyTripsForGroup = tripsAll.filter(
    (r) => normalizeGroup(r.group) === groupKey
);

  const group =
    groups.find((g) => toStr(g.id) === id) ||
    groups.find(
      (g) => toStr(g.key || g.code || g.slug).toUpperCase() === groupKey
    ) ||
    null;
const logisticRows = ensureArray(raw.logistic_aa); // ✅ بدون فیلتر


  if (!group)
    return (
      <main style={{ padding: 24 }}>
        <h1>Group not found</h1>
      </main>
    );

  const latest = latestMap[groupKey] || {};
  const { prev, curr } = lastTwo(weekly, groupKey);
const normDate = (s) => String(s || "").trim().replace(/\//g, "-");

// ...existing code...
const currTrips = (() => {
  const currTripsCount = Number(curr?.weekly_trips || 0);
  if (!curr || currTripsCount <= 0) return [];

  const currDateRaw = curr?.date || "";
  const currDate = normDate(currDateRaw);

  // آخرین تاریخ موجود در weeklyTripsForGroup (نرمالایز شده)
  const tripDates = weeklyTripsForGroup
    .map((t) => normDate(t?.date))
    .filter(Boolean)
    .sort((a, b) => dateSortValue(a) - dateSortValue(b));
  const latestTripDate = tripDates.length ? tripDates[tripDates.length - 1] : null;

  // اگر تاریخ weekly_reports موجود و مطابق بود، اون رو برگردون،
  // در غیر این صورت از آخرین تاریخ موجود در weekly_trips استفاده کن
  if (currDate) {
    return weeklyTripsForGroup.filter((t) => {
      const td = normDate(t?.date);
      return td === currDate || (latestTripDate && td === latestTripDate);
    });
  }

  return latestTripDate
    ? weeklyTripsForGroup.filter((t) => normDate(t?.date) === latestTripDate)
    : [];
})();
// ...existing code...

  // momLink: اول از latest.mom، اگر خالی بود از آخرین ردیف weekly که mom دارد
  let momLink = toStr(latest.mom || "").trim();
  if (!momLink) {
    const rowsWithMom = weekly
      .filter(
        (r) =>
          toStr(r.group).toUpperCase() === groupKey &&
          toStr(r.mom || "").trim() !== ""
      )
      .slice()
      .sort(
        (a, b) =>
          dateSortValue(a.date) - dateSortValue(b.date) ||
          String(a.week).localeCompare(String(b.week))
      );
    if (rowsWithMom.length) {
      momLink = toStr(rowsWithMom[rowsWithMom.length - 1].mom || "").trim();
    }
  }

  const deltas = {
    weekly_sales_eur: pctDelta(curr?.weekly_sales_eur, prev?.weekly_sales_eur),
    offers_sent: pctDelta(curr?.offers_sent, prev?.offers_sent),
    mega_deals: pctDelta(curr?.mega_deals, prev?.mega_deals),
    active_companies: pctDelta(curr?.active_companies, prev?.active_companies),
    total_sales_eur: pctDelta(curr?.total_sales_eur, prev?.total_sales_eur),
    total_deals: pctDelta(curr?.total_deals, prev?.total_deals),
    in_sales_process: pctDelta(curr?.in_sales_process, prev?.in_sales_process),
    in_supply: pctDelta(curr?.in_supply, prev?.in_supply),
    in_technical: pctDelta(curr?.in_technical, prev?.in_technical),
    weekly_trips: pctDelta(curr?.weekly_trips, prev?.weekly_trips),
  };

  const pageTitle = `Group Dashboard ${groupKey}`;
  const dealsForGroup = dealsExecAll.filter(
    (d) => toStr(d.group).toUpperCase() === groupKey
  );
  const rawCeoText = (ceoMessages[groupKey] ?? "").trim();
  const hasCeoMessage = rawCeoText.length > 0;

  const salesBarData = ["A", "B", "C"].map((gKey) => {
    const row = latestMap[gKey] || {};
    return { label: `Group ${gKey}`, value: Number(row.total_sales_eur || 0) };
  });

    // 🔄 حالت "events": فقط وقتی رویداد داریم
  if (mode === "events" && hasEvents) {
    return (
      <main
        className="container"
        style={{ padding: 0, minHeight: "100vh", background: "#020617" }}
      >
        <Head>
          <title>{pageTitle} – Events</title>
        </Head>

        <EventSlideshow
          files={eventFiles}                 // همون لیستی که بالا از /api/events گرفتی
          onSkip={() => setMode("dashboard")} // برای دکمه Skip اگر گذاشتی
        />
      </main>
    );
  }

  // 🔹 حالت عادی: داشبورد
  return (
     <main className="container">
      <Head>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content={`KPIs, members and weekly deals for group ${groupKey}.`}
        />
      </Head>

      {/* هدر بالا: عنوان + لوگو + ساعت */}
       <div className="dashboard-header">
        <h1 className="dashboard-title">{pageTitle}</h1>
        <div className="dashboard-brand">
          <img
            src="/company-logo.png"
            alt="company logo"
            style={{
              width: 160,
              height: 80,
              objectFit: "contain",
              display: "block",
            }}
          />
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#4b5563",
            }}
          >
            <LiveClock />
          </div>
        </div>
      </div>

      {/* خبر فارسی + TGJU */}
      <section className="section news-section">
        <div className="news-block" style={{ marginBottom: 20 }}>
          <NewsTicker />
        </div>

        <div className="news-block" style={{ marginBottom: 20 }}>
          <TgjuTickersBlock />
        </div>
      </section>

      {/* پیام CEO اگر وجود دارد */}
      {hasCeoMessage && (
        <section className="section" style={{ marginTop: 0 }}>
          <CeoMessage text={rawCeoText} />
        </section>
      )}

      {/* KPI + Charts */}
<section className="section kpi-section" style={{ marginTop: 0, marginBottom: 0 }}>
  {/* 1) KPI grid: 2 rows (4x2) */}
    <div className="dashboard-kpi-grid">
    <StatCard
      label="Total Sales (2026)"
      value={fmtEUR(latest?.total_sales_eur)}
      delta={deltas.total_sales_eur}
      Icon={FiTrendingUp}
      accent="#0ea5e9"
    />
    <StatCard
      label="Offers Sent"
      value={latest?.offers_sent ?? 0}
      delta={deltas.offers_sent}
      Icon={FiSend}
      accent="#6366f1"
    />
    <StatCard
      label="Total Deals in Sales process"
      value={curr?.in_sales_process ?? 0}
      delta={deltas.in_sales_process}
      Icon={FiShoppingBag}
      accent="#f97316"
    />
    <StatCard
      label="Deals in Supply process"
      value={curr?.in_supply ?? 0}
      delta={deltas.in_supply}
      Icon={FiTruck}
      accent="#22c55e"
    />
    <StatCard
      label="Deals in Technical process"
      value={curr?.in_technical ?? 0}
      delta={deltas.in_technical}
      Icon={FiActivity}
      accent="#ec4899"
    />
    <StatCard
      label="Mega Projects"
      value={latest?.mega_deals ?? 0}
      delta={deltas.mega_deals}
      accent="#eab308"
      actionIcon={<MegaDealsIcon deals={megaDealsForGroup} />}
    />
    <StatCard
      label="Last Group Meeting"
      value={latest?.last_meeting || "-"}
      accent="#3b82f6"
      actionIcon={
        momLink ? (
          <a
            href={momLink}
            target="_blank"
            rel="noopener noreferrer"
            title="مشاهده لینک جلسه (MOM)"
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(59,130,246,0.12)",
              color: "#3b82f6",
              boxShadow: "0 0 0 1px rgba(148,163,184,0.35)",
              textDecoration: "none",
            }}
          >
            <FiLink size={16} />
          </a>
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(15,23,42,0.06)",
              color: "#3b82f6",
              boxShadow: "0 0 0 1px rgba(148,163,184,0.35)",
            }}
          >
            <FiCalendar size={16} />
          </div>
        )
      }
    />
    <StatCard
      label="Weekly Trips"
      value={latest?.weekly_trips ?? 0}
      delta={deltas.weekly_trips}
      accent="#0d9488"
      actionIcon={<WeeklyTripsIcon trips={currTrips} currDate={curr?.date} />}
    />
  </div>

  {/* 2) Charts row: same height */}
    <div className="dashboard-two-col-grid" style={{ marginTop: 14 }}>
    <div style={{ height: 320 }}>
      <GroupSalesBars data={salesBarData} />
    </div>

    <div style={{ height: 320 }}>
      <MembersHistoryChart rows={members[groupKey] || []} />
    </div>
  </div>
</section>



     {/* Tables */}
<div style={{ marginTop: 0 }}>
  {/* Row 1: Deal Exec + AR */}
    <div className="dashboard-two-col-grid">
    <div>
  <DealsExecTable rows={dealsForGroup} />
</div>

<div>
  <ARListTable rows={arForGroup} />
</div>

  </div>

  {/* Row 2: Logistic AA (فاصله کم) */}
  <div style={{ marginTop: 0 }}>
    <LogisticAATable rows={logisticRows} />
  </div>
</div>




      {/* Bloomberg News پایین صفحه */}
      <section className="section">
        <div className="news-block" style={{ marginTop: 24 }}>
          <NewsTickerEn />
        </div>
      </section>
    </main>
  );
}
// ---------- MegaDealsIcon (آیکون + پنل ثابت گوشه صفحه) ----------
function MegaDealsIcon({ deals }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* آیکون کوچک روی کارت */}
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title="نمایش Mega Deals"
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.6)",
            background: "rgba(250,250,250,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <FiAward size={16} color="#eab308" />
        </button>
      </div>

      {/* اگر باز بود → پنل گوشه صفحه */}
      {open && (
        <>
          {/* لایه برای بستن با کلیک بیرون */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "transparent",
              zIndex: 9998,
            }}
          />

          {/* پنل ثابت */}
          <div
            style={{
              position: "fixed",
              top: 90,
              right: 40,
              minWidth: 360,
              maxHeight: 320,
              background: "#ffffff",
              borderRadius: 16,
              boxShadow:
                "0 20px 60px rgba(15,23,42,0.25), 0 0 0 1px rgba(148,163,184,0.45)",
              padding: 14,
              zIndex: 9999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Mega Deals
              </div>

              <button
                onClick={() => setOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {!deals || deals.length === 0 ? (
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                No Mega Deals
              </div>
            ) : (
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  maxHeight: 260,
                  overflowY: "auto",
                }}
              >
                {deals.map((d, i) => (
                  <li
                    key={i}
                    style={{
                      padding: "6px 4px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {i + 1}. {d.project_name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6b7280",
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <span>ID: {d.mega_deal_id}</span>
                      <span>Owner: {d.owner}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  );
}
function WeeklyTripsIcon({ trips, currDate }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // --- helpers ---
  const toDateMs = (s) => {
    if (!s) return 0;
    // پشتیبانی از yyyy/mm/dd یا yyyy-mm-dd
    const norm = String(s).trim().replace(/\//g, "-");
    const t = Date.parse(norm);
    return Number.isFinite(t) ? t : 0;
  };

  const list = Array.isArray(trips) ? trips : [];

  

  // مرتب‌سازی شیک‌تر
const sortedTrips = list.slice().sort((a, b) => {
    const ac = String(a.company_name || "").localeCompare(String(b.company_name || ""));
    if (ac !== 0) return ac;
    return String(a.owner || "").localeCompare(String(b.owner || ""));
  });

  return (
    <>
      {/* آیکون روی کارت */}
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title="Weekly Trips Details"
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.6)",
            background: "rgba(250,250,250,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <FiNavigation size={16} color="#0d9488" />
        </button>
      </div>

      {open && (
        <>
          {/* کلیک بیرون = بستن */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.10)",
              zIndex: 9998,
            }}
          />

          {/* پنل (✅ ریسپانسیو کامل موبایل) */}
          <div
            style={{
              position: "fixed",
              top: isMobile ? 70 : 90,
              left: isMobile ? 12 : "auto",
              right: isMobile ? 12 : 40,

              width: isMobile ? "auto" : 420,
              maxWidth: isMobile ? "calc(100vw - 24px)" : 520,

              maxHeight: isMobile ? "70vh" : 360,
              background: "#ffffff",
              borderRadius: 16,
              boxShadow:
                "0 20px 60px rgba(15,23,42,0.25), 0 0 0 1px rgba(148,163,184,0.45)",
              padding: 14,
              zIndex: 9999,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
                gap: 12,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>
                  Weekly Trips Details
                </div>
                {currDate ? (
  <div style={{ fontSize: 11, color: "#64748b" }}>
    Week Date: {currDate}
  </div>
) : null}

              </div>

              <button
                onClick={() => setOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 20,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Content */}
            {sortedTrips.length === 0 ? (
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                No trips recorded
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 12,
                  overflow: "auto",
                  maxHeight: isMobile ? "calc(70vh - 70px)" : 300,
                  boxShadow: "inset 0 0 0 1px rgba(226,232,240,0.9)",
                }}
              >
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {sortedTrips.map((t, i) => (
                    <li
                      key={i}
                      style={{
                        padding: "10px 10px",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      {/* ✅ به جای Trip: اسم کمپانی */}
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                        {i + 1}. {t.company_name || "—"}
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          color: "#6b7280",
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          marginTop: 4,
                        }}
                      >
                        {t.date ? <span>Date: {t.date}</span> : null}
                        {t.owner ? <span>Owner: {t.owner}</span> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}