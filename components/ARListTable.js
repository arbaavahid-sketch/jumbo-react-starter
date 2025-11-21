// components/ARListTable.js

const fmtPercent = (raw, n) => {
  const rawStr = raw != null ? String(raw).trim() : "";

  if (rawStr) return rawStr;
  if (n == null || n === "") return "-";

  const num = Number(n);
  if (Number.isNaN(num)) return "-";

  return `${num.toFixed(2)}%`;
};

export default function ARListTable({ rows = [] }) {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div
      style={{
        marginTop: 16,
        borderRadius: 18,
        background: "#ffffff",
        boxShadow:
          "0 14px 32px rgba(15,23,42,0.10), 0 0 0 1px rgba(229,231,235,0.8)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid #e5e7eb",
          fontSize: 13,
          fontWeight: 600,
          color: "#111827",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        AR List
      </div>

      <div
        style={{
          maxHeight: 150,
          overflowY: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f9fafb",
                color: "#6b7280",
              }}
            >
              <th
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  fontWeight: 600,
                }}
              >
                Deal No
              </th>
              <th
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  fontWeight: 600,
                }}
              >
                Payment Currency
              </th>
              <th
                style={{
                  padding: "8px 12px",
                  textAlign: "right",
                  fontWeight: 600,
                }}
              >
                % of Total 
              </th>
            </tr>
          </thead>
          <tbody>
            {safeRows.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    padding: 10,
                    textAlign: "center",
                    color: "#9ca3af",
                  }}
                >
                  No AR items.
                </td>
              </tr>
            ) : (
              safeRows.map((row, idx) => {
                const percent = row.percentage || 0;
                const text = fmtPercent(row.percentage_raw, percent);

                return (
                  <tr
                    key={idx}
                    style={{
                      background: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                    }}
                  >
                    <td
                      style={{
                        padding: "8px 12px",
                        color: "#111827",
                      }}
                    >
                      {row.deal_no}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        color: "#111827",
                      }}
                    >
                      {row.payment_currency}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        textAlign: "right",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          background: "#e5e7eb",
                          borderRadius: 6,
                          height: 10,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${percent}%`,
                            background: "#10b981",
                            height: "100%",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          marginTop: 4,
                          fontWeight: 600,
                          color: "#374151",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {text}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
