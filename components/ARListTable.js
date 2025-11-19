// components/ARListTable.js

const fmtPercent = (n) =>
  n == null ? "-" : `${Number(n).toFixed(0)}%`;

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
          maxHeight: 150, // حدوداً ۳–۴ ردیف دیده می‌شود
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
                Percentage
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
              safeRows.map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    background:
                      idx % 2 === 0 ? "#ffffff" : "#f9fafb",
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
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    {fmtPercent(row.percentage)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
