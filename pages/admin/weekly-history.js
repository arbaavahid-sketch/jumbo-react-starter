// pages/admin/weekly-history.js
import Link from "next/link";
import useSWR from "swr";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

const fetcher = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

const normGroup = (v) => String(v || "").trim().toUpperCase();
const num = (v) => (typeof v === "number" ? v : Number(v || 0));

const fmtEUR = (n) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmt = (n) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const KPI_OPTIONS = [
  { key: "weekly_sales_eur", label: "Weekly Sales (€)", kind: "eur" },
  { key: "offers_sent", label: "Offers Sent", kind: "num" },
  { key: "total_deals", label: "Total Deals", kind: "num" },
  { key: "in_sales_process", label: "Deals in Sales", kind: "num" },
  { key: "in_technical", label: "Deals in Technical", kind: "num" },
  { key: "in_supply", label: "Deals in Supply", kind: "num" },
  { key: "mega_deals", label: "Mega Projects", kind: "num" },
  { key: "weekly_trips", label: "Weekly Trips", kind: "num" },
];

const KPI_ICONS = {
  weekly_sales_eur: "€",
  offers_sent: "✈",
  total_deals: "Σ",
  in_sales_process: "🛍",
  in_technical: "⚡",
  in_supply: "🚚",
  mega_deals: "🏆",
  weekly_trips: "🧭",
};

const formatByKind = (kind, v) => (kind === "eur" ? fmtEUR(num(v)) : fmt(num(v)));

function calcDelta(curr, prev) {
  const c = num(curr);
  const p = num(prev);
  const abs = c - p;

  if (p === 0) {
    if (c === 0) return { dir: 0, pct: 0, pctText: "0%", abs, inf: false };
    return { dir: 1, pct: 100, pctText: "100%+", abs, inf: true };
  }

  const pct = ((c - p) / Math.abs(p)) * 100;
  const dir = pct === 0 ? 0 : pct > 0 ? 1 : -1;
  return { dir, pct, pctText: `${Math.abs(pct).toFixed(1)}%`, abs, inf: false };
}

// Heat colors
function heatColors(delta) {
  const STRONG = 50;
  const WEAK = 5;

  if (!delta) {
    return {
      bg: "#ffffff",
      ring: "rgba(148,163,184,0.18)",
      pillBg: "rgba(148,163,184,0.18)",
      pillColor: "#475569",
      text: "#0f172a",
      sub: "#64748b",
    };
  }

  const mag = delta.inf ? 999 : Math.abs(delta.pct || 0);

  if (delta.dir === 0 || mag < WEAK) {
    return {
      bg: "linear-gradient(135deg, rgba(148,163,184,0.10), rgba(248,250,252,0.95))",
      ring: "rgba(148,163,184,0.25)",
      pillBg: "rgba(148,163,184,0.18)",
      pillColor: "#475569",
      text: "#0f172a",
      sub: "#64748b",
    };
  }

  if (delta.dir > 0) {
    const strong = mag >= STRONG;
    return {
      bg: strong
        ? "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(240,253,244,0.96))"
        : "linear-gradient(135deg, rgba(34,197,94,0.10), rgba(240,253,244,0.96))",
      ring: strong ? "rgba(34,197,94,0.55)" : "rgba(34,197,94,0.28)",
      pillBg: strong ? "rgba(34,197,94,0.22)" : "rgba(34,197,94,0.14)",
      pillColor: "#0a7f2e",
      text: "#0f172a",
      sub: "#14532d",
    };
  }

  const strong = mag >= STRONG;
  return {
    bg: strong
      ? "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(254,242,242,0.96))"
      : "linear-gradient(135deg, rgba(239,68,68,0.10), rgba(254,242,242,0.96))",
    ring: strong ? "rgba(239,68,68,0.55)" : "rgba(239,68,68,0.28)",
    pillBg: strong ? "rgba(239,68,68,0.22)" : "rgba(239,68,68,0.14)",
    pillColor: "#c92a2a",
    text: "#0f172a",
    sub: "#7f1d1d",
  };
}

