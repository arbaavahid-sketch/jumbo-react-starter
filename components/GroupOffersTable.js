import { useEffect, useMemo, useRef, useState } from "react";
import { FiExternalLink, FiRefreshCw } from "react-icons/fi";

const GROUP_OFFERS_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1HIooVZO-SdR3Dn6tcRnmnUcVLUVCJlLmg_pixa8JgAE/edit?gid=0#gid=0";

export const GROUP_VIEWS = {
  OFFERS: "offers",
  DASHBOARD: "dashboard",
};

export function normalizeGroupKey(value) {
  const cleaned = String(value || "")
    .replace(/group/gi, "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();

  if (["1", "A"].includes(cleaned)) return "A";
  if (["2", "B"].includes(cleaned)) return "B";
  if (["3", "C"].includes(cleaned)) return "C";

  return cleaned;
}

export function getScheduledGroupView(now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tehran",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    return hour >= 8 && hour < 12 ? GROUP_VIEWS.OFFERS : GROUP_VIEWS.DASHBOARD;
  } catch {
    const hour = now.getHours();
    return hour >= 8 && hour < 12 ? GROUP_VIEWS.OFFERS : GROUP_VIEWS.DASHBOARD;
  }
}

export function useScheduledGroupView() {
  const [scheduledView, setScheduledView] = useState(GROUP_VIEWS.DASHBOARD);
  const [manualView, setManualView] = useState(null);

  useEffect(() => {
    const update = () => setScheduledView(getScheduledGroupView());
    update();
    const timer = setInterval(update, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const activeView = manualView || scheduledView;

  return {
    activeView,
    scheduledView,
    isManual: Boolean(manualView),
    toggleView: () =>
      setManualView(activeView === GROUP_VIEWS.OFFERS ? GROUP_VIEWS.DASHBOARD : GROUP_VIEWS.OFFERS),
  };
}

export function GroupViewToggle({ activeView, scheduledView, isManual, onToggle }) {
  const showingOffers = activeView === GROUP_VIEWS.OFFERS;

  return (
    <button type="button" onClick={onToggle} style={toggleButtonStyle}>
      <FiRefreshCw size={15} />
      <span>{showingOffers ? "Show Dashboard" : "Show Offers"}</span>
      <span style={toggleMetaStyle}>
        {isManual ? "Manual" : scheduledView === GROUP_VIEWS.OFFERS ? "08-12" : "Live"}
      </span>
    </button>
  );
}

const fmtEUR = (value) =>
  Number.isFinite(value)
    ? new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(value)
    : "-";

const fmtPercent = (value) =>
  Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    : "-";

const sortDateValue = (value) => {
  const ts = Date.parse(String(value || "").trim());
  return Number.isFinite(ts) ? ts : 0;
};

export default function GroupOffersTable({ rows = [], groupKey = "" }) {
  const scrollRef = useRef(null);
  const autoScrollIntervalRef = useRef(null);
  const userInteractingRef = useRef(false);
  const resumeTimeoutRef = useRef(null);

  const filteredRows = useMemo(() => {
    const normalizedGroup = normalizeGroupKey(groupKey);
    return (Array.isArray(rows) ? rows : [])
      .filter((row) => normalizeGroupKey(row.group_key || row.group) === normalizedGroup)
      .slice()
      .sort(
        (a, b) =>
          Number(b.amount_eur || 0) - Number(a.amount_eur || 0) ||
          sortDateValue(b.close_date) - sortDateValue(a.close_date),
      );
  }, [rows, groupKey]);

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
        if (!el || userInteractingRef.current) return;

        if (el.scrollHeight <= el.clientHeight + 2) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) el.scrollTop = 0;
        else el.scrollTop += 1;
      }, 80);
    };

    const handleUserInteract = () => {
      userInteractingRef.current = true;
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = setTimeout(() => {
        userInteractingRef.current = false;
      }, 6000);
    };

    startAutoScroll();
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
  }, [filteredRows]);

  const totalAmount = filteredRows.reduce((sum, row) => {
    const value = Number(row.amount_eur);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
  const sheetSummary = filteredRows.find(
    (row) => Number.isFinite(row.group_count) || Number.isFinite(row.group_share),
  );
  const sheetCount = Number(sheetSummary?.group_count);
  const sheetShare = Number(sheetSummary?.group_share);
  const totalGroupedRows = (Array.isArray(rows) ? rows : []).filter((row) =>
    ["A", "B", "C"].includes(normalizeGroupKey(row.group_key || row.group)),
  ).length;
  const displayDeals = Number.isFinite(sheetCount) ? sheetCount : filteredRows.length;
  const groupShare = Number.isFinite(sheetShare)
    ? sheetShare
    : totalGroupedRows > 0
      ? filteredRows.length / totalGroupedRows
      : null;

  return (
    <div style={outerCard}>
      <div style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>Group {normalizeGroupKey(groupKey)}</div>
          <h2 style={titleStyle}>Offers Sent</h2>
        </div>
        <div style={summaryRowStyle}>
          <div style={summaryItemStyle}>
            <span style={summaryLabelStyle}>Deals</span>
            <strong>{displayDeals}</strong>
          </div>
          <div style={summaryItemStyle}>
            <span style={summaryLabelStyle}>Share</span>
            <strong>{fmtPercent(groupShare)}</strong>
          </div>
          <div style={summaryItemStyle}>
            <span style={summaryLabelStyle}>Amount</span>
            <strong>{fmtEUR(totalAmount)}</strong>
          </div>
          <a
            href={GROUP_OFFERS_SHEET_URL}
            target="_blank"
            rel="noreferrer"
            title="Open source sheet"
            style={sheetLinkStyle}
          >
            <FiExternalLink size={16} />
          </a>
        </div>
      </div>

      <div ref={scrollRef} style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead style={theadStyle}>
            <tr>
              <th style={thStyle}>Deal Name</th>
              <th style={thStyle}>Close Date</th>
              <th style={thStyle}>Owner</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={4} style={emptyCellStyle}>
                  No offers for this group.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => (
                <tr
                  key={`${row.deal_name}-${idx}`}
                  style={idx % 2 === 0 ? rowEvenStyle : rowOddStyle}
                >
                  <td style={dealCellStyle}>{row.deal_name || "-"}</td>
                  <td style={tdStyle}>{row.close_date || "-"}</td>
                  <td style={tdStyle}>{row.owner || "-"}</td>
                  <td style={amountCellStyle}>
                    {row.amount_label || fmtEUR(Number(row.amount_eur))}
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

const outerCard = {
  background: "#ffffff",
  border: "1px solid #dbe3ef",
  borderRadius: 12,
  overflow: "hidden",
  boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "18px 22px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f8fafc",
};

const eyebrowStyle = {
  color: "#2563eb",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
};

const titleStyle = {
  margin: "2px 0 0",
  fontSize: 30,
  lineHeight: 1.2,
  color: "#0f172a",
};

const summaryRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
};

const summaryItemStyle = {
  minWidth: 128,
  padding: "10px 12px",
  border: "1px solid #dbe3ef",
  borderRadius: 8,
  background: "#ffffff",
  color: "#0f172a",
};

const summaryLabelStyle = {
  display: "block",
  marginBottom: 2,
  color: "#64748b",
  fontSize: 13,
  fontWeight: 800,
  textTransform: "uppercase",
};

const sheetLinkStyle = {
  width: 36,
  height: 36,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
  textDecoration: "none",
};

const tableWrapStyle = {
  maxHeight: "calc(100vh - 430px)",
  minHeight: 440,
  overflow: "auto",
};

const tableStyle = {
  width: "100%",
  minWidth: 760,
  borderCollapse: "collapse",
  tableLayout: "fixed",
};

const theadStyle = {
  position: "sticky",
  top: 0,
  zIndex: 1,
  background: "#eaf2ff",
};

const thStyle = {
  padding: "14px 16px",
  textAlign: "left",
  color: "#0f172a",
  fontSize: 16,
  fontWeight: 800,
  borderBottom: "1px solid #cbd5e1",
};

const tdStyle = {
  padding: "14px 16px",
  borderBottom: "1px solid #e5e7eb",
  color: "#111827",
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1.35,
  verticalAlign: "top",
  wordBreak: "break-word",
};

const dealCellStyle = {
  ...tdStyle,
  fontSize: 19,
  fontWeight: 850,
};

const amountCellStyle = {
  ...tdStyle,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const rowEvenStyle = {
  background: "#ffffff",
};

const rowOddStyle = {
  background: "#f9fafb",
};

const emptyCellStyle = {
  ...tdStyle,
  padding: 24,
  textAlign: "center",
  color: "#64748b",
};

const toggleButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 40,
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
};

const toggleMetaStyle = {
  padding: "2px 6px",
  borderRadius: 6,
  background: "#e0f2fe",
  color: "#0369a1",
  fontSize: 11,
  fontWeight: 900,
};
