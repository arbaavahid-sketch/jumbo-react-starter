export default function GroupSalesBars({ data = [] }) {
  const MAX = Math.max(...data.map((x) => x.value), 1);

  const COLORS = ["#2563eb", "#f97316", "#22c55e"]; // A, B, C

  return (
    <div
      style={{
        background: "white",
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 10px 25px rgba(15,23,42,0.10)",
      }}
    >
      <h3
        style={{
          margin: "0 0 6px",
          fontSize: 16,
          color: "#111827",
          fontWeight: 700,
        }}
      >
        Total Sales (€)
      </h3>

      <p
        style={{
          margin: "0 0 16px",
          fontSize: 13,
          color: "#6b7280",
        }}
      >
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {data.map((g, idx) => {
          const widthPercent = (g.value / MAX) * 100;
          const color = COLORS[idx % COLORS.length];
          const textValue = `${g.value.toLocaleString("en-US")} €`;

          return (
            <div key={idx}>
              {/* عنوان گروه */}
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

              {/* نوار اصلی */}
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
                {/* قسمت رنگی */}
                <div
                  style={{
                    width: `${widthPercent}%`,
                    height: "100%",
                    background: color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      widthPercent < 20 ? "flex-end" : "center",
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

                {/* اگر خیلی کوتاه بود عدد خارج نمایش داده شود */}
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

      {/* ❌ Legend حذف شد */}
    </div>
  );
}
