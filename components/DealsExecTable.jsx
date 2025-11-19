// components/DealsExecTable.js

const BRAND_BLUE = "#0b63ae";

const fmtEUR = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
};

export default function DealsExecTable({ rows }) {
  const data = Array.isArray(rows) ? rows : [];

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 18,
        boxShadow:
          "0 16px 40px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.18)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid #e5e7eb",
          background:
            "linear-gradient(135deg, rgba(11,99,174,0.06), rgba(255,255,255,1))",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          Deal Executions Report
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
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
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <th
                style={{
                  padding: "10px 16px",
                  textAlign: "left",
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                Deal
              </th>
              <th
                style={{
                  padding: "10px 16px",
                  textAlign: "left",
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                Responsible
              </th>
              <th
                style={{
                  padding: "10px 16px",
                  textAlign: "left",
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                Status
              </th>
              <th
                style={{
                  padding: "10px 16px",
                  textAlign: "right",
                  fontWeight: 600,
                  color: "#475569",
                  whiteSpace: "nowrap",
                }}
              >
                Amount (€)
              </th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    padding: "14px 16px",
                    textAlign: "center",
                    color: "#9ca3af",
                  }}
                >
                  No deals
                </td>
              </tr>
            ) : (
              data.map((d, idx) => (
                <tr
                  key={`${d.deal}_${idx}`}
                  style={{
                    background: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                    borderBottom: "1px solid #edf2f7",
                    transition: "background 120ms ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#e0f2fe")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      idx % 2 === 0 ? "#ffffff" : "#f9fafb")
                  }
                >
                  <td style={{ padding: "9px 16px" }}>{d.deal}</td>
                  <td style={{ padding: "9px 16px" }}>{d.responsible}</td>
                  <td style={{ padding: "9px 16px" }}>{d.status}</td>
                  <td
                    style={{
                      padding: "9px 16px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: BRAND_BLUE,
                    }}
                  >
                    {fmtEUR(d.amount_eur)}
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
