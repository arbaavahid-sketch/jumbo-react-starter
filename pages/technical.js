// pages/technical.js — داشبورد Technical

import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
} from "recharts";

import Head from "next/head";
import useSWR from "swr";
import LiveClock from "../components/LiveClock";
import CeoMessage from "../components/CeoMessage";
import { useEffect, useRef } from "react";

import {
  FiCalendar,
  FiTrendingUp,
  FiPieChart,
  FiLayers,
  FiClock,
  FiMapPin,
  FiMonitor,
  FiBookOpen,
  FiLink,
  FiCheckSquare,
} from "react-icons/fi";

const fetcher = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

// --- helpers برای درصد تغییرات ---

function lastTwo(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { curr: null, prev: null };
  }
  const sorted = [...rows].sort(
    (a, b) => new Date(a.date || 0) - new Date(b.date || 0)
  );
  const n = sorted.length;
  return {
    prev: n >= 2 ? sorted[n - 2] : null,
    curr: sorted[n - 1],
  };
}

function pctDelta(curr, prev) {
  if (curr == null || prev == null) return null;
  const c = Number(curr) || 0;
  const p = Number(prev) || 0;
  if (p === 0) {
    if (c === 0) return { pct: 0, dir: 0 };
    return { pct: 100, dir: 1, inf: true };
  }
  const diff = ((c - p) / Math.abs(p)) * 100;
  return {
    pct: diff,
    dir: diff === 0 ? 0 : diff > 0 ? 1 : -1,
  };
}

// Badge کوچک زیر عدد کارت
function DeltaBadge({ delta }) {
  if (!delta) return null;
  const { pct, dir, inf } = delta;

  const arrow = dir > 0 ? "▲" : dir < 0 ? "▼" : "•";
  const color = dir > 0 ? "#16a34a" : dir < 0 ? "#dc2626" : "#6b7280";
  const text =
    dir === 0 ? "0.0%" : inf ? "100%+" : `${Math.abs(pct).toFixed(1)}%`;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        color,
        background: "rgba(15,23,42,0.03)",
        padding: "2px 10px",
        borderRadius: 999,
        marginTop: 6,
        border: "1px solid rgba(148,163,184,0.4)",
      }}
    >
      <span aria-hidden>{arrow}</span>
      <span>{text}</span>
    </span>
  );
}

