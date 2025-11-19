// components/MembersHistoryChart.js
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const toNumber = (v) => (v == null ? 0 : Number(v) || 0);

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const deals = payload.find((p) => p.dataKey === "deals")?.value ?? 0;
  const offers = payload.find((p) => p.dataKey === "offers")?.value ?? 0;

  return (
    <div
      style={{
        background: "rgba(15,23,42,0.96)",
        color: "#e5e7eb",
        padding: "8px 10px",
        borderRadius: 10,
        boxShadow: "0 12px 30px rgba(15,23,42,0.45)",
        fontSize: 11,
        minWidth: 130,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          marginBottom: 4,
          color: "#bae6fd",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#60a5fa" }}>Deals:</span>
        <span>{deals}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#fb923c" }}>Offers Sent:</span>
        <span>{offers}</span>
      </div>
    </div>
  );
}

export default function MembersHistoryChart({ rows = [] }) {
  const data = rows.map((m) => ({
    name: m.name || m.member || "",
    deals: toNumber(m.deals),
    offers: toNumber(m.offers_sent),
  }));

  const maxValue =
    data.length > 0
      ? Math.max(
          ...data.map((d) => Math.max(d.deals || 0, d.offers || 0)),
          4
        )
      : 4;

  return (
    <div
      style={{
        background: "radial-gradient(circle at top, #eff6ff, #f9fafb)",
        borderRadius: 22,
        padding: 18,
        boxShadow:
          "0 22px 55px rgba(15,23,42,0.12), 0 0 0 1px rgba(148,163,184,0.22)",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 8,
          color: "#0f172a",
        }}
      >
        Deals vs Offers Sent
      </div>

      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, left: -10, bottom: 18 }}
          >
            <defs>
              <linearGradient id="dealsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="offersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#fdba74" stopOpacity={0.9} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e7eb"
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickMargin={8}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              domain={[0, maxValue]}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={28}
              formatter={(value) => (
                <span style={{ fontSize: 11, color: "#4b5563" }}>{value}</span>
              )}
            />

            <Bar
              dataKey="deals"
              name="Deals"
              fill="url(#dealsGradient)"
              radius={[10, 10, 0, 0]}
              barSize={26}
            />
            <Bar
              dataKey="offers"
              name="Offers Sent"
              fill="url(#offersGradient)"
              radius={[10, 10, 0, 0]}
              barSize={26}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
