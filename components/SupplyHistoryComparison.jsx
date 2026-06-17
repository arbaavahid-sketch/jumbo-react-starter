import { useEffect, useMemo, useState } from "react";
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

const fetcher = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

const SUPPLY_KPIS = [
  { key: "deals_in_supply_side_stage_now", label: "Deals waiting for supply approval" },
  { key: "late_items", label: "Late items (ERP)" },
  { key: "undelivered_items", label: "Undelivered items (ERP)" },
  { key: "nonplaced_items", label: "Nonplaced items (ERP)" },
  { key: "open_po_count", label: "Open PO count (ERP)" },
  { key: "deals_last_30_days", label: "Deals last 30 days" },
  { key: "deals_last_week", label: "Deals last week" },
  { key: "deals_ytd", label: "Deals YTD" },
  { key: "po_val_sub_ytd", label: "PO Val Sub YTD" },
];

const WEEK_A_COLOR = "#6366f1";
const WEEK_B_COLOR = "#f97316";

export default function SupplyHistoryComparison() {
  const { data, error, isLoading } = useSWR("/api/supply-history", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 120_000,
  });

  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const weeks = Array.isArray(data?.weeks) ? data.weeks : [];
  const configured = data?.configured;

  const [kpi, setKpi] = useState("deals_in_supply_side_stage_now");
  const [weekA, setWeekA] = useState(null);
  const [weekB, setWeekB] = useState(null);

  // Default to the two most recent weeks once data arrives.
  useEffect(() => {
    if (!weeks.length) return;
    const last = weeks[weeks.length - 1];
    const prev = weeks.length > 1 ? weeks[weeks.length - 2] : last;
    setWeekA((w) => (w != null && weeks.includes(w) ? w : prev));
    setWeekB((w) => (w != null && weeks.includes(w) ? w : last));
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpiMeta = SUPPLY_KPIS.find((k) => k.key === kpi) || SUPPLY_KPIS[0];

  const byKey = useMemo(() => {
    const m = new Map();
    for (const r of rows) m.set(`${r.week}|${r.manager}`, r);
    return m;
  }, [rows]);

  const managers = useMemo(() => {
    const set = new Set();
    for (const r of rows) {
      if (r.week === weekA || r.week === weekB) set.add(r.manager);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, weekA, weekB]);

  const chartData = useMemo(
    () =>
      managers.map((manager) => {
        const a = byKey.get(`${weekA}|${manager}`);
        const b = byKey.get(`${weekB}|${manager}`);
        return {
          manager,
          valueA: Number(a?.[kpi]) || 0,
          valueB: Number(b?.[kpi]) || 0,
        };
      }),
    [managers, byKey, weekA, weekB, kpi],
  );

  const totalA = chartData.reduce((s, r) => s + r.valueA, 0);
  const totalB = chartData.reduce((s, r) => s + r.valueB, 0);

  return (
    <section style={card}>
      <div style={headerRow}>
        <div>
          <div style={titleStyle}>Supply — Weekly Comparison (by manager)</div>
          <div style={subtitleStyle}>{kpiMeta.label}</div>
        </div>

        {weeks.length > 0 ? (
          <div style={controls}>
            <Field label="KPI">
              <select value={kpi} onChange={(e) => setKpi(e.target.value)} style={select}>
                {SUPPLY_KPIS.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Week A">
              <select
                value={weekA ?? ""}
                onChange={(e) => setWeekA(Number(e.target.value))}
                style={select}
              >
                {weeks.map((w) => (
                  <option key={w} value={w}>
                    Week {w}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Week B">
              <select
                value={weekB ?? ""}
                onChange={(e) => setWeekB(Number(e.target.value))}
                style={select}
              >
                {weeks.map((w) => (
                  <option key={w} value={w}>
                    Week {w}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}
      </div>

      {error ? <div style={note}>Could not load supply history.</div> : null}
      {isLoading && !data ? <div style={note}>Loading supply history…</div> : null}

      {data && configured === false ? (
        <div style={setupNote}>
          <strong>No supply history connected yet.</strong>
          <div style={{ marginTop: 6 }}>
            Create a sheet tab with one row per manager per week (columns: <code>week</code>,{" "}
            <code>Supply side manager</code>, and the same metric columns as the supply sheet), then
            publish it as CSV and set <code>SHEET_SUPPLY_HISTORY_CSV_URL</code> in the environment.
          </div>
        </div>
      ) : null}

      {data && configured && weeks.length === 0 ? (
        <div style={note}>No weekly supply rows found in the connected sheet.</div>
      ) : null}

      {weeks.length > 0 ? (
        <>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 56 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                <XAxis
                  dataKey="manager"
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  height={72}
                  tick={{ fill: "#475569", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "#64748b" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="valueA" name={`Week ${weekA}`} fill={WEEK_A_COLOR} radius={[6, 6, 0, 0]} />
                <Bar dataKey="valueB" name={`Week ${weekB}`} fill={WEEK_B_COLOR} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Supply Side manager</th>
                  <th style={thNum}>Week {weekA}</th>
                  <th style={thNum}>Week {weekB}</th>
                  <th style={thNum}>Δ</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((r) => {
                  const delta = r.valueB - r.valueA;
                  const color = delta > 0 ? "#0a7f2e" : delta < 0 ? "#c92a2a" : "#6b7280";
                  return (
                    <tr key={r.manager}>
                      <td style={tdLeft}>{r.manager}</td>
                      <td style={tdNum}>{fmt(r.valueA)}</td>
                      <td style={tdNum}>{fmt(r.valueB)}</td>
                      <td style={{ ...tdNum, color, fontWeight: 800 }}>
                        {delta > 0 ? "+" : ""}
                        {fmt(delta)}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td style={{ ...tdLeft, fontWeight: 800 }}>Total</td>
                  <td style={{ ...tdNum, fontWeight: 800 }}>{fmt(totalA)}</td>
                  <td style={{ ...tdNum, fontWeight: 800 }}>{fmt(totalB)}</td>
                  <td style={{ ...tdNum, fontWeight: 800 }}>
                    {totalB - totalA > 0 ? "+" : ""}
                    {fmt(totalB - totalA)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "0.04em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const card = {
  background: "#fff",
  borderRadius: 20,
  boxShadow: "0 24px 60px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.35)",
  padding: 16,
  marginTop: 16,
};

const headerRow = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 12,
};

const titleStyle = { fontWeight: 800, fontSize: 18, color: "#0f172a" };
const subtitleStyle = { fontSize: 13, color: "#64748b", marginTop: 2 };

const controls = { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" };

const select = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 13,
  fontWeight: 600,
  color: "#0f172a",
};

const note = {
  padding: 14,
  borderRadius: 12,
  background: "#eff6ff",
  border: "1px solid #bae6fd",
  color: "#0c4a6e",
  fontSize: 13,
};

const setupNote = {
  padding: 14,
  borderRadius: 12,
  background: "#fffbeb",
  border: "1px solid #fde68a",
  color: "#713f12",
  fontSize: 13,
  lineHeight: 1.5,
};

const table = { width: "100%", borderCollapse: "collapse", minWidth: 520 };

const th = {
  textAlign: "left",
  padding: "10px",
  fontSize: 13,
  background: "#f8fafc",
  borderBottom: "1px solid #cbd5e1",
  whiteSpace: "nowrap",
};

const thNum = { ...th, textAlign: "center" };

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
