import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

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

  const cards = useMemo(
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

  const totalA = cards.reduce((s, r) => s + r.valueA, 0);
  const totalB = cards.reduce((s, r) => s + r.valueB, 0);

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
        <div style={grid}>
          <SummaryCard
            weekA={weekA}
            weekB={weekB}
            valueA={totalA}
            valueB={totalB}
            label={`Total — ${kpiMeta.label}`}
          />
          {cards.map((r) => (
            <ManagerCard
              key={r.manager}
              title={r.manager}
              weekA={weekA}
              weekB={weekB}
              valueA={r.valueA}
              valueB={r.valueB}
              label={kpiMeta.label}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function deltaMeta(valueA, valueB) {
  const delta = valueB - valueA;
  const dir = delta > 0 ? 1 : delta < 0 ? -1 : 0;
  return {
    delta,
    accent: dir > 0 ? "#22c55e" : dir < 0 ? "#ef4444" : "#94a3b8",
    pillColor: dir > 0 ? "#0a7f2e" : dir < 0 ? "#c92a2a" : "#475569",
    pillBg:
      dir > 0
        ? "rgba(34,197,94,0.14)"
        : dir < 0
          ? "rgba(239,68,68,0.14)"
          : "rgba(148,163,184,0.18)",
    arrow: dir > 0 ? "▲" : dir < 0 ? "▼" : "•",
  };
}

function ManagerCard({ title, label, weekA, weekB, valueA, valueB, strong }) {
  const d = deltaMeta(valueA, valueB);
  return (
    <div style={{ ...managerCard, borderTop: `4px solid ${d.accent}` }}>
      <div style={cardHead}>
        <span style={{ ...cardTitle, fontSize: strong ? 17 : 15 }}>{title}</span>
        <span style={{ ...pill, background: d.pillBg, color: d.pillColor }}>
          <span aria-hidden>{d.arrow}</span> {d.delta > 0 ? "+" : ""}
          {fmt(d.delta)}
        </span>
      </div>
      <div style={cardKpi}>{label}</div>
      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
        <WeekRow color={WEEK_A_COLOR} week={weekA} value={valueA} />
        <WeekRow color={WEEK_B_COLOR} week={weekB} value={valueB} />
      </div>
    </div>
  );
}

function SummaryCard(props) {
  return <ManagerCard {...props} title={props.label} strong />;
}

function WeekRow({ color, week, value }) {
  return (
    <div style={weekRow}>
      <span style={{ ...dot, background: color }} />
      <span style={{ color: "#475569", fontWeight: 700 }}>Week {week}</span>
      <span style={weekVal}>{fmt(value)}</span>
    </div>
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
  marginTop: 14,
};

const headerRow = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 14,
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

const grid = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
};

const managerCard = {
  background: "linear-gradient(135deg, rgba(99,102,241,0.05), rgba(248,250,252,0.95))",
  borderRadius: 16,
  padding: 14,
  boxShadow: "0 14px 34px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.18)",
};

const cardHead = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const cardTitle = { fontWeight: 900, color: "#0f172a" };

const cardKpi = { fontSize: 12, color: "#64748b", marginTop: 2, fontWeight: 600 };

const pill = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 12,
  fontWeight: 900,
  padding: "3px 9px",
  borderRadius: 999,
  whiteSpace: "nowrap",
};

const weekRow = { display: "flex", alignItems: "center", gap: 8, fontSize: 14 };

const dot = { width: 9, height: 9, borderRadius: 999, display: "inline-block", flex: "0 0 auto" };

const weekVal = { marginLeft: "auto", fontWeight: 900, color: "#0f172a", fontVariantNumeric: "tabular-nums" };

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
