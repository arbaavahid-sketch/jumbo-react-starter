import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
} from "recharts";

import LiveClock from "../components/LiveClock";
import NewsTickerEn from "../components/NewsTickerEn";
import {
  FiShoppingBag,
  FiCalendar,
  FiTruck,
  FiAlertCircle,
  FiPackage,
  FiClock,
  FiBarChart2,
  FiTrendingUp,
} from "react-icons/fi";

const fetcher = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

const fmtNum = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const cleanManagerName = (value) =>
  String(value || "")
    .replace(/#/g, "")
    .trim();

function pctDelta(curr, prev) {
  if (curr == null || prev == null) return { pct: 0, dir: 0 };
  const c = Number(curr) || 0;
  const p = Number(prev) || 0;

  if (p === 0) {
    return { pct: c === 0 ? 0 : 100, dir: c === 0 ? 0 : 1, inf: c !== 0 };
  }

  const diff = ((c - p) / Math.abs(p)) * 100;
  return { pct: diff, dir: diff === 0 ? 0 : diff > 0 ? 1 : -1 };
}

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

function StatCard({ label, value, delta, Icon, accent = "#2563eb", onClick }) {
  const clickable = typeof onClick === "function";
  return (
    <div
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      style={{
        position: "relative",
        background: "#ffffff",
        borderRadius: 18,
        padding: 16,
        boxShadow: "0 18px 45px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.25)",
        overflow: "visible",
        transition: "box-shadow 160ms ease",
        cursor: clickable ? "pointer" : "default",
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

      {clickable && (
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: accent,
          }}
        >
          View by manager →
        </div>
      )}
    </div>
  );
}

function BreakdownModal({ title, rows, field, accent, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const items = rows
    .map((r) => ({ manager: cleanManagerName(r.manager), value: Number(r[field]) || 0 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = items.reduce((sum, r) => sum + r.value, 0);

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={modalCardStyle}>
        <div style={modalHeaderStyle}>
          <span>{title}</span>
          <button onClick={onClose} aria-label="Close" style={modalCloseStyle}>
            ×
          </button>
        </div>
        <div style={{ maxHeight: 380, overflow: "auto" }}>
          {items.length === 0 ? (
            <div style={{ padding: 20, color: "#6b7280", fontWeight: 600 }}>No items.</div>
          ) : (
            <table style={modalTableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Supply Side manager</th>
                  <th style={thNumStyle}>Count</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.manager}>
                    <td style={tdLeft}>{r.manager}</td>
                    <td style={tdNum}>{fmtNum(r.value)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...tdLeft, fontWeight: 800 }}>Total</td>
                  <td style={{ ...tdNum, fontWeight: 800, color: accent }}>{fmtNum(total)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function TableCard({ title, children }) {
  const scrollRef = useRef(null);
  const autoScrollIntervalRef = useRef(null);
  const userInteractingRef = useRef(false);
  const resumeTimeoutRef = useRef(null);

  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;

    const stopAutoScroll = () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    };

    const startAutoScroll = () => {
      stopAutoScroll();
      autoScrollIntervalRef.current = setInterval(() => {
        const el = scrollRef.current;
        if (!el || userInteractingRef.current) return;

        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) el.scrollTop = 0;
        else el.scrollTop += 1;
      }, 150);
    };

    startAutoScroll();

    const handleUserInteract = () => {
      userInteractingRef.current = true;
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = setTimeout(() => {
        userInteractingRef.current = false;
      }, 5000);
    };

    box.addEventListener("wheel", handleUserInteract, { passive: true });
    box.addEventListener("touchstart", handleUserInteract, { passive: true });
    box.addEventListener("mousedown", handleUserInteract);

    return () => {
      stopAutoScroll();
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      box.removeEventListener("wheel", handleUserInteract);
      box.removeEventListener("touchstart", handleUserInteract);
      box.removeEventListener("mousedown", handleUserInteract);
    };
  }, [children]);

  return (
    <section
      style={{
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 24px 60px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.35)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid rgba(148,163,184,0.25)",
          fontSize: 18,
          fontWeight: 800,
          color: "#0f172a",
        }}
      >
        {title}
      </div>
      <div ref={scrollRef} style={{ maxHeight: 252, overflow: "auto" }}>
        {children}
      </div>
    </section>
  );
}

export default function SupplyDashboard() {
  const { data, error, isLoading } = useSWR("/api/supply", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });

  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const totals = data?.totals || {};

  // Which card's per-manager breakdown popup is open (null = closed)
  const [modal, setModal] = useState(null);

  const dealsDelta = pctDelta(totals.deals_last_30_days, totals.deals_last_week * 4);
  const weekDelta = pctDelta(totals.deals_last_week, totals.deals_last_30_days / 4);
  const stageDelta = pctDelta(totals.deals_in_supply_side_stage_now, totals.deals_last_week);
  const undeliveredDelta = pctDelta(totals.undelivered_items, totals.open_po_count);
  const lateDelta = pctDelta(totals.late_items, totals.nonplaced_items);
  const poValDelta = pctDelta(totals.po_val_sub_ytd, totals.out_not_billed);

  const chartData = rows.map((r) => ({
    manager: r.manager,
    "Deals last 30": Number(r.deals_last_30_days) || 0,
    "In supply now": Number(r.deals_in_supply_side_stage_now) || 0,
  }));

  return (
    <>
      <Head>
        <title>Supply Dashboard</title>
      </Head>

      <main
        style={{
          minHeight: "100vh",
          padding: "20px 18px 28px",
          fontFamily: "system-ui",
          background:
            "linear-gradient(180deg,rgba(241,245,249,0.9) 0%, rgba(248,250,252,0.95) 40%, #fff 100%)",
        }}
      >
        <div style={{ maxWidth: 1500, margin: "0 auto" }}>
          <div style={{ marginBottom: 12 }}>
            <NewsTickerEn />
          </div>

          <div
            style={{
              marginBottom: 14,
              background: "#e5e7eb",
              borderRadius: 20,
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(28px,3.2vw,46px)",
                lineHeight: 1.1,
                color: "#021d49",
                fontWeight: 800,
              }}
            >
              Supply Side Dashboard
            </h1>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <img
                src="/company-logo.png"
                alt="company logo"
                style={{ width: 180, height: 80, objectFit: "contain", display: "block" }}
              />
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#0f172a",
                  fontWeight: 700,
                }}
              >
                <LiveClock />
              </div>
            </div>
          </div>

          {error ? <div style={errorStyle}>Error loading supply data.</div> : null}

          {isLoading || !data ? <div style={loadingStyle}>Loading supply data...</div> : null}

          {!isLoading && data ? (
            <>
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                  marginBottom: 16,
                }}
              >
                <StatCard
                  label="Deals YTD"
                  value={fmtNum(totals.deals_ytd)}
                  delta={dealsDelta}
                  Icon={FiShoppingBag}
                  accent="#3b82f6"
                />
                <StatCard
                  label="Deals last 30 days"
                  value={fmtNum(totals.deals_last_30_days)}
                  delta={dealsDelta}
                  Icon={FiCalendar}
                  accent="#6366f1"
                />
                <StatCard
                  label="Deals last week"
                  value={fmtNum(totals.deals_last_week)}
                  delta={weekDelta}
                  Icon={FiTrendingUp}
                  accent="#f97316"
                />
                <StatCard
                  label="Deals in supply side stage now"
                  value={fmtNum(totals.deals_in_supply_side_stage_now)}
                  delta={stageDelta}
                  Icon={FiTruck}
                  accent="#22c55e"
                  onClick={() =>
                    setModal({
                      title: "Deals waiting for supply approval — by manager",
                      field: "deals_in_supply_side_stage_now",
                      accent: "#22c55e",
                    })
                  }
                />
                <StatCard
                  label="Undelivered items (ERP)"
                  value={fmtNum(totals.undelivered_items)}
                  delta={undeliveredDelta}
                  Icon={FiPackage}
                  accent="#0ea5e9"
                />
                <StatCard
                  label="Late items (ERP)"
                  value={fmtNum(totals.late_items)}
                  delta={lateDelta}
                  Icon={FiAlertCircle}
                  accent="#ef4444"
                  onClick={() =>
                    setModal({
                      title: "Late items (ERP) — by manager",
                      field: "late_items",
                      accent: "#ef4444",
                    })
                  }
                />
                <StatCard
                  label="Open PO count (ERP)"
                  value={fmtNum(totals.open_po_count)}
                  delta={undeliveredDelta}
                  Icon={FiClock}
                  accent="#14b8a6"
                />
                <StatCard
                  label="PO Val Sub YTD"
                  value={fmtNum(totals.po_val_sub_ytd)}
                  delta={poValDelta}
                  Icon={FiBarChart2}
                  accent="#eab308"
                />
              </div>

              <section
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  boxShadow: "0 24px 60px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.35)",
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 18,
                    color: "#0f172a",
                    margin: "4px 8px 10px",
                  }}
                >
                  Supply Performance Chart
                </div>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 48 }}>
                      <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="manager"
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        height={64}
                        tick={{ fill: "#475569", fontSize: 11 }}
                      />
                      <YAxis tick={{ fill: "#64748b" }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Deals last 30" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="In supply now" fill="#f97316" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                <TableCard title="Supply workload (from HS)">
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Supply Side manager</th>
                        <th style={thNumStyle}>Deals YTD</th>
                        <th style={thNumStyle}>Last 30 Days</th>
                        <th style={thNumStyle}>Deals last week</th>
                        <th style={thNumStyle}>Deals in supply side stage now</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={`w-${cleanManagerName(r.manager)}`}>
                          <td style={tdLeft}>{cleanManagerName(r.manager)}</td>
                          <td style={tdNum}>{fmtNum(r.deals_ytd)}</td>
                          <td style={tdNum}>{fmtNum(r.deals_last_30_days)}</td>
                          <td style={tdNum}>{fmtNum(r.deals_last_week)}</td>
                          <td style={tdNum}>{fmtNum(r.deals_in_supply_side_stage_now)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableCard>

                <TableCard title="Supply workload (from ERP)">
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Supply Side manager</th>
                        <th style={thNumStyle}>Undelivered items (ERP)</th>
                        <th style={thNumStyle}>Nonplaced items (ERP)</th>
                        <th style={thNumStyle}>Late items (ERP)</th>
                        <th style={thNumStyle}>Open PO count (ERP)</th>
                        <th style={thNumStyle}>PO Val Sub YTD</th>
                        <th style={thNumStyle}>Out not billed</th>
                        <th style={thNumStyle}>Out not delivered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={`p-${cleanManagerName(r.manager)}`}>
                          <td style={tdLeft}>{cleanManagerName(r.manager)}</td>
                          <td style={tdNum}>{fmtNum(r.undelivered_items)}</td>
                          <td style={tdNum}>{fmtNum(r.nonplaced_items)}</td>
                          <td style={tdNum}>{fmtNum(r.late_items)}</td>
                          <td style={tdNum}>{fmtNum(r.open_po_count)}</td>
                          <td style={tdNum}>{fmtNum(r.po_val_sub_ytd)}</td>
                          <td style={tdNum}>{fmtNum(r.out_not_billed)}</td>
                          <td style={tdNum}>{fmtNum(r.out_not_delivered)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableCard>
              </div>

              {modal ? (
                <BreakdownModal
                  title={modal.title}
                  rows={rows}
                  field={modal.field}
                  accent={modal.accent}
                  onClose={() => setModal(null)}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}

const loadingStyle = {
  padding: 18,
  borderRadius: 16,
  border: "1px solid #bae6fd",
  background: "#eff6ff",
  color: "#0c4a6e",
};

const errorStyle = {
  padding: 18,
  borderRadius: 16,
  border: "1px solid #fca5a5",
  background: "#fee2e2",
  color: "#991b1b",
  marginBottom: 10,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 980,
};

const modalTableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "rgba(2,6,23,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalCardStyle = {
  width: "min(560px, 100%)",
  background: "#fff",
  borderRadius: 18,
  boxShadow: "0 30px 80px rgba(2,6,23,0.45)",
  overflow: "hidden",
};

const modalHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "14px 16px",
  borderBottom: "1px solid rgba(148,163,184,0.25)",
  fontSize: 16,
  fontWeight: 800,
  color: "#0f172a",
};

const modalCloseStyle = {
  border: "none",
  background: "transparent",
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer",
  color: "#64748b",
  padding: "0 4px",
};

const thStyle = {
  position: "sticky",
  top: 0,
  zIndex: 1,
  textAlign: "left",
  padding: "12px 10px",
  fontSize: 13,
  background: "#f8fafc",
  borderBottom: "1px solid #cbd5e1",
  whiteSpace: "nowrap",
};

const thNumStyle = {
  ...thStyle,
  textAlign: "center",
};

const tdLeft = {
  padding: "10px",
  borderBottom: "1px solid #e2e8f0",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const tdNum = {
  padding: "10px",
  borderBottom: "1px solid #e2e8f0",
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
};
