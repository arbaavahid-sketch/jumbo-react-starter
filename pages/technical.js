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

// آیکون‌ها
import {
  FiCalendar,
  FiPlusCircle,
  FiCheckCircle,
  FiList,
  FiTruck,
  FiBriefcase,
  FiCamera,
  FiBookOpen,
  FiLink,
} from "react-icons/fi";

const fetcher = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

export default function TechnicalDashboard() {
  const { data, error, isLoading } = useSWR("/api/technical", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });

  const { data: mainData } = useSWR("/api/data", fetcher, {
    revalidateOnFocus: false,
  });

  const ceoMessages = mainData?.ceo_messages || {};
  const ceoText =
    ceoMessages.TECH ||
    ceoMessages.Technical ||
    "Technical CEO message — editable in CEO Messages panel.";

  let body;

  if (error) {
    body = (
      <div
        style={{
          padding: 24,
          borderRadius: 20,
          background: "#fee2e2",
          color: "#991b1b",
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
          borderRadius: 20,
          background: "#f3f4f6",
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
          borderRadius: 20,
          background: "linear-gradient(135deg,#f9fafb,#e5f0ff)",
          boxShadow: "0 0 0 1px rgba(148,163,184,0.3)",
        }}
      >
        No technical data yet.
      </div>
    );
  } else {
    const t = data.latest;

    // ردیف‌های Waiting for installation از متن چندخطی شیت
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

    const waitingCount = waitingRows.length;

    // ردیف‌های Installed از متن چندخطی شیت
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

    // داده‌ی نمودار: Deals این هفته + Total deals برای هر نفر
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
          borderRadius: 24,
          padding: 24,
          background: "linear-gradient(135deg,#f9fafb,#e0f2fe)",
          boxShadow:
            "0 24px 60px rgba(15,23,42,0.12), 0 0 0 1px rgba(148,163,184,0.35)",
        }}
      >
        {/* کارت‌های KPI بالا */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            gap: 16,
          }}
        >
          <TechCard icon={<FiCalendar />} label="Date of Publish" value={t.date} />

          <TechCard
            icon={<FiPlusCircle />}
            label="Deals added this week"
            value={t.deals_added_technical}
          />

          <TechCard
            icon={<FiCheckCircle />}
            label="Total deals done"
            value={t.total_deals_week}
          />

          <TechCard
            icon={<FiList />}
            label="Technical Approval Queue"
            value={t.remaining_queue}
          />

          <TechCard
            icon={<FiTruck />}
            label="Waiting for Installation"
            value={waitingCount}
          />

          <TechCard
            icon={<FiCheckCircle />}
            label="Installed deals"
            value={installedCount}
          />

          <TechCard
            icon={<FiBriefcase />}
            label="Promotion trips / meetings"
            value={t.promotion_trips}
          />

          <TechCard
            icon={<FiCamera />}
            label="Demo shows (quarterly)"
            value={t.demo_shows}
          />

          <TechCard
            icon={<FiBookOpen />}
            label="Internal trainings (quarterly)"
            value={t.internal_trainings}
          />

          {/* کارت MOM link */}
          <TechCard icon={<FiLink />} label="MOM link" value="Open" link={t.mom_link} />
        </div>

        {/* سه ستون هم‌تراز: Installed + Waiting + Chart */}
        <div
          style={{
            marginTop: 32,
            display: "grid",
            gridTemplateColumns:
              "minmax(0,1.1fr) minmax(0,1.6fr) minmax(0,1.4fr)",
            gap: 24,
            alignItems: "stretch",
          }}
        >
          {/* ستون ۱: Installed deals */}
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#4b5563",
                marginBottom: 8,
              }}
            >
              Installed deals
            </div>

            {installedRows.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  padding: 10,
                  borderRadius: 12,
                  background: "rgba(148,163,184,0.1)",
                  color: "#6b7280",
                  flex: 1,
                }}
              >
                No installed deals recorded yet.
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow:
                    "0 16px 40px rgba(15,23,42,0.10), 0 0 0 1px rgba(148,163,184,0.25)",
                  background: "#ffffff",
                  flex: 1,
                  minHeight: 220,
                }}
              >
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
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
                          background:
                            "linear-gradient(135deg,rgba(16,185,129,0.15),rgba(56,189,248,0.12))",
                        }}
                      >
                        <th
                          style={{
                            padding: "8px 12px",
                            textAlign: "left",
                            fontWeight: 600,
                            color: "#0f172a",
                            borderBottom: "1px solid rgba(148,163,184,0.4)",
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
                            borderBottom: "1px solid rgba(148,163,184,0.4)",
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
                            background: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                          }}
                        >
                          <td
                            style={{
                              padding: "7px 12px",
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
                              padding: "7px 12px",
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
                </div>
              </div>
            )}
          </div>

          {/* ستون ۲: Waiting installation details */}
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#4b5563",
                marginBottom: 8,
              }}
            >
              Waiting installation details
            </div>

            {waitingRows.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  padding: 10,
                  borderRadius: 12,
                  background: "rgba(148,163,184,0.1)",
                  color: "#6b7280",
                  flex: 1,
                }}
              >
                No items in installation queue.
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow:
                    "0 16px 40px rgba(15,23,42,0.10), 0 0 0 1px rgba(148,163,184,0.25)",
                  background: "#ffffff",
                  flex: 1,
                  minHeight: 220,
                }}
              >
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
                        background:
                          "linear-gradient(135deg,rgba(59,130,246,0.15),rgba(56,189,248,0.12))",
                      }}
                    >
                      <th
                        style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          fontWeight: 600,
                          color: "#0f172a",
                          borderBottom: "1px solid rgba(148,163,184,0.4)",
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
                          borderBottom: "1px solid rgba(148,163,184,0.4)",
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
                          background: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                        }}
                      >
                        <td
                          style={{
                            padding: "7px 12px",
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
                            padding: "7px 12px",
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

          {/* ستون ۳: نمودار Deals per person */}
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#4b5563",
                marginBottom: 8,
              }}
            >
              Deals done during the week by person
            </div>

            <div
              style={{
                borderRadius: 16,
                overflow: "hidden",
                boxShadow:
                  "0 16px 40px rgba(15,23,42,0.10), 0 0 0 1px rgba(148,163,184,0.25)",
                background: "#ffffff",
                flex: 1,
                minHeight: 220,
                padding: "12px 16px",
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dealsChartData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="weeklyDeals"
                    name="Deals this week"
                    fill="#2563eb"
                    radius={[6, 6, 0, 0]}
                    barSize={38}
                  />
                  <Bar
                    dataKey="totalDeals"
                    name="Total deals"
                    fill="#f97316"
                    radius={[6, 6, 0, 0]}
                    barSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <Head>
        <title>Technical Dashboard</title>
      </Head>

      {/* هدر بالا */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Technical Dashboard</h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <img
            src="/company-logo.svg"
            style={{ width: 160, height: 90, objectFit: "contain" }}
          />
          <div
            style={{
              fontSize: 12,
              padding: "4px 12px",
              borderRadius: 999,
              background: "rgba(148,163,184,0.15)",
            }}
          >
            <LiveClock />
          </div>
        </div>
      </div>

      <CeoMessage text={ceoText} />

      {body}
    </main>
  );
}

/* --- کارت‌ها با آیکون --- */
function TechCard({ icon, label, value, link }) {
  const hasLink = !!link;

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 16,
        background: "#ffffff",
        boxShadow:
          "0 12px 30px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20, color: "#0ea5e9" }}>{icon}</span>
        <span
          style={{
            fontSize: 12,
            color: "#6b7280",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10 }}>
        {hasLink ? (
          link ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: 16,
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
      </div>
    </div>
  );
}
