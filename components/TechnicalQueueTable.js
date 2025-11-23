// components/TechnicalQueueTable.js
import React from "react";

export default function TechnicalQueueTable({ rows = [] }) {
  const data = Array.isArray(rows) ? rows : [];

  if (!data.length) {
    return (
      <div
        style={{
          marginTop: 24,
          padding: 16,
          borderRadius: 18,
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          fontSize: 13,
          color: "#6b7280",
        }}
      >
        هیچ دیلی در صف تأیید فنی ثبت نشده است.
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 24,
        borderRadius: 18,
        background: "#ffffff",
        boxShadow:
          "0 18px 45px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.18)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#111827",
          }}
        >
          Technical Approval Queue – Details
        </span>
        <span
          style={{
            fontSize: 12,
            color: "#6b7280",
          }}
        >
          {data.length} deal(s) in queue
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
                background: "#f3f4f6",
                textAlign: "left",
              }}
            >
              <th style={thStyle}>#</th>
              <th style={thStyle}>Deal</th>
              <th style={thStyle}>Center</th>
              <th style={thStyle}>Subject</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Group</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, idx) => (
              <tr
                key={`${r.group}-${r.deal}-${idx}`}
                style={{
                  borderBottom: "1px solid #e5e7eb",
                  background: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                }}
              >
                <td style={tdStyle}>{idx + 1}</td>
                <td style={{ ...tdStyle, fontWeight: 600, color: "#111827" }}>
                  {r.deal || "-"}
                </td>
                <td style={tdStyle}>{r.center || "-"}</td>
                <td style={tdStyle}>{r.subject || "-"}</td>
                <td style={tdStyle}>{r.status || "-"}</td>
                <td style={tdStyle}>{r.group || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  padding: "10px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: "#4b5563",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "9px 12px",
  color: "#374151",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};