export default function TechnicalDashboard() {
  // داده فنی از /api/technical
  const { data, error, isLoading } = useSWR("/api/technical", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });

  // داده کلی از /api/data (برای CEO message + technical_queue)
  const { data: mainData } = useSWR("/api/data", fetcher, {
    revalidateOnFocus: false,
  });

  const ceoMessages = mainData?.ceo_messages || {};
  const ceoText =
    ceoMessages.TECH ||
    ceoMessages.TECHNICAL ||
    "Technical CEO message — editable in CEO Messages panel.";

  // جدول Tech Queue از /api/data
  const techQueueRaw = Array.isArray(mainData?.technical_queue)
    ? mainData.technical_queue
    : [];
  const techQueue = [...techQueueRaw].sort((a, b) => {
    const ga = (a.group || "").localeCompare(b.group || "");
    if (ga !== 0) return ga;
    return (a.deal || "").localeCompare(b.deal || "");
  });

  let body;

  if (error) {
    body = (
      <div
        style={{
          padding: 24,
          borderRadius: 24,
          background:
            "linear-gradient(135deg,rgba(239,68,68,0.08),rgba(248,113,113,0.25))",
          color: "#7f1d1d",
          border: "1px solid rgba(248,113,113,0.45)",
        }}
      >
        Error loading technical data.
      </div>
    );
  } else if (isLoading || !data) {
    body = (
      <div
        style={{
          padding: 24,
          borderRadius: 24,
          background:
            "linear-gradient(135deg,rgba(0,95,158,0.05),rgba(0,184,148,0.05))",
          border: "1px solid rgba(148,163,184,0.35)",
          color: "#4b5563",
        }}
      >
        Loading technical data…
      </div>
    );
  } else if (!data.latest) {
    body = (
      <div
        style={{
          padding: 24,
          borderRadius: 24,
          background:
            "linear-gradient(135deg,rgba(0,95,158,0.08),rgba(0,184,148,0.10))",
          boxShadow:
            "0 24px 60px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.35)",
          color: "#0f172a",
        }}
      >
        No technical data yet.
      </div>
    );
  } else {
    const t = data.latest;

    // دو ردیف آخر برای درصد تغییرات
    const { curr, prev } = lastTwo(data.rows);

    const deltas = {
      queue: pctDelta(curr?.remaining_queue, prev?.remaining_queue),
      waiting: pctDelta(
        curr?.waiting_installation,
        prev?.waiting_installation
      ),
    };

    // ردیف‌های Waiting for installation
    const waitingRows = (t.waiting_installation_ids || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [idPart, ...rest] = line.split("-");
        return {
          id: idPart.trim(),
          description: rest.join("-").trim(),
        };
      });

    // ردیف‌های Installed
    const installedRows = (t.installed_ids || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [idPart, ...rest] = line.split("-");
        return {
          id: idPart.trim(),
          description: rest.join("-").trim(),
        };
      });

    const installedCount = installedRows.length;

    const waitingCount = Number(
      t.waiting_installation != null
        ? t.waiting_installation
        : waitingRows.length
    );
    const totalInstall = installedCount + (waitingCount || 0);
    const installSuccessPct =
      totalInstall > 0 ? (installedCount / totalInstall) * 100 : 0;

    const installedDelta =
      totalInstall > 0
        ? { pct: installSuccessPct, dir: 1, inf: false }
        : null;

    // نمودار نفرات
    const dealsChartData = [
      {
        name: "Aref",
        weeklyDeals: t.aref_deals_done ?? 0,
        totalDeals: t.aref ?? 0,
      },
      {
        name: "Golsanam",
        weeklyDeals: t.golsanam_deals_done ?? 0,
        totalDeals: t.golsanam ?? 0,
      },
      {
        name: "Vahid",
        weeklyDeals: t.vahid_deals_done ?? 0,
        totalDeals: t.vahid ?? 0,
      },
      {
        name: "Pouria",
        weeklyDeals: t.pouria_deals_done ?? 0,
        totalDeals: t.pouria ?? 0,
      },
    ];

    body = (
      <div
        style={{
          borderRadius: 28,
          padding: 20,
          background: "#f9fafb",
          boxShadow:
            "0 20px 50px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.25)",
        }}
      >
        {/* بالای داشبورد: کارت‌ها + نمودار کنار هم */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,2.1fr) minmax(0,1.5fr)",
            gap: 20,
            alignItems: "flex-start", 
          }}
        >
          {/* کارت‌ها */}
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                gap: 12,
              }}
            >
              <TechCard
                icon={<FiCalendar />}
                label="DATE OF PUBLISH"
                value={t.date}
              />

              <TechCard
                icon={<FiTrendingUp />}
                label="DEALS ADDED THIS WEEK"
                value={t.deals_added_technical}
              />

              <TechCard
                icon={<FiPieChart />}
                label="TOTAL DEALS DONE (WEEK)"
                value={t.total_deals_week}
              />

              <TechCard
                icon={<FiLayers />}
                label="TECHNICAL APPROVAL QUEUE"
                value={techQueue.length}
                delta={deltas.queue}
              />

              <TechCard
                icon={<FiClock />}
                label="WAITING FOR INSTALLATION"
                value={t.waiting_installation}
                delta={deltas.waiting}
              />

              <TechCard
                icon={<FiCheckSquare />}
                label="INSTALLED DEALS AT 2025"
                value={installedCount}
                delta={installedDelta}
              />

              <TechCard
                icon={<FiMapPin />}
                label="PROMOTION TRIPS / MEETINGS"
                value={t.promotion_trips}
              />

              <TechCard
                icon={<FiMonitor />}
                label="DEMO SHOWS (QUARTERLY)"
                value={t.demo_shows}
              />

              <TechCard
                icon={<FiBookOpen />}
                label="INTERNAL TRAININGS (QUARTERLY)"
                value={t.internal_trainings}
              />

              <TechCard
  icon={<FiLink />}
  label="LAST MEETING"
  value={t.last_meeting || "-"}
  iconLink={t.mom_link}
