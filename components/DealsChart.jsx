import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

export default function DealsChart({ data, groupName }) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f8fbff, #eef4ff)",
        borderRadius: 24,
        padding: "18px 22px",
        boxShadow:
          "0 18px 45px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.25)",
        height: 380,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          marginBottom: 14,
          color: "#0f172a",
        }}
      >
        Deals vs Offers Sent {groupName ? `– ${groupName}` : ""}
      </div>

      <ResponsiveContainer width="100%" height="88%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="4 4" stroke="#dbe3f0" />

          <XAxis
            dataKey="week"
            tick={{ fill: "#475569", fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tick={{ fill: "#475569", fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            contentStyle={{
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              fontSize: 13,
              fontWeight: 600,
            }}
          />

          <Legend
            verticalAlign="bottom"
            height={32}
            wrapperStyle={{ fontSize: 13, fontWeight: 700 }}
          />

          {/* 🔹 خط اصلی با رنگ اصلی + گرادیان شیک */}
          <Line
            type="monotone"
            dataKey="deals"
            name="Deals"
            stroke="#3b82f6"
            strokeWidth={4}
            dot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "#1d4ed8" }}
            activeDot={{ r: 7, strokeWidth: 2, stroke: "#1d4ed8" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
