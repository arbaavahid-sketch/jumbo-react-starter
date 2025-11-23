// components/DealsExecTable.js
import { useEffect, useRef } from "react";

export default function DealsExecTable({ rows = [] }) {
  // مرتب‌سازی از بزرگ به کوچک
  const sortedRows = [...rows].sort(
    (a, b) => Number(b.amount_eur || 0) - Number(a.amount_eur || 0)
  );

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
        if (!scrollRef.current) return;
        if (userInteractingRef.current) return; // کاربر در حال اسکرول است

        const el = scrollRef.current;

        // لوپ بی‌نهایت
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
          el.scrollTop = 0;
        } else {
          el.scrollTop += 1; // 🐢 اسکرول آرام
        }
      }, 130);
    };

    startAutoScroll();

    const handleUserInteract = () => {
      userInteractingRef.current = true;

      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }

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
        // ❌ marginTop حذف شد تا با چارت کنار خودش هم‌سطح بشه
        background: "linear-gradient(135deg, #e3f2ff, #f8fafc)",
        borderRadius: 18,
        padding: 1,
        boxShadow:
          "0 16px 40px rgba(15,23,42,0.10), 0 0 0 1px rgba(148,163,184,0.25)",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {/* هدر */}
        <div
          style={{
            padding: "12px 16px",
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background:
              "linear-gradient(90deg, rgba(96,120,150,0.55), rgba(119,165,255,0.55))",
            color: "#ffffff",
            borderBottom: "1px solid rgba(15,23,42,0.15)",
          }}
        >
          DEAL EXECUTIONS REPORT
        </div>

        <div
          ref={scrollRef}
          style={{
            maxHeight: 160, // حدوداً ۴ ردیف
            overflowY: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead
              style={{
                background: "#e8f1ff",
                color: "#0f172a",
                position: "sticky",
                top: 0,
                zIndex: 2,
                fontWeight: 800,
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
                      fontWeight: 600,
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
                      background:
                        idx % 2 === 0 ? "#ffffff" : "rgba(226,232,240,0.4)",
                    }}
                  >
                    <td
                      style={{
                        padding: "8px 12px",
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {d.deal}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {d.responsible}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {d.status}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        textAlign: "right",
                        fontWeight: 800,
                        color: "#031022",
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
    </div>
  );
}