/>

            </div>
          </div>

          {/* نمودار کنار کارت‌ها - کوتاه‌تر شده */}
          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              boxShadow:
                "0 18px 45px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.35)",
              background: "#ffffff",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#0f172a",
                marginBottom: 4,
              }}
            >
              DEALS DONE DURING THE WEEK BY PERSON
            </div>

            <div style={{ height: 220, marginTop: 4 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dealsChartData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis
                    allowDecimals={false}
                    stroke="#6b7280"
                    domain={[0, "dataMax + 2"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid rgba(148,163,184,0.6)",
                      borderRadius: 8,
                      color: "#0f172a",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="weeklyDeals"
                    name="Deals this week"
                    fill="#38bdf8"
                    radius={[6, 6, 0, 0]}
                    barSize={30}
                  />
                  <Bar
                    dataKey="totalDeals"
                    name="Total deals"
                    fill="#0f766e"
                    radius={[6, 6, 0, 0]}
                    barSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* سه جدول در یک ردیف، هم‌اندازه و شیک */}
        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "1.1fr 1.1fr 1fr",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          {/* Installed deals — اسکرول اتوماتیک + هدر آبی */}
          <div
            style={{
              borderRadius: 20,
              background: "#ffffff",
              boxShadow:
                "0 18px 45px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.35)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              minHeight: 260,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#6b7280",
                marginBottom: 8,
              }}
            >
              INSTALLED DEALS
            </div>

            {installedRows.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  padding: 10,
                  borderRadius: 16,
                  background: "rgba(148,163,184,0.1)",
                  color: "#6b7280",
                  border: "1px dashed rgba(148,163,184,0.6)",
                  flex: 1,
                }}
              >
                No installed deals recorded yet.
              </div>
            ) : (
              <AutoScrollContainer
                height={210}
                speed={1}
                containerStyle={{
                  borderRadius: 16,
                  background: "#ffffff",
                  boxShadow: "inset 0 0 0 1px rgba(226,232,240,0.9)",
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
                      zIndex: 10,
                    }}
                  >
                    <tr>
                      <th
                        style={{
                          padding: "8px 10px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: "#0f172a",
                          borderBottom:
                            "1px solid rgba(148,163,184,0.6)",
                          background: "#e0f2fe",
                          width: 80,
                        }}
                      >
                        ID
                      </th>
                      <th
                        style={{
                          padding: "8px 10px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: "#0f172a",
                          borderBottom:
                            "1px solid rgba(148,163,184,0.6)",
                          background: "#e0f2fe",
                        }}
                      >
                        Center / Subject
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {installedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        style={{
                          background:
                            idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                        }}
                      >
                        <td
                          style={{
                            padding: "7px 10px",
                            borderBottom:
                              idx === installedRows.length - 1
                                ? "none"
                                : "1px solid rgba(226,232,240,0.9)",
                            whiteSpace: "nowrap",
                            color: "#111827",
                            fontWeight: 500,
                          }}
                        >
                          {row.id}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            borderBottom:
                              idx === installedRows.length - 1
                                ? "none"
                                : "1px solid rgba(226,232,240,0.9)",
                            color: "#374151",
                          }}
                        >
                          {row.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AutoScrollContainer>
            )}
          </div>

          {/* Waiting installation — جدول وسطی */}
          <div
            style={{
              borderRadius: 20,
              background: "#ffffff",
              boxShadow:
                "0 18px 45px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.35)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              minHeight: 260,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#6b7280",
                marginBottom: 8,
              }}
            >
              WAITING INSTALLATION DETAILS
            </div>

            {waitingRows.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  padding: 10,
                  borderRadius: 16,
                  background: "rgba(148,163,184,0.1)",
                  color: "#6b7280",
                  border: "1px dashed rgba(148,163,184,0.6)",
                  flex: 1,
                }}
              >
                No items in installation queue.
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 16,
                  overflow: "auto",
                  boxShadow: "inset 0 0 0 1px rgba(226,232,240,0.9)",
                  flex: 1,
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
    zIndex: 10,
  }}
>
  <tr>
    <th
      style={{
        padding: "8px 12px",
        textAlign: "left",
        fontWeight: 600,
        color: "#0f172a",
        borderBottom: "1px solid rgba(148,163,184,0.5)",
        background: "#e0f2fe",   // 👈 آبی کمرنگ مثل بقیه
        width: 80,
      }}
    >
      ID
    </th>
    <th
      style={{
        padding: "8px 12px",
        textAlign: "left",
        fontWeight: 600,
        color: "#0f172a",
        borderBottom: "1px solid rgba(148,163,184,0.5)",
        background: "#e0f2fe",   // 👈 یکسان‌سازی
      }}
    >
      Center / Subject
    </th>
  </tr>
