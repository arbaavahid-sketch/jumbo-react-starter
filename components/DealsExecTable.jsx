// components/DealsExecTable.js

export default function DealsExecTable({ rows = [] }) {
  // 🔥 مرتب‌سازی از مبلغ زیاد → کم (اینجا اضافه شد)
  const sortedRows = [...rows].sort(
    (a, b) => Number(b.amount_eur || 0) - Number(a.amount_eur || 0)
  );

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 16,
        boxShadow:
          "0 12px 32px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.20)",
        overflow: "hidden",
      }}
    >
      {/* هدر با عنوان */}
      <div
        style={{
          padding: "12px 16px",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: "#334155",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        Deal Executions Report
      </div>

      <div
        style={{
          maxHeight: 140,
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
          <thead
            style={{
              background: "#f8fafc",
              color: "#475569",
              position: "sticky",
              top: 0,
              zIndex: 2,
              fontWeight: 600,
            }}
          >
            <tr>
              <th style={{ padding: "8px 12px", textAlign: "left" }}>Deal</th>
              <th style={{ padding: "8px 12px", textAlign: "left" }}>
                Responsible
              </th>
              <th style={{ padding: "8px 12px", textAlign: "left" }}>
                Status
              </th>
              <th style={{ padding: "8px 12px", textAlign: "right" }}>
                Amount (€)
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    padding: 16,
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  No deals found.
                </td>
              </tr>
            ) : (
              sortedRows.map((d, idx) => (
                <tr
                  key={idx}
                  style={{
                    background: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                  }}
                >
                  <td style={{ padding: "8px 12px" }}>{d.deal}</td>
                  <td style={{ padding: "8px 12px" }}>{d.responsible}</td>
                  <td style={{ padding: "8px 12px" }}>{d.status}</td>
                  <td
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {Number(d.amount_eur || 0).toLocaleString("de-DE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
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
