// pages/share/[slug].js — داشبورد عمومی گروه/تکنیکال بر اساس slug (مثلاً /share/...)
import LogisticAATable from "../../components/LogisticAATable";

import Head from "next/head";
import useSWR from "swr";
import React, { useEffect, useState } from "react";

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

import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from "recharts";



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
  FiPlusCircle,
  FiCheckCircle,
  FiList,
  FiBriefcase,
  FiCamera,
  FiBookOpen,
} from "react-icons/fi";

// ---------- getServerSideProps ----------
export async function getServerSideProps(context) {
  const { slug } = context.params || {};
  const groupKey = PUBLIC_SHARE_MAP[slug] || null;

  if (!groupKey) return { notFound: true };

  return {
    props: { slug, groupKey },
  };
}
const fetcher = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

const fmtEUR = (n) => {
  if (typeof n !== "number") return "-";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
};


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

function lastTwoRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { curr: null, prev: null };
  const sorted = [...rows].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const n = sorted.length;
  return { prev: n >= 2 ? sorted[n - 2] : null, curr: sorted[n - 1] };
}

function pctDelta(curr, prev) {
  if (curr == null || prev == null) return { pct: 0, dir: 0 };
  const c = Number(curr) || 0;
  const p = Number(prev) || 0;

  if (p === 0) return { pct: c === 0 ? 0 : 100, dir: c === 0 ? 0 : 1, inf: c !== 0 };

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

// ---------- StatCard (✅ اصلاح شده مثل کد اصلی) ----------
function StatCard({ label, value, delta, Icon, accent = "#2563eb", actionIcon }) {
  return (
    <div
      style={{
        position: "relative",
        background: "#ffffff",
        borderRadius: 18,
        padding: 16,
        boxShadow: "0 18px 45px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.25)",
        overflow: "visible", // ✅ خیلی مهم
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
              fontWeight: 800,
            }}
          >
            {label}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 22, color: "#020617" }}>{value}</div>
            {delta ? <DeltaBadge {...delta} /> : null}
          </div>
        </div>

        {/* اگر actionIcon نداشتیم آیکون معمولی */}
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

        {/* اگر actionIcon پاس داده شد */}
        {actionIcon}
      </div>
    </div>
  );
}

