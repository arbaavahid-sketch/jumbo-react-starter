import { useEffect, useRef, useState } from "react";
import { splitDeal, hasMeaningful, dealKey } from "../lib/logistic";

const pretty = (s) =>
  String(s || "")
    .trim()
    .replace(/\s*,\s*/g, "\n");

const DAY_MS = 24 * 60 * 60 * 1000;
const LIMIT_DAYS = {
  plane: 60,
  iran: 30,
  customs: 14,
};

const displayOrBlank = (v) => {
  if (!hasMeaningful(v)) return "";
  return pretty(v);
};

const toUtcStartOfDayTs = (input) => {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const normalized = raw.replace(/[.]/g, "/").replace(/-/g, "/");
  const parts = normalized
    .split("/")
    .map((x) => x.trim())
    .filter(Boolean);

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

// --- Per-deal countdown anchoring (localStorage) ---------------------------
// Each deal's countdown starts the first time we see its (stage + content) key
// and is remembered in the browser. Editing the sheet weekly therefore only
// restarts the deals whose content changed; the rest keep their original date.
const LEDGER_KEY = "logisticAA:firstSeenV1";

const startOfTodayTs = () => {
  const d = new Date();
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
};

const loadLedger = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LEDGER_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveLedger = (ledger) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
  } catch {
    /* ignore quota / private-mode write errors */
  }
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
    const today = startOfTodayTs();
    // datasetDate is only a last-resort fallback now; each deal is anchored
    // individually below.
    const datasetStartTs = toUtcStartOfDayTs(datasetDate);

    const ledger = loadLedger();
    const nextLedger = {};
    const nextRowStatusMap = {};

    // Keep an existing first-seen date for a deal, otherwise anchor it to today
    // (a deal is "new" when its stage+content key has never been seen before).
    const anchorFor = (stage, rawValue) => {
      const key = dealKey(stage, rawValue);
      const ts = ledger[key] ?? today ?? datasetStartTs ?? now;
      nextLedger[key] = ts;
      return ts;
    };

    safeRows.forEach((row, idx) => {
      const isPlaneActive = hasMeaningful(row.plane_dispatch_within_2_months);
      const isIranActive = hasMeaningful(row.on_the_way_to_iran_within_1_month);
      const isCustomsActive = hasMeaningful(row.customs_within_2_week);

      const planeTs = isPlaneActive ? anchorFor("plane", row.plane_dispatch_within_2_months) : null;
      const iranTs = isIranActive ? anchorFor("iran", row.on_the_way_to_iran_within_1_month) : null;
      const customsTs = isCustomsActive ? anchorFor("customs", row.customs_within_2_week) : null;

      const plane = buildCountdown(isPlaneActive, now, LIMIT_DAYS.plane, planeTs);
      const iran = buildCountdown(isIranActive, now, LIMIT_DAYS.iran, iranTs);
      const customs = buildCountdown(isCustomsActive, now, LIMIT_DAYS.customs, customsTs);
      nextRowStatusMap[idx] = { plane, iran, customs };
    });

    // nextLedger only holds keys still present, so stale deals are pruned and a
    // removed-then-re-added deal correctly restarts. Guard against wiping the
    // ledger when rows are momentarily empty (e.g. a failed data refresh).
    if (safeRows.length > 0) saveLedger(nextLedger);

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
            overflowX: "auto",
          }}
        >
          <table style={tableStyle}>
            <thead style={theadStyle}>
              <tr>
                <th style={th}>
                  <div style={thLabelStack}>
                    <span>Planned Dispatch (within 2 months)</span>
                    <span style={thBadgeStack}>Countdown: 60→0</span>
                  </div>
                </th>
                <th style={th}>
                  <div style={thLabelStack}>
                    <span>On the way to Iran (within 1 month)</span>
                    <span style={thBadgeStack}>Countdown: 30→0</span>
                  </div>
                </th>
                <th style={th}>
                  <div style={thLabelStack}>
                    <span>Customs (within 2 week)</span>
                    <span style={thBadgeStack}>Countdown: 14→0</span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {safeRows.length === 0 ? (
                <tr>
                  <td colSpan={3} style={emptyCell}>
                    No Logistic items.
                  </td>
                </tr>
              ) : (
                safeRows.map((row, idx) => {
                  const status = rowStatusMap[idx] || {};
                  const stages = [
                    {
                      key: "plane",
                      parts:
                        row.plane_parts ||
                        splitDeal(row.plane_dispatch_within_2_months, row.deal_number),
                      st: status.plane || {},
                    },
                    {
                      key: "iran",
                      parts: row.iran_parts || splitDeal(row.on_the_way_to_iran_within_1_month),
                      st: status.iran || {},
                    },
                    {
                      key: "customs",
                      parts: row.customs_parts || splitDeal(row.customs_within_2_week),
                      st: status.customs || {},
                    },
                  ];

                  return (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                      {stages.map(({ key, parts, st }) => {
                        const overdue = st.isOverdue ? tdOverdue : null;
                        const fields = [
                          { label: "Center", value: parts.center },
                          { label: "Deal No.", value: parts.dealNumber },
                          { label: "Item", value: parts.item },
                        ].filter((f) => displayOrBlank(f.value));

                        return (
                          <td key={key} style={{ ...tdMain, ...overdue }}>
                            {st.isActive && (
                              <div style={{ marginBottom: 6 }}>
                                <span
                                  style={{
                                    ...countdownBadge,
                                    ...(st.tone === "danger" ? countdownBadgeDanger : null),
                                  }}
                                >
                                  {st.label || ""}
                                </span>
                              </div>
                            )}
                            {fields.map((f) => (
                              <div key={f.label} style={partRow}>
                                <span style={partLabel}>{f.label}</span>
                                <pre
                                  style={{
                                    ...partValue,
                                    ...(st.isOverdue ? cellPreOverdue : null),
                                  }}
                                >
                                  {displayOrBlank(f.value)}
                                </pre>
                              </div>
                            ))}
                          </td>
                        );
                      })}
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
  minWidth: 760,
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
  width: "33.33%",
};

const partRow = {
  display: "flex",
  alignItems: "baseline",
  gap: 6,
  marginBottom: 4,
};

const partLabel = {
  flex: "0 0 auto",
  minWidth: 64,
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const partValue = {
  margin: 0,
  flex: "1 1 auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.3,
  color: "#0f172a",
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
