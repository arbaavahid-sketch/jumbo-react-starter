// pages/share/[slug].js — داشبورد عمومی گروه بر اساس slug (مثلاً /share/A)

import Head from "next/head";
import useSWR from "swr";
import { PUBLIC_SHARE_MAP } from "../../lib/publicShareMap";

import NewsTickerEn from "../../components/NewsTickerEn";
import NewsTicker from "../../components/NewsTicker";
import DealsExecTable from "../../components/DealsExecTable";
import ARListTable from "../../components/ARListTable";
import CeoMessage from "../../components/CeoMessage";
import LiveClock from "../../components/LiveClock";
import TgjuTickersBlock from "../../components/TgjuTickersBlock";
import MembersHistoryChart from "../../components/MembersHistoryChart";
import GroupSalesBars from "../../components/GroupSalesBars";

import {
  FiTrendingUp,
  FiSend,
  FiShoppingBag,
  FiTruck,
  FiActivity,
  FiAward,
  FiCalendar,
  FiNavigation,
} from "react-icons/fi";

// ---------- getServerSideProps: گرفتن slug از URL ----------
export async function getServerSideProps(context) {
  const { slug } = context.params || {};

  const groupKey = PUBLIC_SHARE_MAP[slug] || null;

  if (!groupKey) {
    // اگر اسلاگ توی map نبود → 404
    return { notFound: true };
  }

  return {
    props: {
      slug,
      groupKey,
    },
  };
}


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

function lastTwo(weekly, groupKey) {
  const rows = ensureArray(weekly)
    .filter((r) => toStr(r.group).toUpperCase() === groupKey)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.date || 0) - new Date(b.date || 0) ||
        String(a.week).localeCompare(String(b.week))
    );
  const n = rows.length;
  return { prev: n >= 2 ? rows[n - 2] : null, curr: n >= 1 ? rows[n - 1] : null };
}

function pctDelta(curr, prev) {
  if (curr == null || prev == null) return { pct: 0, dir: 0 };
  const c = Number(curr) || 0;
  const p = Number(prev) || 0;
  if (p === 0) return { pct: c === 0 ? 0 : 100, dir: c === 0 ? 0 : 1, inf: c !== 0 };
  const diff = ((c - p) / Math.abs(p)) * 100;
  return { pct: diff, dir: diff === 0 ? 0 : diff > 0 ? 1 : -1 };
}

// ---------- DeltaBadge Component ----------
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

// ---------- StatCard Component ----------
function StatCard({ label, value, delta, Icon, accent = "#2563eb" }) {
  return (
    <div
      style={{
        position: "relative",
        background: "#ffffff",
        borderRadius: 18,
        padding: 16,
        boxShadow:
          "0 18px 45px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.25)",
        overflow: "hidden",
        transition: "transform 160ms ease, box-shadow 160ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow =
          "0 20px 55px rgba(15,23,42,0.14), 0 0 0 1px rgba(148,163,184,0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          "0 18px 45px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.25)";
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at top right, rgba(37,99,235,0.18), transparent 55%)",
          opacity: 0.9,
        }}
      />
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
            }}
          >
            {label}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 22, color: "#020617" }}>
              {value}
            </div>
            {delta ? <DeltaBadge {...delta} /> : null}
          </div>
        </div>
        {Icon && (
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
      </div>
    </div>
  );
}

// ---------- PublicGroupDashboard Component ----------
export default function PublicGroupDashboard({ slug, groupKey }) {
  // دیگه لازم نیست از slug حدس بزنیم، مستقیم groupKey رو داریم


  const { data: raw, error, isLoading } = useSWR("/api/data", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });

  if (error)
    return (
      <div style={{ padding: 16, color: "#d44800" }}>
        Error loading data: {String(error.message || error)}
      </div>
    );
  if (isLoading || !raw) return <div style={{ padding: 16 }}>Loading…</div>;

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

  // اینجا بر خلاف /group/[id] فقط براساس key گروه را پیدا می‌کنیم
  const group =
    groups.find(
      (g) => toStr(g.key || g.code || g.slug).toUpperCase() === groupKey
    ) || null;

  if (!group)
    return (
      <main style={{ padding: 24 }}>
        <h1>Group not found</h1>
      </main>
    );

  const latest = latestMap[groupKey] || {};
  const { prev, curr } = lastTwo(weekly, groupKey);

  const deltas = {
    weekly_sales_eur: pctDelta(curr?.weekly_sales_eur, prev?.weekly_sales_eur),
    offers_sent: pctDelta(curr?.offers_sent, prev?.offers_sent),
    mega_deals: pctDelta(curr?.mega_deals, prev?.mega_deals),
    active_companies: pctDelta(
      curr?.active_companies,
      prev?.active_companies
    ),
    total_sales_eur: pctDelta(curr?.total_sales_eur, prev?.total_sales_eur),
    total_deals: pctDelta(curr?.total_deals, prev?.total_deals),
    in_sales_process: pctDelta(
      curr?.in_sales_process,
      prev?.in_sales_process
    ),
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

  // به جای ["A","B","C"]، داینامیک از groups می‌سازیم
  const salesBarData = groups.map((g) => {
    const k = String(g.key || g.code || g.slug || "").toUpperCase();
    const row = latestMap[k] || {};
    return {
      label: g.name || `Group ${k}`,
      value: Number(row.total_sales_eur || 0),
    };
  });

  return (
    <main className="container" style={{ padding: 24 }}>
      <Head>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content={`KPIs, members and weekly deals for group ${groupKey}.`}
        />
      </Head>

      {/* هدر بالا: عنوان + لوگو + ساعت */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 12,
        }}
      >
        <h1 style={{ margin: 0 }}>{pageTitle}</h1>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
          }}
        >
          <img
            src="/company-logo.svg"
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

      <section>
        <div style={{ marginBottom: 20 }}>
          <NewsTicker />
        </div>

        <div style={{ marginBottom: 20 }}>
          <TgjuTickersBlock />
        </div>

        <div style={{ marginBottom: 32 }}>
          <NewsTickerEn />
        </div>
      </section>

      {/* KPI Cards + Sales Bars */}
      <section style={{ marginTop: 8 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,2fr) minmax(0,1.4fr)",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          {/* KPI Cards */}
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
                gap: 18,
              }}
            >
              <StatCard
                label="Total Sales (2025)"
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
                Icon={FiAward}
                accent="#eab308"
              />
              <StatCard
                label="Last Group Meeting"
                value={latest?.last_meeting || "-"}
                Icon={FiCalendar}
                accent="#3b82f6"
              />
              <StatCard
                label="Weekly Trips"
                value={latest?.weekly_trips ?? 0}
                delta={deltas.weekly_trips}
                Icon={FiNavigation}
                accent="#0d9488"
              />
            </div>
          </div>

          {/* Sales Bars */}
          <div>
            <GroupSalesBars data={salesBarData} />
          </div>
        </div>
      </section>

      {/* Members chart + DealsExec table + AR List */}
      <section style={{ marginTop: 32 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <div>
            <MembersHistoryChart rows={members[groupKey] || []} />
          </div>

          <div>
            <DealsExecTable rows={dealsForGroup} />
            <ARListTable rows={arForGroup} />
          </div>
        </div>
      </section>

      {/* (اختیاری) اگر خواستی پیام CEO هم اضافه کن */}
      {hasCeoMessage && (
        <section style={{ marginTop: 32 }}>
          <CeoMessage text={rawCeoText} />
        </section>
      )}
    </main>
  );
}