function PublicGroupDashboard({ groupKey }) {
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
  const logisticRows = ensureArray(raw.logistic_aa);

  const arForGroup = arAll.filter((r) => toStr(r.group).toUpperCase() === groupKey);

  // ✅ Mega Deals
  const megaDealsAll = ensureArray(raw.mega_deals_details || raw.mega_deals);

  const normalizeGroup = (v) =>
    toStr(v).replace(/group/gi, "").trim().toUpperCase();

  let megaDealsForGroup = megaDealsAll.filter((r) => normalizeGroup(r.group) === groupKey);
  if (!megaDealsForGroup.length) megaDealsForGroup = megaDealsAll;

  // ✅ Weekly Trips details
  const tripsAll = ensureArray(raw.weekly_trips_details);
  const weeklyTripsForGroup = tripsAll.filter((r) => toStr(r.group).toUpperCase() === groupKey);

  const latest = latestMap[groupKey] || {};
  const { prev, curr } = lastTwo(weekly, groupKey);

  const normDate = (s) => String(s || "").trim().replace(/\//g, "-");

  const currTrips = (() => {
    const currTripsCount = Number(curr?.weekly_trips || 0);
    if (!curr || currTripsCount <= 0) return [];
    const currDate = normDate(curr?.date);
    if (!currDate) return [];
    return weeklyTripsForGroup.filter((t) => normDate(t?.date) === currDate);
  })();

  // momLink
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
          new Date(a.date || 0) - new Date(b.date || 0) ||
          String(a.week).localeCompare(String(b.week))
      );
    if (rowsWithMom.length) momLink = toStr(rowsWithMom[rowsWithMom.length - 1].mom || "").trim();
  }

  const deltas = {
    offers_sent: pctDelta(curr?.offers_sent, prev?.offers_sent),
    mega_deals: pctDelta(curr?.mega_deals, prev?.mega_deals),
    total_sales_eur: pctDelta(curr?.total_sales_eur, prev?.total_sales_eur),
    in_sales_process: pctDelta(curr?.in_sales_process, prev?.in_sales_process),
    in_supply: pctDelta(curr?.in_supply, prev?.in_supply),
    in_technical: pctDelta(curr?.in_technical, prev?.in_technical),
    weekly_trips: pctDelta(curr?.weekly_trips, prev?.weekly_trips),
  };

  const pageTitle = `Group Dashboard ${groupKey}`;

  const dealsForGroup = dealsExecAll.filter((d) => toStr(d.group).toUpperCase() === groupKey);

  const rawCeoText = (ceoMessages[groupKey] ?? "").trim();
  const hasCeoMessage = rawCeoText.length > 0;

  const salesBarData = groups.map((g) => {
    const k = String(g.key || g.code || g.slug || "").toUpperCase();
    const row = latestMap[k] || {};
    return { label: g.name || `Group ${k}`, value: Number(row.total_sales_eur || 0) };
  });

  return (
     <main className="container">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={`KPIs, members and weekly deals for group ${groupKey}.`} />
      </Head>

      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">{pageTitle}</h1>
        <div className="dashboard-brand">
          <img
            src="/company-logo.png"
            alt="company logo"
            style={{ width: 160, height: 80, objectFit: "contain", display: "block" }}
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

      {/* News */}
      <section className="section news-section">
        <div className="news-block" style={{ marginBottom: 20 }}>
          <NewsTicker />
        </div>
        <div className="news-block" style={{ marginBottom: 20 }}>
          <TgjuTickersBlock />
        </div>
      </section>

      {hasCeoMessage && (
        <section className="section" style={{ marginTop: 16 }}>
          <CeoMessage text={rawCeoText} />
        </section>
      )}

      <section className="section kpi-section" style={{ marginTop: 8, marginBottom: 0, paddingBottom: 0 }}>
  {/* KPI grid: 2 rows (4x2) */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: 12,
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
          {/* Charts row: same height */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginTop: 14,
      alignItems: "stretch",
    }}
  >
    <div style={{ height: 320 }}>
      <GroupSalesBars data={salesBarData} />
    </div>

    <div style={{ height: 320 }}>
      <MembersHistoryChart rows={members[groupKey] || []} />
    </div>
  </div>
</section>

      <section className="section" style={{ marginTop: 14, paddingTop: 0 }}>
  {/* Row 1: Deal Exec + AR (same size) */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      alignItems: "stretch",
    }}
  >
    <div style={{ height: 360 }}>
      <DealsExecTable rows={dealsForGroup} />
    </div>

    <div style={{ height: 360 }}>
      <ARListTable rows={arForGroup} />
    </div>
    <div style={{ marginTop: 14 }}>
</div>

  </div>

  {/* Row 2: Logistic AA full width */}
  <div style={{ marginTop: 0 }}>
    <LogisticAATable rows={ensureArray(raw.logistic_aa)} />
  </div>
</section>


      {/* Bloomberg News */}
      <section className="section">
        <div className="news-block" style={{ marginTop: 24 }}>
          <NewsTickerEn />
        </div>
      </section>
    </main>
  );
}

