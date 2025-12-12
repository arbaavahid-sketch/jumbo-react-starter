// components/ARListTable.js
import { useEffect, useRef } from "react";

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

  const scrollRef = useRef(null);
  const autoScrollIntervalRef = useRef(null);
  const userInteractingRef = useRef(false);
  const resumeTimeoutRef = useRef(null);

  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;

    const stopAutoScroll = () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    };

    const startAutoScroll = () => {
      stopAutoScroll();
      autoScrollIntervalRef.current = setInterval(() => {
        const el = scrollRef.current;
        if (!el) return;
        if (userInteractingRef.current) return;

        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) el.scrollTop = 0;
        else el.scrollTop += 1;
      }, 150);
    };

    startAutoScroll();

    const handleUserInteract = () => {
      userInteractingRef.current = true;
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = setTimeout(() => {
        userInteractingRef.current = false;
      }, 5000);
    };

    box.addEventListener("wheel", handleUserInteract, { passive: true });
    box.addEventListener("touchstart", handleUserInteract, { passive: true });
    box.addEventListener("mousedown", handleUserInteract);

    return () => {
      stopAutoScroll();
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      box.removeEventListener("wheel", handleUserInteract);
      box.removeEventListener("touchstart", handleUserInteract);
      box.removeEventListener("mousedown", handleUserInteract);
    };
  }, [rows]);

  return (
    <div
      style={{
        marginTop: 18,
        borderRadius: 18,
        background: "linear-gradient(135deg, #e3f2ff, #f8fafc)",
        padding: 1,
        boxShadow: "0 14px 32px rgba(15,23,42,0.10), 0 0 0 1px rgba(229,231,235,0.8)",
        overflow: "hidden",
      }}
    >
      <div style={{ background: "#ffffff", borderRadius: 16, overflow: "hidden" }}>
        {/* هدر AR LIST (این ثابت می‌مونه چون بیرون اسکروله) */}
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid #e5e7eb",
            fontSize: 14,
            fontWeight: 800,
            color: "#ffffff",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            background: "linear-gradient(90deg, rgba(96,120,150,0.55), rgba(119,165,255,0.55))",
          }}
        >
          AR LIST
        </div>

        {/* اسکرول فقط روی این بخش */}
        <div
          ref={scrollRef}
          style={{
            maxHeight: 160,
            overflowY: "auto",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            {/* ✅ THEAD STICKY */}
            <thead
  style={{
    position: "sticky",
    top: 0,
    zIndex: 2,
    background: "#e8f1ff",
  }}
>

              <tr>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    background: "#e8f1ff",
color: "#0f172a",
fontWeight: 700,
borderBottom: "1px solid rgba(148,163,184,0.45)",

                  }}
                >
                  Deal No
                </th>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    background: "#e8f1ff",
color: "#0f172a",
fontWeight: 700,
borderBottom: "1px solid rgba(148,163,184,0.45)",

                  }}
                >
                  Payment Currency
                </th>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    background: "#e8f1ff",
color: "#0f172a",
fontWeight: 700,
borderBottom: "1px solid rgba(148,163,184,0.45)",

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
                      fontWeight: 600,
                    }}
                  >
                    No AR items.
                  </td>
                </tr>
              ) : (
                safeRows.map((row, idx) => {
                  const percent = Number(row.percentage || 0);
                  const clamped = Math.max(0, Math.min(100, percent)); // ✅ امن
                  const text = fmtPercent(row.percentage_raw, percent);

                  return (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                      <td style={{ padding: "8px 12px", color: "#111827", fontWeight: 700 }}>
                        {row.deal_no}
                      </td>
                      <td style={{ padding: "8px 12px", color: "#111827", fontWeight: 700 }}>
                        {row.payment_currency}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>
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
                              width: `${clamped}%`,
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
                            fontWeight: 700,
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
    </div>
  );
}
