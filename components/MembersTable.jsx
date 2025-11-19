// components/MembersTable.js

const BRAND_BLUE = "#0b63ae";

const fmtInt = (v) => (v == null ? 0 : Number(v) || 0);

export default function MembersTable({ rows }) {
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
      {/* هدر کارت */}
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
          Team Members
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
                  textAlign: "left",
                  padding: "10px 16px",
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                Name
              </th>
              <th
                style={{
                  textAlign: "center",
                  padding: "10px 16px",
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                Deals
              </th>
              <th
                style={{
                  textAlign: "center",
                  padding: "10px 16px",
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                Offers Sent
              </th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    padding: "14px 16px",
                    textAlign: "center",
                    color: "#9ca3af",
                  }}
                >
                  No members data
                </td>
              </tr>
            ) : (
              data.map((m, idx) => (
                <tr
                  key={idx}
                  style={{
                    background: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                    borderBottom: "1px solid #edf2f7",
                    transition: "background 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#e0f2fe";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      idx % 2 === 0 ? "#ffffff" : "#f9fafb";
                  }}
                >
                  <td style={{ padding: "9px 16px", color: "#111827" }}>
                    {m.name || m.member || "-"}
                  </td>
                  <td
                    style={{
                      padding: "9px 16px",
                      textAlign: "center",
                      color: "#0f172a",
                      fontWeight: 600,
                    }}
                  >
                    {fmtInt(m.deals)}
                  </td>
                  <td
                    style={{
                      padding: "9px 16px",
                      textAlign: "center",
                      color: BRAND_BLUE,
                      fontWeight: 600,
                    }}
                  >
                    {fmtInt(m.offers_sent)}
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