// ---------- PublicTechnicalDashboard ----------
function PublicTechnicalDashboard() {
  const { data, error, isLoading } = useSWR("/api/technical", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });

  const { data: mainData } = useSWR("/api/data", fetcher, {
    revalidateOnFocus: false,
  });

  const ceoMessages = mainData?.ceo_messages || {};
  const ceoText =
    ceoMessages.TECH ||
    ceoMessages.TECHNICAL ||
    "Technical CEO message — editable in CEO Messages panel.";

  const techQueueRaw = Array.isArray(mainData?.technical_queue) ? mainData.technical_queue : [];
  const techQueue = [...techQueueRaw].sort((a, b) => {
    const ga = (a.group || "").localeCompare(b.group || "");
    if (ga !== 0) return ga;
    return (a.deal || "").localeCompare(b.deal || "");
  });

  let body;

  if (error) {
    body = (
      <div
        style={{
          padding: 24,
          borderRadius: 24,
          background: "linear-gradient(135deg,rgba(239,68,68,0.08),rgba(248,113,113,0.25))",
          color: "#7f1d1d",
          border: "1px solid rgba(248,113,113,0.45)",
        }}
      >
        Error loading technical data.
      </div>
    );
  } else if (isLoading || !data) {
    body = (
      <div
        style={{
          padding: 24,
          borderRadius: 24,
          background: "linear-gradient(135deg,rgba(0,95,158,0.05),rgba(0,184,148,0.05))",
          border: "1px solid rgba(148,163,184,0.35)",
          color: "#4b5563",
        }}
      >
        Loading technical data…
      </div>
    );
  } else if (!data.latest) {
    body = (
      <div
        style={{
          padding: 24,
          borderRadius: 24,
          background: "linear-gradient(135deg,rgba(0,95,158,0.08),rgba(0,184,148,0.10))",
          boxShadow: "0 24px 60px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.35)",
          color: "#0f172a",
        }}
      >
        No technical data yet.
      </div>
    );
  } else {
    const t = data.latest;
    const { curr, prev } = lastTwoRows(data.rows);

    const deltas = {
      queue: pctDelta(curr?.remaining_queue, prev?.remaining_queue),
      waiting: pctDelta(curr?.waiting_installation, prev?.waiting_installation),
    };

    const dealsChartData = [
      { name: "Aref", weeklyDeals: t.aref_deals_done ?? 0, totalDeals: t.aref ?? 0 },
      { name: "Golsanam", weeklyDeals: t.golsanam_deals_done ?? 0, totalDeals: t.golsanam ?? 0 },
      { name: "Vahid", weeklyDeals: t.vahid_deals_done ?? 0, totalDeals: t.vahid ?? 0 },
      { name: "Pouria", weeklyDeals: t.pouria_deals_done ?? 0, totalDeals: t.pouria ?? 0 },
    ];

    body = (
      <div
        style={{
          borderRadius: 28,
          padding: 24,
          background: "#f9fafb",
          boxShadow: "0 24px 60px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.3)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 18,
          }}
        >
          <TechCard icon={<FiCalendar />} label="Date of Publish" value={t.date} />
          <TechCard icon={<FiPlusCircle />} label="Deals added this week" value={t.deals_added_technical} />
          <TechCard icon={<FiCheckCircle />} label="Total deals done (week)" value={t.total_deals_week} />
          <TechCard icon={<FiList />} label="Technical Approval Queue" value={t.remaining_queue} delta={deltas.queue} />
          <TechCard icon={<FiTruck />} label="Waiting for Installation" value={t.waiting_installation} delta={deltas.waiting} />
          <TechCard icon={<FiBriefcase />} label="Promotion trips / meetings" value={t.promotion_trips} />
          <TechCard icon={<FiCamera />} label="Demo shows (quarterly)" value={t.demo_shows} />
          <TechCard icon={<FiBookOpen />} label="Internal trainings (quarterly)" value={t.internal_trainings} />
          <TechCard icon={<FiLink />} label="MOM link" value="Open" link={t.mom_link} />
        </div>

        <div style={{ marginTop: 28 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#6b7280",
              marginBottom: 8,
            }}
          >
            Deals done during the week by person
          </div>

          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 18px 45px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.35)",
              background: "#ffffff",
              height: 260,
              padding: "12px 16px",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dealsChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis allowDecimals={false} stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(148,163,184,0.6)",
                    borderRadius: 8,
                    color: "#0f172a",
                  }}
                />
                <Legend />
                <Bar dataKey="weeklyDeals" name="Deals this week" fill="#38bdf8" radius={[6, 6, 0, 0]} barSize={38} />
                <Bar dataKey="totalDeals" name="Total deals" fill="#0f766e" radius={[6, 6, 0, 0]} barSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tech Queue */}
        <div style={{ marginTop: 36 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6b7280",
              marginBottom: 10,
            }}
          >
            Technical Approval Queue
          </div>

          {techQueue.length === 0 ? (
            <div
              style={{
                fontSize: 13,
                padding: 10,
                borderRadius: 16,
                background: "rgba(148,163,184,0.1)",
                color: "#6b7280",
                border: "1px dashed rgba(148,163,184,0.6)",
              }}
            >
              No items in technical queue.
            </div>
          ) : (
            <div
              style={{
                borderRadius: 20,
                boxShadow: "0 22px 60px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.35)",
                background: "#ffffff",
                maxHeight: 340,
                overflowY: "auto",
                overflowX: "auto",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 }}>
                <thead>
                  <tr style={{ background: "linear-gradient(135deg,rgba(0,95,158,0.12),rgba(0,184,148,0.12))" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#0f172a", borderBottom: "1px solid rgba(148,163,184,0.6)", whiteSpace: "nowrap" }}>
                      Owner
                    </th>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#0f172a", borderBottom: "1px solid rgba(148,163,184,0.6)" }}>
                      Deal
                    </th>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#0f172a", borderBottom: "1px solid rgba(148,163,184,0.6)" }}>
                      Center
                    </th>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#0f172a", borderBottom: "1px solid rgba(148,163,184,0.6)" }}>
                      Subject
                    </th>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#0f172a", borderBottom: "1px solid rgba(148,163,184,0.6)", whiteSpace: "nowrap" }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {techQueue.map((row, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                      <td style={{ padding: "7px 10px", borderBottom: idx === techQueue.length - 1 ? "none" : "1px solid rgba(226,232,240,0.9)", fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>
                        {row.group}
                      </td>
                      <td style={{ padding: "7px 10px", borderBottom: idx === techQueue.length - 1 ? "none" : "1px solid rgba(226,232,240,0.9)", color: "#111827", fontWeight: 500 }}>
                        {row.deal}
                      </td>
                      <td style={{ padding: "7px 10px", borderBottom: idx === techQueue.length - 1 ? "none" : "1px solid rgba(226,232,240,0.9)", color: "#374151" }}>
                        {row.center || "—"}
                      </td>
                      <td style={{ padding: "7px 10px", borderBottom: idx === techQueue.length - 1 ? "none" : "1px solid rgba(226,232,240,0.9)", color: "#374151" }}>
                        {row.subject || "—"}
                      </td>
                      <td style={{ padding: "7px 10px", borderBottom: idx === techQueue.length - 1 ? "none" : "1px solid rgba(226,232,240,0.9)", color: row.status ? "#0f766e" : "#9ca3af", whiteSpace: "nowrap" }}>
                        {row.status || "In process"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px 24px 40px",
        background: "#f3f6fb",
        color: "#0f172a",
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
      }}
    >
      <Head>
        <title>Technical Dashboard</title>
      </Head>

      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: "#005F9E" }}>
              Technical Dashboard
            </h1>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <div style={{ padding: 10, borderRadius: 18, background: "#ffffff", border: "1px solid rgba(148,163,184,0.35)", boxShadow: "0 10px 25px rgba(15,23,42,0.08)" }}>
              <img src="/company-logo.png" style={{ width: 150, height: 70, objectFit: "contain" }} alt="Company logo" />
            </div>
            <div style={{ fontSize: 12, padding: "4px 14px", borderRadius: 999, background: "#ffffff", border: "1px solid rgba(148,163,184,0.4)", boxShadow: "0 8px 20px rgba(15,23,42,0.06)", color: "#005F9E" }}>
              <LiveClock />
            </div>
          </div>
        </div>

        <div
          style={{
            marginBottom: 18,
            borderRadius: 20,
            background: "linear-gradient(135deg,rgba(0,95,158,0.06),rgba(0,184,148,0.06))",
            padding: 16,
            boxShadow: "0 14px 30px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.25)",
          }}
        >
          <CeoMessage text={ceoText} />
        </div>

        {body}
      </div>
    </main>
  );
}

