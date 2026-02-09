// components/LogisticAATable.js
import { useEffect, useRef } from "react";

const pretty = (s) =>
  String(s || "")
    .trim()
    // برای خوانایی: کاماها رو خط جدید کن
    .replace(/\s*,\s*/g, "\n");

export default function LogisticAATable({ rows = [] }) {
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
        marginTop: 8,
        borderRadius: 18,
        background: "linear-gradient(135deg, #e3f2ff, #f8fafc)",
        padding: 1,
        boxShadow:
          "0 14px 32px rgba(15,23,42,0.10), 0 0 0 1px rgba(229,231,235,0.8)",
        overflow: "hidden",
      }}
    >
      <div style={{ background: "#ffffff", borderRadius: 16, overflow: "hidden" }}>
        {/* Header ثابت */}
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid #e5e7eb",
            fontSize: 14,
            fontWeight: 800,
            color: "#ffffff",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            background:
              "linear-gradient(90deg, rgba(96,120,150,0.55), rgba(119,165,255,0.55))",
          }}
        >
          LOGISTIC AA
        </div>

        {/* Scroll فقط اینجا */}
        <div
          ref={scrollRef}
          style={{
            maxHeight: 260,      // ✅ اینو هرچقدر خواستی تنظیم کن
            overflowY: "auto",
            overflowX: "hidden",
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
                position: "sticky",
                top: 0,
                zIndex: 2,
                background: "#e8f1ff",
              }}
            >
              <tr>
                <th style={th}>Plane Dispatch (within 2 months)</th>
                <th style={th}>On the way to Iran (within 1 month)</th>
                <th style={th}>Customs (within 2 week)</th>
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
                    No Logistic items.
                  </td>
                </tr>
              ) : (
                safeRows.map((row, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                    <td style={td}>
                      <pre style={cellPre}>{pretty(row.plane_dispatch_within_2_months) || "—"}</pre>
                    </td>
                    <td style={td}>
                      <pre style={cellPre}>{pretty(row.on_the_way_to_iran_within_1_month) || "—"}</pre>
                    </td>
                    <td style={td}>
                      <pre style={cellPre}>{pretty(row.customs_within_2_week) || "—"}</pre>
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

const th = {
  padding: "8px 12px",
  textAlign: "left",
  background: "#e8f1ff",
  color: "#0f172a",
  fontWeight: 700,
  borderBottom: "1px solid rgba(148,163,184,0.45)",
  whiteSpace: "nowrap",
};

const td = {
  padding: "6px 10px",   // جمع‌وجورتر
  color: "#111827",
  fontWeight: 700,
  verticalAlign: "top",
  borderBottom: "1px solid #f1f5f9",
  width: "33.33%",
};

const cellPre = {
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 700,   // ✅ پررنگ‌تر
  lineHeight: 1.35,  // ✅ فاصله کمتر
  color: "#0f172a",
};

