import { useEffect, useMemo, useState } from "react";
import { FiTrendingUp } from "react-icons/fi";

const cellStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  textAlign: "left",
  verticalAlign: "top",
};

export default function TotalDealsIcon({ deals = [] }) {
  const [open, setOpen] = useState(false);

  const sortedDeals = useMemo(
    () =>
      [...(Array.isArray(deals) ? deals : [])].sort(
        (a, b) =>
          String(a.month || "").localeCompare(String(b.month || "")) ||
          String(a.deal_id || "").localeCompare(String(b.deal_id || "")),
      ),
    [deals],
  );

  const totalSalesAmount = useMemo(
    () =>
      sortedDeals.reduce((sum, deal) => {
        const amount = Number(deal.sales_amount_eur);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [sortedDeals],
  );

  const formattedTotalSalesAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalSalesAmount);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        title="نمایش جزئیات Total Deals"
        aria-label="نمایش جزئیات Total Deals"
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          border: "1px solid rgba(148,163,184,0.6)",
          background: "rgba(250,250,250,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <FiTrendingUp size={16} color="#0ea5e9" />
      </button>

      {open ? (
        <>
          <div
            onClick={() => setOpen(false)}
            aria-hidden="true"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.12)",
              zIndex: 9998,
            }}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Total Deals"
            style={{
              position: "fixed",
              top: 72,
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(760px, calc(100vw - 32px))",
              maxHeight: "calc(100vh - 104px)",
              background: "#ffffff",
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(15,23,42,0.25), 0 0 0 1px rgba(148,163,184,0.45)",
              padding: 14,
              zIndex: 9999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Total Deals</div>
                <div
                  style={{
                    marginTop: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    fontSize: 11,
                    color: "#64748b",
                  }}
                >
                  <span>
                    {sortedDeals.length} deal{sortedDeals.length === 1 ? "" : "s"}
                  </span>
                  <span aria-hidden="true">•</span>
                  <span>
                    Total: <strong style={{ color: "#0369a1" }}>{formattedTotalSalesAmount}</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="بستن پنل Total Deals"
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#475569",
                  fontSize: 24,
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {sortedDeals.length === 0 ? (
              <div
                style={{
                  padding: "18px 12px",
                  borderRadius: 12,
                  background: "#f8fafc",
                  color: "#64748b",
                  fontSize: 12,
                }}
              >
                No Total Deals for this group.
              </div>
            ) : (
              <div
                style={{
                  maxHeight: "calc(100vh - 190px)",
                  overflow: "auto",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                }}
              >
                <table
                  style={{
                    width: "100%",
                    minWidth: 680,
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr style={{ position: "sticky", top: 0, zIndex: 1, background: "#f8fafc" }}>
                      {["Month", "Center", "Product", "Deal ID", "Sales Amount"].map((label) => (
                        <th
                          key={label}
                          style={{
                            ...cellStyle,
                            color: "#475569",
                            fontSize: 11,
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDeals.map((deal, index) => (
                      <tr key={`${deal.deal_id || "deal"}-${index}`}>
                        <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{deal.month || "-"}</td>
                        <td style={cellStyle}>{deal.center || "-"}</td>
                        <td style={cellStyle}>{deal.product || "-"}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, whiteSpace: "nowrap" }}>
                          {deal.deal_id || "-"}
                        </td>
                        <td
                          style={{
                            ...cellStyle,
                            color: "#0369a1",
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {deal.sales_amount_label || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}
