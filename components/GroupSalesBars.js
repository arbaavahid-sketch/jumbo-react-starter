import { DashboardChart } from "./DashboardChart";
import { DashboardNotice } from "./DashboardState";

export default function GroupSalesBars({ data = [] }) {
  const MAX = Math.max(...data.map((x) => x.value), 1);
  const total = data.reduce((sum, g) => sum + Number(g.value || 0), 0);

  const COLORS = ["#2563eb", "#f97316", "#22c55e"];

  if (!data.length) {
    return (
      <DashboardNotice
        tone="empty"
        title="No group sales data"
        detail="Sales totals will appear here when the source data is available."
      />
    );
  }

  return (
    <DashboardChart
      title="Total sales"
      description={`Combined sales across groups: ${total.toLocaleString("en-US")} €`}
      height={280}
    >

      {/* لیست نوارها */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {data.map((g, idx) => {
          const widthPercent = (g.value / MAX) * 100;
          const color = COLORS[idx % COLORS.length];
          const textValue = `${g.value.toLocaleString("en-US")} €`;

          return (
            <div key={idx}>
              <div
                style={{
                  fontSize: 13,
                  marginBottom: 6,
                  fontWeight: 700,
                  color: "#374151",
                }}
              >
                {g.label}
              </div>

              <div
                style={{
                  width: "100%",
                  background: "#e5e7eb",
                  borderRadius: 999,
                  overflow: "hidden",
                  height: 30,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${widthPercent}%`,
                    height: "100%",
                    background: color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: widthPercent < 20 ? "flex-end" : "center",
                    paddingRight: widthPercent < 20 ? 8 : 0,
                    color: "white",
                    fontWeight: 700,
                    fontSize: 13,
                    transition: "width 0.7s ease",
                    borderRadius: 999,
                  }}
                >
                  {widthPercent < 20 ? "" : textValue}
                </div>

                {widthPercent < 20 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      left: `${Math.min(widthPercent + 2, 80)}%`,
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#111827",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {textValue}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardChart>
  );
}