function DeltaPill({ delta, label }) {
  if (!delta) return null;
  const colors = heatColors(delta);
  const arrow = delta.dir > 0 ? "▲" : delta.dir < 0 ? "▼" : "•";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 900,
        padding: "4px 10px",
        borderRadius: 999,
        background: colors.pillBg,
        color: colors.pillColor,
        whiteSpace: "nowrap",
        lineHeight: 1.1,
      }}
      title="WeekA → WeekB"
    >
      <span aria-hidden>{arrow}</span>
      <span>
        {label ? `${label} ` : ""}
        {delta.pctText}
      </span>
    </span>
  );
}

function ChipButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: active ? "linear-gradient(135deg,#6366f1,#ec4899)" : "#fff",
        color: active ? "#fff" : "#0f172a",
        fontWeight: 900,
        cursor: "pointer",
        boxShadow: active ? "0 12px 28px rgba(79,70,229,0.18)" : "none",
      }}
    >
      {children}
    </button>
  );
}

// Compact KPI card
function KpiCardCompact({
  label,
  icon,
  kind,
  valueA,
  valueB,
  weekA,
  weekB,
  mode,
  pinned = false,
}) {
  const delta = calcDelta(valueB, valueA);
  const colors = heatColors(delta);

  const A = formatByKind(kind, valueA);
  const B = formatByKind(kind, valueB);

  const absPrefix = delta.abs > 0 ? "+" : delta.abs < 0 ? "" : "";
  const absText = kind === "eur" ? fmtEUR(delta.abs) : fmt(delta.abs);

  if (pinned) {
    return (
      <div
        style={{
          background: colors.bg,
          borderRadius: 18,
          padding: 14,
          outline: `1px solid ${colors.ring}`,
          boxShadow: "0 14px 34px rgba(15,23,42,0.06)",
          minHeight: 98,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontWeight: 950,
                color: colors.sub,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>📌</span>
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {label}
              </span>
            </div>

            <div
              style={{
                marginTop: 6,
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 950,
                  color: colors.text,
                  lineHeight: 1,
                }}
              >
                {B}
              </div>
              <DeltaPill delta={delta} label={`vs ${weekA}:`} />
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "#64748b",
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span>
                {weekB}: <b style={{ color: "#0f172a" }}>{B}</b>
              </span>
              <span style={{ opacity: 0.85 }}>
                {weekA}: {A}
              </span>
              <span style={{ opacity: 0.9 }}>
                Δ:{" "}
                <b style={{ color: "#0f172a" }}>
                  {absPrefix}
                  {absText}
                </b>
              </span>
            </div>
          </div>

          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(15,23,42,0.06)",
              boxShadow: "0 0 0 1px rgba(148,163,184,0.30)",
              fontSize: 18,
              flex: "0 0 auto",
            }}
            aria-hidden
            title={label}
          >
            {icon || "●"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: colors.bg,
        borderRadius: 16,
        padding: 12,
        outline: `1px solid ${colors.ring}`,
        boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
        minHeight: mode === "analytic" ? 104 : 96,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 950,
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={label}
          >
            {label}
          </div>

          {mode === "simple" ? (
            <>
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    fontWeight: 950,
                    fontSize: 18,
                    color: "#0f172a",
                    lineHeight: 1.1,
                  }}
                >
                  {B}
                </div>
                <DeltaPill delta={delta} label={`vs ${weekA}:`} />
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "#64748b",
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span>
                  {weekB}: <b style={{ color: "#0f172a" }}>{B}</b>
                </span>
                <span style={{ opacity: 0.85 }}>
                  {weekA}: {A}
                </span>
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  marginTop: 6,
                  display: "grid",
                  gap: 4,
                  fontSize: 12,
                  color: "#334155",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span style={{ color: "#64748b", fontWeight: 900 }}>
                    {weekA}
                  </span>
                  <b style={{ color: "#0f172a" }}>{A}</b>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span style={{ color: "#64748b", fontWeight: 900 }}>
                    {weekB}
                  </span>
                  <b style={{ color: "#0f172a" }}>{B}</b>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#64748b", fontWeight: 900 }}>Δ</span>
                  <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                    <b style={{ color: "#0f172a" }}>
                      {absPrefix}
                      {absText}
                    </b>
                    <DeltaPill delta={delta} />
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15,23,42,0.06)",
            boxShadow: "0 0 0 1px rgba(148,163,184,0.26)",
            fontSize: 14,
            flex: "0 0 auto",
          }}
          aria-hidden
          title={label}
        >
          {icon || "●"}
        </div>
      </div>
    </div>
  );
}

