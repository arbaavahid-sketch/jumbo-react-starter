import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

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
  <LineChart data={data} key={Date.now()}>
    <CartesianGrid strokeDasharray="4 4" stroke="#dbe3f0" />
    <XAxis dataKey="week" axisLine={false} tickLine={false} />
    <YAxis axisLine={false} tickLine={false} />
    <Tooltip />
    <Legend />

    <Line
      type="monotone"
      dataKey="deals"
      stroke="#3b82f6"
      strokeWidth={4}
      dot={{ r: 5 }}
      activeDot={{ r: 7 }}
      isAnimationActive={true}
      animationDuration={1500}
      animationEasing="ease-in-out"
      animationBegin={300}
    />
  </LineChart>
</ResponsiveContainer>

    </div>
  );
}
