import { useEffect, useRef, useState } from "react";

const pretty = (s) =>
  String(s || "")
    .trim()
    .replace(/\s*,\s*/g, "\n");

const splitPlaneDispatch = (value, fallbackDealNumber = "") => {
  const raw = String(value || "").trim();
  if (!raw) {
    return {
      dispatch: "",
      dealNumber: String(fallbackDealNumber || "").trim(),
    };
  }

  const slashIndex = raw.indexOf("/");
  if (slashIndex === -1) {
    return {
      dispatch: raw,
      dealNumber: String(fallbackDealNumber || "").trim(),
    };
  }

  const dispatch = raw.slice(0, slashIndex).trim();
  const dealNumber = raw.slice(slashIndex + 1).trim();

  return {
    dispatch,
    dealNumber: dealNumber || String(fallbackDealNumber || "").trim(),
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;
const LIMIT_DAYS = {
  plane: 60,
  iran: 30,
  customs: 14,
};

const hasMeaningful = (v) => {
  const s = String(v || "").trim();
  return Boolean(s) && s !== "-";
};

const displayOrBlank = (v) => {
  if (!hasMeaningful(v)) return "";
  return pretty(v);
};

const toUtcStartOfDayTs = (input) => {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const normalized = raw.replace(/[.]/g, "/").replace(/-/g, "/");
  const parts = normalized.split("/").map((x) => x.trim()).filter(Boolean);

  if (parts.length === 3) {
    let year;
    let month;
    let day;

    if (parts[0].length === 4) {
      year = Number(parts[0]);
      month = Number(parts[1]);
      day = Number(parts[2]);
    } else {
      day = Number(parts[0]);
      month = Number(parts[1]);
      year = Number(parts[2]);
    }

    if (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      Number.isFinite(day) &&
      year > 0 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return Date.UTC(year, month - 1, day);
    }
  }

  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return null;

const d = new Date(parsed);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

const buildCountdown = (isActive, now, limitDays, baselineTs) => {
  if (!isActive) {
    return {
      sinceTs: null,
      isActive: false,
      ageDays: null,
      remainingDays: null,
      isOverdue: false,
      label: "",
      tone: "muted",
    };
  }

  const startedAt = baselineTs || now;
  const ageDays = Math.max(0, Math.floor((now - startedAt) / DAY_MS));
  const remainingDays = limitDays - ageDays;
  const isOverdue = remainingDays <= 0;

  return {
    sinceTs: startedAt,
    isActive: true,
    ageDays,
    remainingDays,
    isOverdue,
    label: isOverdue ? `Expired ${Math.abs(remainingDays)}d` : `${remainingDays}d left`,
    tone: isOverdue ? "danger" : "info",
  };
};

export default function LogisticAATable({ rows = [], datasetDate = "" }) {
  const safeRows = Array.isArray(rows) ? rows : [];

  const scrollRef = useRef(null);
  const autoScrollIntervalRef = useRef(null);
  const userInteractingRef = useRef(false);
  const resumeTimeoutRef = useRef(null);

  const [rowStatusMap, setRowStatusMap] = useState({});
  const [clockTick, setClockTick] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setClockTick(Date.now()), 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

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
  }, [safeRows]);

  useEffect(() => {
    const now = clockTick;
    const datasetStartTs = toUtcStartOfDayTs(datasetDate);
    const nextRowStatusMap = {};

    safeRows.forEach((row, idx) => {
      

      const isPlaneActive = hasMeaningful(row.plane_dispatch_within_2_months);
      const isIranActive = hasMeaningful(row.on_the_way_to_iran_within_1_month);
      const isCustomsActive = hasMeaningful(row.customs_within_2_week);

      const plane = buildCountdown(isPlaneActive, now, LIMIT_DAYS.plane, datasetStartTs);
      const iran = buildCountdown(isIranActive, now, LIMIT_DAYS.iran, datasetStartTs);
      const customs = buildCountdown(isCustomsActive, now, LIMIT_DAYS.customs, datasetStartTs);
      nextRowStatusMap[idx] = { plane, iran, customs };

      
    });

    setRowStatusMap(nextRowStatusMap);
    }, [safeRows, clockTick, datasetDate]);

  return (
    <div style={outerCard}>
      <div style={innerCard}>
        <div style={titleStyle}>LOGISTIC AA</div>

        <div
          ref={scrollRef}
          style={{
            maxHeight: 260,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <table style={tableStyle}>
            <thead style={theadStyle}>
              <tr>
                <th style={th} colSpan={2}>
                  <div style={thLabelWrap}>
                    <span>Planned Dispatch (within 2 months)</span>
                    <span style={thBadge}>Countdown: 60→0</span>
                  </div>
                </th>
                <th style={th} rowSpan={2}>
                  <div style={thLabelStack}>
                    <span>On the way to Iran (within 1 month)</span>
                    <span style={thBadgeStack}>Countdown: 30→0</span>
                  </div>
                </th>
                <th style={th} rowSpan={2}>
                  <div style={thLabelStack}>
                    <span>Customs (within 2 week)</span>
                    <span style={thBadgeStack}>Countdown: 14→0</span>
                  </div>
                </th>
              </tr>
              <tr>
                <th style={thSub}>Planned Dispatch</th>
                <th style={thSub}>Deal Number</th>
              </tr>
            </thead>

            <tbody>
              {safeRows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={emptyCell}>
                    No Logistic items.
                  </td>
                </tr>
              ) : (
                safeRows.map((row, idx) => {
                  const { dispatch, dealNumber } = splitPlaneDispatch(
                    row.plane_dispatch_within_2_months,
                    row.deal_number
                  );
                  const status = rowStatusMap[idx] || {};
                  const planeStatus = status.plane || {};
                  const iranStatus = status.iran || {};
                  const customsStatus = status.customs || {};

                  return (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                      <td style={{ ...tdSub, ...(planeStatus.isOverdue ? tdOverdue : null) }}>
                        {planeStatus.isActive && (
                          <div style={{ marginBottom: 4 }}>
                            <span
                              style={{
                                ...countdownBadge,
                                ...(planeStatus.tone === "danger" ? countdownBadgeDanger : null),
                              }}
                            >
                              {planeStatus.label || ""}
                            </span>
                          </div>
                        )}
                        <pre style={{ ...cellPre, ...(planeStatus.isOverdue ? cellPreOverdue : null) }}>
                          {displayOrBlank(dispatch)}
                        </pre>
                      </td>

                      <td style={{ ...tdSub, ...(planeStatus.isOverdue ? tdOverdue : null) }}>
                        <pre style={{ ...cellPre, ...(planeStatus.isOverdue ? cellPreOverdue : null) }}>
                          {displayOrBlank(dealNumber)}
                        </pre>
                      </td>

                      <td style={{ ...tdMain, ...(iranStatus.isOverdue ? tdOverdue : null) }}>
                        {iranStatus.isActive && (
                          <div style={{ marginBottom: 4 }}>
                            <span
                              style={{
                                ...countdownBadge,
                                ...(iranStatus.tone === "danger" ? countdownBadgeDanger : null),
                              }}
                            >
                              {iranStatus.label || ""}
                            </span>
                          </div>
                        )}
                        <pre style={{ ...cellPre, ...(iranStatus.isOverdue ? cellPreOverdue : null) }}>
                          {displayOrBlank(row.on_the_way_to_iran_within_1_month)}
                        </pre>
                      </td>

                      <td style={{ ...tdMain, ...(customsStatus.isOverdue ? tdOverdue : null) }}>
                        {customsStatus.isActive && (
                          <div style={{ marginBottom: 4 }}>
                            <span
                              style={{
                                ...countdownBadge,
                                ...(customsStatus.tone === "danger" ? countdownBadgeDanger : null),
                              }}
                            >
                              {customsStatus.label || ""}
                            </span>
                          </div>
                        )}
                        <pre style={{ ...cellPre, ...(customsStatus.isOverdue ? cellPreOverdue : null) }}>
                          {displayOrBlank(row.customs_within_2_week)}
                        </pre>
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

const outerCard = {
  marginTop: 8,
  borderRadius: 18,
  background: "linear-gradient(135deg, #e3f2ff, #f8fafc)",
  padding: 1,
  boxShadow: "0 14px 32px rgba(15,23,42,0.10), 0 0 0 1px rgba(229,231,235,0.8)",
  overflow: "hidden",
};

const innerCard = {
  background: "#ffffff",
  borderRadius: 16,
  overflow: "hidden",
};

const titleStyle = {
  padding: "10px 14px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 14,
  fontWeight: 800,
  color: "#ffffff",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  background: "linear-gradient(90deg, rgba(96,120,150,0.55), rgba(119,165,255,0.55))",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  tableLayout: "fixed",
};

const theadStyle = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  background: "#e8f1ff",
};

const th = {
  padding: "8px 12px",
  textAlign: "left",
  background: "#e8f1ff",
  color: "#0f172a",
  fontWeight: 700,
  border: "1px solid rgba(148,163,184,0.45)",
  whiteSpace: "normal",
};

const thSub = {
  ...th,
  background: "#f1f6ff",
};

const thLabelWrap = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const thLabelStack = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 8,
};

const thBadge = {
  marginLeft: 8,
  fontSize: 11,
  fontWeight: 700,
  color: "#334155",
  background: "#dbeafe",
  border: "1px solid #bfdbfe",
  borderRadius: 999,
  padding: "2px 8px",
};

const thBadgeStack = {
  ...thBadge,
  marginLeft: 0,
};

const tdBase = {
  padding: "6px 10px",
  color: "#111827",
  fontWeight: 700,
  verticalAlign: "top",
  border: "1px solid #e5e7eb",
};

const tdSub = {
  ...tdBase,
  width: "20%",
};

const tdMain = {
  ...tdBase,
  width: "30%",
};

const tdOverdue = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fca5a5",
};

const countdownBadge = {
  display: "inline-block",
  fontSize: 11,
  fontWeight: 800,
  color: "#0369a1",
  background: "#e0f2fe",
  border: "1px solid #bae6fd",
  borderRadius: 999,
  padding: "2px 8px",
};

const countdownBadgeDanger = {
  color: "#991b1b",
  background: "#fee2e2",
  border: "1px solid #fca5a5",
};


const cellPre = {
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.35,
  color: "#0f172a",
};

const cellPreOverdue = {
  color: "#991b1b",
};

const emptyCell = {
  padding: 10,
  textAlign: "center",
  color: "#9ca3af",
  fontWeight: 600,
};