export default function WeeklyHistory() {
  const { data, error, isLoading } = useSWR("/api/data", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

  const weekly = data?.weekly_reports || [];
  const groups = data?.groups || [];

  const availableWeeks = useMemo(() => {
    const ws = weekly.map((x) => Number(x.week)).filter((x) => Number.isFinite(x));
    return Array.from(new Set(ws)).sort((a, b) => a - b);
  }, [weekly]);

  const groupKeys = useMemo(() => {
    const keys = groups
      .map((g) => normGroup(g.key || g.code || g.slug || ""))
      .filter(Boolean);

    return keys.length
      ? keys
      : Array.from(new Set(weekly.map((r) => normGroup(r.group)).filter(Boolean))).sort();
  }, [groups, weekly]);

  const [weekA, setWeekA] = useState("");
  const [weekB, setWeekB] = useState("");
  const [selectedKpi, setSelectedKpi] = useState("weekly_sales_eur");
  const [selectedGroups, setSelectedGroups] = useState([]); // empty = all
  const [viewMode, setViewMode] = useState("simple"); // "simple" | "analytic"
  const [pinnedKpi, setPinnedKpi] = useState("weekly_sales_eur");

  const defaultWeek = availableWeeks.length
    ? String(availableWeeks[availableWeeks.length - 1])
    : "";
  const effectiveWeekA = weekA || defaultWeek;
  const effectiveWeekB = weekB || defaultWeek;

  const activeGroupKeys = selectedGroups.length ? selectedGroups : groupKeys;

  const selectedKpiMeta =
    KPI_OPTIONS.find((k) => k.key === selectedKpi) || KPI_OPTIONS[0];
  const pinnedMeta = KPI_OPTIONS.find((k) => k.key === pinnedKpi) || KPI_OPTIONS[0];

  const labelWeekA = `Week ${effectiveWeekA}`;
  const labelWeekB = `Week ${effectiveWeekB}`;

  const compareModel = useMemo(() => {
    const a = Number(effectiveWeekA);
    const b = Number(effectiveWeekB);

    const map = {};
    for (const g of activeGroupKeys) map[g] = { a: null, b: null };

    for (const r of weekly) {
      const g = normGroup(r.group);
      if (!map[g]) continue;

      const rw = Number(r.week);
      if (rw === a) map[g].a = r;
      if (rw === b) map[g].b = r;
    }
    return map;
  }, [weekly, effectiveWeekA, effectiveWeekB, activeGroupKeys]);

  const compareBars = useMemo(() => {
    return activeGroupKeys
      .map((g) => {
        const ra = compareModel[g]?.a || {};
        const rb = compareModel[g]?.b || {};
        return { group: g, weekA: num(ra[selectedKpi]), weekB: num(rb[selectedKpi]) };
      })
      .sort((a, b) => a.group.localeCompare(b.group));
  }, [activeGroupKeys, compareModel, selectedKpi]);

  const trendData = useMemo(() => {
    const byWeek = new Map();

    for (const r of weekly) {
      const g = normGroup(r.group);
      if (!activeGroupKeys.includes(g)) continue;

      const w = Number(r.week);
      if (!Number.isFinite(w)) continue;

      if (!byWeek.has(w)) byWeek.set(w, { week: w });
      byWeek.get(w)[g] = num(r[selectedKpi]);
    }

    return Array.from(byWeek.values()).sort((a, b) => a.week - b.week);
  }, [weekly, activeGroupKeys, selectedKpi]);

  // Groups selector UX
  const isAllImplicit = selectedGroups.length === 0;
  const isChecked = (g) => (isAllImplicit ? true : selectedGroups.includes(g));

  const toggleGroup = (g, checked) => {
    if (isAllImplicit) {
      if (!checked) setSelectedGroups(groupKeys.filter((x) => x !== g));
      return;
    }
    if (checked) setSelectedGroups(Array.from(new Set([...selectedGroups, g])));
    else setSelectedGroups(selectedGroups.filter((x) => x !== g));
  };

  const swapWeeks = () => {
    setWeekA(effectiveWeekB);
    setWeekB(effectiveWeekA);
  };

  if (isLoading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (error)
    return (
      <div style={{ padding: 16, color: "#b91c1c" }}>
        Error: {String(error.message || error)}
      </div>
    );

  return (
    <div
      style={{
        maxWidth: 1320,
        margin: "26px auto",
        padding: "0 16px 40px",
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 32 }}>📊 Weekly History & Comparison</h1>
        <Link href="/admin">Back</Link>
      </div>

      {/* Controls */}
      <div
        style={{
          marginTop: 12,
          background: "#fff",
          borderRadius: 18,
          padding: 14,
          boxShadow:
            "0 16px 40px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.16)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 12,
          alignItems: "start",
        }}
      >
        <label
          style={{
            display: "grid",
            gap: 6,
            fontSize: 12,
            fontWeight: 900,
            color: "#475569",
          }}
        >
          Week A
          <select
            value={effectiveWeekA}
            onChange={(e) => setWeekA(e.target.value)}
            style={{
              padding: "10px 10px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
            }}
          >
            {availableWeeks.map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        </label>

        <label
          style={{
            display: "grid",
            gap: 6,
            fontSize: 12,
            fontWeight: 900,
            color: "#475569",
          }}
        >
          Week B
          <select
            value={effectiveWeekB}
            onChange={(e) => setWeekB(e.target.value)}
            style={{
              padding: "10px 10px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
            }}
          >
            {availableWeeks.map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#475569" }}>
            View Mode
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ChipButton active={viewMode === "simple"} onClick={() => setViewMode("simple")}>
              Simple
            </ChipButton>
            <ChipButton
              active={viewMode === "analytic"}
              onClick={() => setViewMode("analytic")}
            >
              Analytic (A/B)
            </ChipButton>
            <button
              type="button"
              onClick={swapWeeks}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
              title="Swap Week A and Week B"
            >
              🔄 Swap
            </button>
          </div>
        </div>

        <label
          style={{
            display: "grid",
            gap: 6,
            fontSize: 12,
            fontWeight: 900,
            color: "#475569",
          }}
        >
          KPI for Charts/Comparison
          <select
            value={selectedKpi}
            onChange={(e) => setSelectedKpi(e.target.value)}
            style={{
              padding: "10px 10px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
            }}
          >
            {KPI_OPTIONS.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
        </label>

        <label
          style={{
            display: "grid",
            gap: 6,
            fontSize: 12,
            fontWeight: 900,
            color: "#475569",
          }}
        >
          📌 Pin KPI (Large Card)
          <select
            value={pinnedKpi}
            onChange={(e) => setPinnedKpi(e.target.value)}
            style={{
              padding: "10px 10px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
            }}
          >
            {KPI_OPTIONS.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
        </label>

        {/* Groups */}
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#475569" }}>
            Groups
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setSelectedGroups([])}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Show All
            </button>

            <button
              type="button"
              onClick={() => setSelectedGroups(groupKeys)}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Select All
            </button>

            <button
              type="button"
              onClick={() => setSelectedGroups([])}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              Reset
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              padding: 10,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#fff",
              maxHeight: 110,
              overflow: "auto",
            }}
          >
            {groupKeys.map((g) => (
              <label
                key={g}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked(g)}
                  onChange={(e) => toggleGroup(g, e.target.checked)}
                />
                Group {g}
              </label>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 800 }}>
            Note: If nothing is selected, all groups will be shown.
          </div>
        </div>
      </div>

      {/* Charts */}
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(420px,1fr))",
          gap: 14,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 18,
            padding: 14,
            boxShadow:
              "0 16px 40px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.16)",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>
            Group Comparison — {labelWeekA} vs {labelWeekB} — {selectedKpiMeta.label}
          </div>

          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={compareBars}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="group" />
                <YAxis />
                <Tooltip
                  formatter={(v, name) => {
                    const kind = selectedKpiMeta.kind;
                    const f = (x) => formatByKind(kind, x);
                    if (name === "weekA") return [f(v), labelWeekA];
                    if (name === "weekB") return [f(v), labelWeekB];
                    return [f(v), name];
                  }}
                />
                <Legend />
                <Bar dataKey="weekA" name={labelWeekA} />
                <Bar dataKey="weekB" name={labelWeekB} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 18,
            padding: 14,
            boxShadow:
              "0 16px 40px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.16)",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>
            Trend — {selectedKpiMeta.label} (All Weeks)
          </div>

          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip formatter={(v) => formatByKind(selectedKpiMeta.kind, v)} />
                <Legend />
                {activeGroupKeys.map((g) => (
                  <Line key={g} type="monotone" dataKey={g} name={`Group ${g}`} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>
            KPI Cards — {labelWeekA} → {labelWeekB}
          </h2>
          <div style={{ fontSize: 12, color: "#64748b" }}>(Δ based on WeekA → WeekB)</div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit,minmax(420px,1fr))",
            alignItems: "start",
          }}
        >
          {activeGroupKeys.map((g) => {
            const ra = compareModel[g]?.a;
            const rb = compareModel[g]?.b;

            const get = (row, k) => num(row?.[k]);

            const headerA = ra?.date ? `${labelWeekA} • ${ra.date}` : labelWeekA;
            const headerB = rb?.date ? `${labelWeekB} • ${rb.date}` : labelWeekB;

            const coreKeys = [
              "weekly_sales_eur",
              "offers_sent",
              "total_deals",
              "in_sales_process",
              "in_supply",
              "in_technical",
              "mega_deals",
              "weekly_trips",
            ];
            const restKeys = coreKeys.filter((k) => k !== pinnedKpi);

            return (
              <div
                key={g}
                style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(34,197,94,0.04))",
                  borderRadius: 20,
                  padding: 14,
                  boxShadow:
                    "0 18px 45px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.16)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 18, fontWeight: 950, color: "#0f172a" }}>Group {g}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    <b>A:</b> {headerA} &nbsp; | &nbsp; <b>B:</b> {headerB}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <KpiCardCompact
                    label={pinnedMeta.label}
                    icon={KPI_ICONS[pinnedMeta.key]}
                    kind={pinnedMeta.kind}
                    valueA={get(ra, pinnedMeta.key)}
                    valueB={get(rb, pinnedMeta.key)}
                    weekA={labelWeekA}
                    weekB={labelWeekB}
                    mode={viewMode}
                    pinned
                  />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gap: 12,
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    alignItems: "stretch",
                  }}
                >
                  {restKeys.map((k) => {
                    const meta = KPI_OPTIONS.find((x) => x.key === k);
                    if (!meta) return null;

                    return (
                      <KpiCardCompact
                        key={k}
                        label={meta.label}
                        icon={KPI_ICONS[k]}
                        kind={meta.kind}
                        valueA={get(ra, k)}
                        valueB={get(rb, k)}
                        weekA={labelWeekA}
                        weekB={labelWeekB}
                        mode={viewMode}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