</thead>

                  <tbody>
                    {waitingRows.map((row, idx) => (
                      <tr
                        key={idx}
                        style={{
                          background:
                            idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                        }}
                      >
                        <td
                          style={{
                            padding: "7px 10px",
                            borderBottom:
                              idx === waitingRows.length - 1
                                ? "none"
                                : "1px solid rgba(226,232,240,0.9)",
                            whiteSpace: "nowrap",
                            color: "#111827",
                            fontWeight: 500,
                          }}
                        >
                          {row.id}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            borderBottom:
                              idx === waitingRows.length - 1
                                ? "none"
                                : "1px solid rgba(226,232,240,0.9)",
                            color: "#374151",
                          }}
                        >
                          {row.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Technical Approval Queue — اسکرول اتوماتیک */}
          <div
            style={{
              borderRadius: 20,
              background: "#ffffff",
              boxShadow:
                "0 18px 45px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.35)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              minHeight: 260,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#6b7280",
                marginBottom: 8,
              }}
            >
              TECHNICAL APPROVAL QUEUE
            </div>

            {techQueue.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  padding: 10,
                  borderRadius: 16,
                  background: "rgba(148,163,184,0.1)",
                  color: "#6b7280",
                  border: "1px dashed rgba(148,163,184,0.6)",
                  flex: 1,
                }}
              >
                No items in technical queue.
              </div>
            ) : (
              <AutoScrollContainer
                height={210}
                speed={1}
                containerStyle={{
                  borderRadius: 16,
                  background: "#ffffff",
                  boxShadow: "inset 0 0 0 1px rgba(226,232,240,0.9)",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                    minWidth: 600,
                  }}
                >
                  <thead
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
                    }}
                  >
                    <tr>
                      <th
                        style={{
                          padding: "8px 10px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: "#0f172a",
                          borderBottom:
                            "1px solid rgba(148,163,184,0.6)",
                          background: "#e0f2fe",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Owner
                      </th>
                      <th
                        style={{
                          padding: "8px 10px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: "#0f172a",
                          borderBottom:
                            "1px solid rgba(148,163,184,0.6)",
                          background: "#e0f2fe",
                        }}
                      >
                        Deal
                      </th>
                      <th
                        style={{
                          padding: "8px 10px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: "#0f172a",
                          borderBottom:
                            "1px solid rgba(148,163,184,0.6)",
                          background: "#e0f2fe",
                        }}
                      >
                        Center
                      </th>
                      <th
                        style={{
                          padding: "8px 10px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: "#0f172a",
                          borderBottom:
                            "1px solid rgba(148,163,184,0.6)",
                          background: "#e0f2fe",
                        }}
                      >
                        Subject
                      </th>
                      <th
                        style={{
                          padding: "8px 10px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: "#0f172a",
                          borderBottom:
                            "1px solid rgba(148,163,184,0.6)",
                          background: "#e0f2fe",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {techQueue.map((row, idx) => (
                      <tr
                        key={idx}
                        style={{
                          background:
                            idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                        }}
                      >
                        <td
                          style={{
                            padding: "7px 10px",
                            borderBottom:
                              idx === techQueue.length - 1
                                ? "none"
                                : "1px solid rgba(226,232,240,0.9)",
                            fontWeight: 600,
                            color: "#111827",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.group}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            borderBottom:
                              idx === techQueue.length - 1
                                ? "none"
                                : "1px solid rgba(226,232,240,0.9)",
                            color: "#111827",
                            fontWeight: 500,
                          }}
                        >
                          {row.deal}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            borderBottom:
                              idx === techQueue.length - 1
                                ? "none"
                                : "1px solid rgba(226,232,240,0.9)",
                            color: "#374151",
                          }}
                        >
                          {row.center || "—"}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            borderBottom:
                              idx === techQueue.length - 1
                                ? "none"
                                : "1px solid rgba(226,232,240,0.9)",
                            color: "#374151",
                          }}
                        >
                          {row.subject || "—"}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            borderBottom:
                              idx === techQueue.length - 1
                                ? "none"
                                : "1px solid rgba(226,232,240,0.9)",
                            color: row.status ? "#0f766e" : "#9ca3af",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.status || "In process"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AutoScrollContainer>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px 24px 40px",
        background: "#f3f6fb",
        color: "#0f172a",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
      }}
    >
      <Head>
        <title>Technical Dashboard</title>
      </Head>

      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* هدر */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "#005F9E",
              }}
            >
              Technical Dashboard
            </h1>
            <p
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#6b7280",
              }}
            ></p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                padding: 10,
                borderRadius: 18,
                background: "#ffffff",
                border: "1px solid rgba(148,163,184,0.35)",
                boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
              }}
            >
              <img
                src="/company-logo.png"
                style={{ width: 150, height: 70, objectFit: "contain" }}
                alt="Company logo"
              />
            </div>
            <div
              style={{
                fontSize: 12,
                padding: "4px 14px",
                borderRadius: 999,
                background: "#ffffff",
                border: "1px solid rgba(148,163,184,0.4)",
                boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
                color: "#005F9E",
              }}
            >
              <LiveClock />
            </div>
          </div>
        </div>

        {/* پیام CEO */}
        <div
          style={{
            marginBottom: 18,
            borderRadius: 20,
            background:
              "linear-gradient(135deg,rgba(0,95,158,0.06),rgba(0,184,148,0.06))",
            padding: 16,
            boxShadow:
              "0 14px 30px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.25)",
          }}
        >
          <CeoMessage text={ceoText} />
        </div>

        {body}
      </div>
    </main>
  );
}

