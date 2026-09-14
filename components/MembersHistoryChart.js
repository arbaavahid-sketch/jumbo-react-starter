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
import { DashboardChart, DashboardChartTooltip } from "./DashboardChart";

const toNumber = (v) => (v == null ? 0 : Number(v) || 0);

export default function MembersHistoryChart({ rows = [] }) {
  const data = rows.map((m) => ({
    name: m.name || m.member || "",
    deals: toNumber(m.deals),
    offers: toNumber(m.offers_sent),
  }));

  const maxValue =
    data.length > 0 ? Math.max(...data.map((d) => Math.max(d.deals || 0, d.offers || 0)), 4) : 4;

  return (
    <DashboardChart
      title="Deals vs offers sent"
      description="Member activity for the selected group."
      height={240}
    >
        <ResponsiveContainer>
          <BarChart
            accessibilityLayer
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

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
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
            <Tooltip content={<DashboardChartTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={28}
              formatter={(value) => <span style={{ fontSize: 11, color: "#4b5563" }}>{value}</span>}
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
    </DashboardChart>
  );
}
