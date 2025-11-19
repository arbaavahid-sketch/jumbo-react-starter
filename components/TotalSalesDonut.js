// components/TotalSalesDonut.js
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#2563eb", "#f97316", "#22c55e"]; // A, B, C

// data = [{ name: "Group A", value: 12345 }, ...]
export default function TotalSalesDonut({
  title = "Total Sales (€)",
  subtitle = "سهم هر گروه از مجموع",
  data = [],
}) {
  if (!data || data.length === 0) return null;

  // اگر همۀ مقدارها صفر بود، اصلاً نمودار نشون نده
  const allZero = data.every((d) => !d.value || Number(d.value) === 0);
  if (allZero) {
    return (
      <div
        style={{
          borderRadius: 18,
          padding: 16,
          background:
            "radial-gradient(circle at top left, rgba(59,130,246,0.05), #f9fafb)",
          boxShadow:
            "0 16px 40px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.18)",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 4,
            color: "#0f172a",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          هنوز دیتای معناداری برای نمایش این نمودار ثبت نشده.
        </div>
      </div>
    );
  }

  const renderLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }) => {
    if (!percent || percent <= 0) return null;
    const RAD = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.65;
    const x = cx + radius * Math.cos(-midAngle * RAD);
    const y = cy + radius * Math.sin(-midAngle * RAD);

    const pct = percent * 100;
    const text =
      pct < 1 ? "<1" : pct < 5 ? pct.toFixed(1) : pct.toFixed(1); // زیر ۱٪ رو "<1" می‌نویسیم

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={700}
        fill="#0f172a"
      >
        {text}
      </text>
    );
  };

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 16,
        background:
          "radial-gradient(circle at top left, rgba(59,130,246,0.05), #f9fafb)",
        boxShadow:
          "0 16px 40px rgba(15,23,42,0.1), 0 0 0 1px rgba(148,163,184,0.2)",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 4,
          color: "#0f172a",
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 11,
            color: "#6b7280",
            marginBottom: 8,
          }}
        >
          {subtitle}
        </div>
      )}

      {/* ارتفاع کم تا روی مانیتور بدون اسکرول جا بشه */}
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="48%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              labelLine={false}
              label={renderLabel}
              stroke="#f9fafb"
              strokeWidth={2}
            >
              {data.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={COLORS[idx % COLORS.length]}
                />
              ))}
            </Pie>
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