/* --- کارت‌ها با آیکون برای داشبورد فنی --- */
function TechCard({ icon, label, value, link, delta }) {
  const hasLink = !!link;

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 16,
        background: "linear-gradient(135deg,rgba(0,95,158,0.08),rgba(0,184,148,0.06))",
        boxShadow: "0 12px 30px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.3)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 110,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22, color: "#005F9E" }}>{icon}</span>
        <span style={{ fontSize: 11, color: "#6b7280", letterSpacing: "0.16em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
          {hasLink ? (
            link ? (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#ffffff",
                  textDecoration: "none",
                  fontSize: 14,
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: "1px solid #005F9E",
                  background: "linear-gradient(135deg,#005F9E,#00B894)",
                  boxShadow: "0 8px 18px rgba(15,23,42,0.2)",
                }}
              >
                {value || "Open"}
              </a>
            ) : (
              "-"
            )
          ) : (
            value ?? 0
          )}
        </span>

        {delta && !hasLink && <DeltaBadge {...delta} />}
      </div>
    </div>
  );
}

// ---------- MegaDealsIcon ----------
function MegaDealsIcon({ deals }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* آیکون روی کارت */}
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
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

      {open && (
        <>
          {/* کلیک بیرون → بسته */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.10)",
              zIndex: 2147483646,
            }}
          />

          {/* پنل */}
          <div
            style={{
              position: "fixed",
              top: 90,
              right: 40,
              minWidth: 360,
              maxWidth: "calc(100vw - 80px)",
              maxHeight: 340,
              background: "#ffffff",
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(15,23,42,0.25), 0 0 0 1px rgba(148,163,184,0.45)",
              padding: 14,
              zIndex: 2147483647,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Mega Deals</div>
              <button
                onClick={() => setOpen(false)}
                style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer" }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {!deals || deals.length === 0 ? (
              <div style={{ fontSize: 12, color: "#6b7280" }}>No Mega Deals</div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", maxHeight: 280, overflowY: "auto" }}>
                {deals.map((d, i) => (
                  <li key={i} style={{ padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{i + 1}. {d.project_name}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                      <span>ID: {d.mega_deal_id}</span>
                      <span>Owner: {d.owner}</span>
                      <span>Date: {d.date || "-"}</span>
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

// ---------- WeeklyTripsIcon ----------
function WeeklyTripsIcon({ trips, currDate }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const list = Array.isArray(trips) ? trips : [];
  const sortedTrips = list.slice().sort((a, b) => {
    const ac = String(a.company_name || "").localeCompare(String(b.company_name || ""));
    if (ac !== 0) return ac;
    return String(a.owner || "").localeCompare(String(b.owner || ""));
  });

  return (
    <>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
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
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.10)",
              zIndex: 2147483646,
            }}
          />

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
              boxShadow: "0 20px 60px rgba(15,23,42,0.25), 0 0 0 1px rgba(148,163,184,0.45)",
              padding: 14,
              zIndex: 2147483647,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>Weekly Trips Details</div>
                {currDate ? <div style={{ fontSize: 11, color: "#64748b" }}>Week Date: {currDate}</div> : null}
              </div>

              <button
                onClick={() => setOpen(false)}
                style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer", lineHeight: 1 }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {sortedTrips.length === 0 ? (
              <div style={{ fontSize: 12, color: "#6b7280" }}>No trips recorded</div>
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
                    <li key={i} style={{ padding: "10px 10px", borderBottom: "1px solid #e5e7eb" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                        {i + 1}. {t.company_name || "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280", display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
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

// ---------- Default Export Wrapper ----------
export default function PublicSharePage(props) {
  if (props.groupKey === "TECHNICAL") return <PublicTechnicalDashboard />;
  return <PublicGroupDashboard {...props} />;
}