// کانتینر اسکرول اتومات — نسخه ساده با setInterval
function AutoScrollContainer({
  children,
  height = 280,
  speed = 1, // پیکسل در هر 100ms
  containerStyle = {},
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const interval = setInterval(() => {
      if (!el) return;

      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) {
        // محتوا کوتاهه، نیازی به اسکرول نیست
        return;
      }

      if (el.scrollTop >= maxScroll - 1) {
        // رسید به انتها → برگرد بالا
        el.scrollTop = 0;
      } else {
        el.scrollTop += speed;
      }
    }, 100);

    return () => clearInterval(interval);
  }, [speed]);

  return (
    <div
      ref={containerRef}
      style={{
        height,
        overflowY: "auto",
        overflowX: "auto",
        ...containerStyle,
      }}
    >
      {children}
    </div>
  );
}

/* --- کارت‌ها با آیکون (نسخه جمع‌وجور و شیک‌تر) --- */
function TechCard({ icon, label, value, link, delta, iconLink }) {
  const hasLink = !!link;
  const IconWrap = ({ children }) =>
    iconLink ? (
      <a
        href={iconLink}
        target="_blank"
        rel="noreferrer"
        title="Open MOM"
        style={{ display: "inline-flex" }}
      >
        {children}
      </a>
    ) : (
      children
    );

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 12,
        background:
          "linear-gradient(135deg,rgba(0,95,158,0.06),rgba(0,184,148,0.05))",
        boxShadow:
          "0 10px 24px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.25)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 90,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* آیکون داخل دایره شیک */}
        <IconWrap>
  <div
    style={{
      width: 32,
      height: 32,
      borderRadius: 999,
      background: "rgba(59,130,246,0.12)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 0 0 1px rgba(59,130,246,0.35)",
      cursor: iconLink ? "pointer" : "default",
    }}
  >
    <span style={{ fontSize: 18, color: "#005F9E" }}>{icon}</span>
  </div>
</IconWrap>


        {/* لیبل کارت بولدتر */}
        <span
          style={{
            fontSize: 11,
            color: "#374151",
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>

      <div
        style={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 4,
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          {hasLink ? (
            link ? (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#ffffff",
                  textDecoration: "none",
                  fontSize: 13,
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: "1px solid #005F9E",
                  background: "linear-gradient(135deg,#005F9E,#00B894)",
                  boxShadow: "0 6px 14px rgba(15,23,42,0.2)",
                }}
              >
                {value || "Open"}
              </a>
            ) : (
              "-"
            )
          ) : (
            value ?? 0
          )}
        </span>

        {delta && !hasLink && <DeltaBadge delta={delta} />}
      </div>
    </div>
  );
}
