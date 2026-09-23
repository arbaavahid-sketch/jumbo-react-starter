import { fetchJson } from "../../lib/fetch-json";
// pages/share/[slug].js — داشبورد عمومی گروه/تکنیکال بر اساس slug (مثلاً /share/...)
import GroupDashboard from "../../components/GroupDashboard";
import Head from "next/head";
import useSWR from "swr";

import { PUBLIC_SHARE_MAP } from "../../lib/publicShareMap";
import SupplyDashboard from "../supply";
import NewsTickerEn from "../../components/NewsTickerEn";
import NewsTicker from "../../components/NewsTicker";
import CeoMessage from "../../components/CeoMessage";
import RatesStrip from "../../components/RatesStrip";
import DashboardPageHeader from "../../components/DashboardPageHeader";

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

import {
  FiTruck,
  FiCalendar,
  FiNavigation,
  FiLink,
  FiPlusCircle,
  FiCheckCircle,
  FiList,
  FiBriefcase,
  FiCamera,
  FiBookOpen,
  FiTool,
} from "react-icons/fi";

// ---------- getServerSideProps ----------
export async function getServerSideProps(context) {
  const { slug } = context.params || {};
  const groupKey =
    typeof slug === "string" && Object.hasOwn(PUBLIC_SHARE_MAP, slug)
      ? PUBLIC_SHARE_MAP[slug]
      : null;

  if (!groupKey) return { notFound: true };

  return {
    props: { slug, groupKey },
  };
}
const fetcher = fetchJson;

const dateSortValue = (input) => {
  const raw = String(input || "").trim();
  if (!raw) return 0;

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

    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      return year * 10000 + month * 100 + day;
    }
  }

  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? ts : 0;
};
function lastTwoRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { curr: null, prev: null };
  const sorted = [...rows].sort((a, b) => dateSortValue(a.date) - dateSortValue(b.date));
  const n = sorted.length;
  return { prev: n >= 2 ? sorted[n - 2] : null, curr: sorted[n - 1] };
}

function pctDelta(curr, prev) {
  if (curr == null || prev == null) return { pct: 0, dir: 0 };
  const c = Number(curr) || 0;
  const p = Number(prev) || 0;

  if (p === 0) return { pct: c === 0 ? 0 : 100, dir: c === 0 ? 0 : 1, inf: c !== 0 };

  const diff = ((c - p) / Math.abs(p)) * 100;
  return { pct: diff, dir: diff === 0 ? 0 : diff > 0 ? 1 : -1 };
}

function parseQueueDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/[.]/g, "/").replace(/-/g, "/");
  const parts = normalized.split("/").map((part) => Number(part.trim()));
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;

  const [a, b, c] = parts;
  const year = String(a).length === 4 ? a : c;
  const month = b;
  const day = String(a).length === 4 ? c : a;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysInQueue(dateText) {
  const date = parseQueueDate(dateText);
  if (!date) return null;
  const today = new Date();
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

function parseTextList(value = "", { withQueueAge = false } = {}) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const pipeParts = line.split("|").map((part) => part.trim());
      if (pipeParts.length >= 3) {
        const [id, entryDate, ...descriptionParts] = pipeParts;
        return {
          id,
          entryDate,
          daysInQueue: daysInQueue(entryDate),
          description: descriptionParts.join(" | ").trim(),
        };
      }

      const dated = line.match(
        /^(.+?)\s+-\s+(\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})\s+-\s+(.*)$/,
      );
      if (dated) {
        return {
          id: dated[1].trim(),
          entryDate: dated[2].trim(),
          daysInQueue: daysInQueue(dated[2]),
          description: dated[3].trim(),
        };
      }

      const [idPart, ...rest] = line.split("-");
      return {
        id: idPart.trim(),
        entryDate: "",
        daysInQueue: withQueueAge ? null : undefined,
        description: rest.join("-").trim(),
      };
    });
}

// ---------- DeltaBadge ----------
function DeltaBadge({ pct, dir, inf }) {
  const arrow = dir > 0 ? "▲" : dir < 0 ? "▼" : "•";
  const color = dir > 0 ? "#0a7f2e" : dir < 0 ? "#c92a2a" : "#6b7280";
  const text = inf ? "100%+" : `${Math.abs(pct).toFixed(1)}%`;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        color,
        background: "rgba(0,0,0,0.04)",
        padding: "2px 8px",
        borderRadius: 999,
      }}
    >
      <span aria-hidden>{arrow}</span>
      <span>{text}</span>
    </span>
  );
}

function PublicTechnicalDashboard() {
  const { data, error, isLoading } = useSWR("/api/technical", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });

  const { data: mainData, error: mainError } = useSWR("/api/data", fetcher, {
    revalidateOnFocus: false,
  });

  const ceoMessages = mainData?.ceo_messages || {};
  const ceoText =
    ceoMessages.TECH ||
    ceoMessages.TECHNICAL ||
    "Technical CEO message — editable in CEO Messages panel.";

  const techQueueRaw = Array.isArray(mainData?.technical_queue) ? mainData.technical_queue : [];
  const techQueue = [...techQueueRaw].sort((a, b) => {
    const ga = (a.group || "").localeCompare(b.group || "");
    if (ga !== 0) return ga;
    return (a.deal || "").localeCompare(b.deal || "");
  });

  let body;

  if (error || mainError) {
    body = (
      <div
        style={{
          padding: 24,
          borderRadius: 24,
          background: "linear-gradient(135deg,rgba(239,68,68,0.08),rgba(248,113,113,0.25))",
          color: "#7f1d1d",
          border: "1px solid rgba(248,113,113,0.45)",
        }}
      >
        {(error || mainError).message}
      </div>
    );
  } else if (isLoading || !data || !mainData) {
    body = (
      <div
        style={{
          padding: 24,
          borderRadius: 24,
          background: "linear-gradient(135deg,rgba(0,95,158,0.05),rgba(0,184,148,0.05))",
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
          background: "linear-gradient(135deg,rgba(0,95,158,0.08),rgba(0,184,148,0.10))",
          boxShadow: "0 24px 60px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.35)",
          color: "#0f172a",
        }}
      >
        No technical data yet.
      </div>
    );
  } else {
    const t = data.latest;
    const { curr, prev } = lastTwoRows(data.rows);

    const deltas = {
      queue: pctDelta(curr?.remaining_queue, prev?.remaining_queue),
      waiting: pctDelta(curr?.waiting_installation, prev?.waiting_installation),
    };

    const repairingRows = parseTextList(t.repairing_ids, { withQueueAge: true });
    const servicedRows = parseTextList(t.serviced_ids);

    const dealsChartData = [
      { name: "Aref", weeklyDeals: t.aref_deals_done ?? 0, totalDeals: t.aref ?? 0 },
      { name: "Golsanam", weeklyDeals: t.golsanam_deals_done ?? 0, totalDeals: t.golsanam ?? 0 },
      { name: "Vahid", weeklyDeals: t.vahid_deals_done ?? 0, totalDeals: t.vahid ?? 0 },
      { name: "Pouria", weeklyDeals: t.pouria_deals_done ?? 0, totalDeals: t.pouria ?? 0 },
    ];

    body = (
      <div
        style={{
          borderRadius: 28,
          padding: 24,
          background: "#f9fafb",
          boxShadow: "0 24px 60px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.3)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 18,
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
            label="Total deals done (week)"
            value={t.total_deals_week}
          />
          <TechCard
            icon={<FiList />}
            label="Technical Approval Queue"
            value={t.remaining_queue}
            delta={deltas.queue}
          />
          <TechCard
            icon={<FiTruck />}
            label="Waiting for Installation"
            value={t.waiting_installation}
            delta={deltas.waiting}
          />
          <TechCard icon={<FiTool />} label="Under Repair / Service" value={repairingRows.length} />
          <TechCard
            icon={<FiCheckCircle />}
            label="Serviced / Repaired"
            value={servicedRows.length}
          />
          <TechCard
            icon={<FiBriefcase />}
            label="Promotion trips / meetings"
            value={t.promotion_trips}
          />
          <TechCard icon={<FiCamera />} label="Demo shows (quarterly)" value={t.demo_shows} />
          <TechCard
            icon={<FiBookOpen />}
            label="Internal trainings (quarterly)"
            value={t.internal_trainings}
          />
          <TechCard icon={<FiLink />} label="MOM link" value="Open" link={t.mom_link} />
        </div>

        <div style={{ marginTop: 28 }}>
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
            Deals done during the week by person
          </div>

          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 18px 45px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.35)",
              background: "#ffffff",
              height: 260,
              padding: "12px 16px",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dealsChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis allowDecimals={false} stroke="#6b7280" />
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
                  barSize={38}
                />
                <Bar
                  dataKey="totalDeals"
                  name="Total deals"
                  fill="#0f766e"
                  radius={[6, 6, 0, 0]}
                  barSize={38}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          style={{
            marginTop: 28,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))",
            gap: 18,
          }}
        >
          <TechnicalListPanel
            title={`Under Repair / Service (${repairingRows.length})`}
            style={{ gridColumn: "1 / -1" }}
          >
            <TechnicalSimpleTable
              rows={repairingRows}
              showQueueAge
              emptyText="No devices are under repair/service."
            />
          </TechnicalListPanel>
          <TechnicalListPanel title={`Serviced / Repaired (${servicedRows.length})`}>
            <TechnicalSimpleTable
              rows={servicedRows}
              emptyText="No serviced devices recorded yet."
            />
          </TechnicalListPanel>
        </div>

        {/* Tech Queue */}
        <div style={{ marginTop: 36 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6b7280",
              marginBottom: 10,
            }}
          >
            Technical Approval Queue
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
              }}
            >
              No items in technical queue.
            </div>
          ) : (
            <div
              style={{
                borderRadius: 20,
                boxShadow: "0 22px 60px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.35)",
                background: "#ffffff",
                maxHeight: 340,
                overflowY: "auto",
                overflowX: "auto",
              }}
            >
              <table
                style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 }}
              >
                <thead>
                  <tr
                    style={{
                      background:
                        "linear-gradient(135deg,rgba(0,95,158,0.12),rgba(0,184,148,0.12))",
                    }}
                  >
                    <th
                      style={{
                        padding: "8px 10px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#0f172a",
                        borderBottom: "1px solid rgba(148,163,184,0.6)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Owner
                    </th>
                    <th
                      style={{
                        padding: "8px 10px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#0f172a",
                        borderBottom: "1px solid rgba(148,163,184,0.6)",
                      }}
                    >
                      Deal
                    </th>
                    <th
                      style={{
                        padding: "8px 10px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#0f172a",
                        borderBottom: "1px solid rgba(148,163,184,0.6)",
                      }}
                    >
                      Center
                    </th>
                    <th
                      style={{
                        padding: "8px 10px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#0f172a",
                        borderBottom: "1px solid rgba(148,163,184,0.6)",
                      }}
                    >
                      Subject
                    </th>
                    <th
                      style={{
                        padding: "8px 10px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#0f172a",
                        borderBottom: "1px solid rgba(148,163,184,0.6)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {techQueue.map((row, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
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
            </div>
          )}
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
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
      }}
    >
      <Head>
        <title>Technical Dashboard</title>
      </Head>

      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <DashboardPageHeader
          eyebrow="PUBLIC SHARE / TECHNICAL"
          title="Technical Dashboard"
          description="Technical pipeline, ownership and current queue status."
          Icon={FiTool}
          accent="#3478c7"
        />

        <div
          style={{
            marginBottom: 18,
            borderRadius: 20,
            background: "linear-gradient(135deg,rgba(0,95,158,0.06),rgba(0,184,148,0.06))",
            padding: 16,
            boxShadow: "0 14px 30px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.25)",
          }}
        >
          <CeoMessage text={ceoText} />
        </div>

        {body}
      </div>
    </main>
  );
}

function TechnicalListPanel({ title, children, style }) {
  return (
    <div
      style={{
        borderRadius: 20,
        background: "#ffffff",
        boxShadow: "0 22px 60px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.35)",
        padding: 12,
        ...style,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#6b7280",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function TechnicalSimpleTable({ rows, emptyText, showQueueAge = false }) {
  if (!rows.length) {
    return (
      <div
        style={{
          fontSize: 13,
          padding: 10,
          borderRadius: 16,
          background: "rgba(148,163,184,0.1)",
          color: "#6b7280",
          border: "1px dashed rgba(148,163,184,0.6)",
        }}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 16,
        maxHeight: 260,
        overflow: "auto",
        boxShadow: "inset 0 0 0 1px rgba(226,232,240,0.9)",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
          <tr>
            {[
              ["ID", 80],
              ...(showQueueAge
                ? [
                    ["Date In", 100],
                    ["Days", 64],
                  ]
                : []),
              ["Center / Subject", "auto"],
            ].map(([title, width]) => (
              <th
                key={title}
                style={{
                  padding: "8px 10px",
                  textAlign: "left",
                  fontWeight: 700,
                  color: "#0f172a",
                  borderBottom: "1px solid rgba(148,163,184,0.6)",
                  background: "#e0f2fe",
                  width,
                  whiteSpace: "nowrap",
                }}
              >
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
              <td style={{ padding: "7px 10px", color: "#111827", fontWeight: 600 }}>{row.id}</td>
              {showQueueAge ? (
                <>
                  <td style={{ padding: "7px 10px", color: "#374151", whiteSpace: "nowrap" }}>
                    {row.entryDate || "-"}
                  </td>
                  <td style={{ padding: "7px 10px", color: "#b45309", fontWeight: 800 }}>
                    {Number.isFinite(row.daysInQueue) ? row.daysInQueue : "-"}
                  </td>
                </>
              ) : null}
              <td style={{ padding: "7px 10px", color: "#374151" }}>{row.description || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --- کارت‌ها با آیکون برای داشبورد فنی --- */
function TechCard({ icon, label, value, link, delta }) {
  const hasLink = !!link;

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 16,
        background: "linear-gradient(135deg,rgba(0,95,158,0.08),rgba(0,184,148,0.06))",
        boxShadow: "0 12px 30px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.3)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 110,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22, color: "#005F9E" }}>{icon}</span>
        <span
          style={{
            fontSize: 11,
            color: "#6b7280",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>

      <div
        style={{
          marginTop: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 4,
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
          {hasLink ? (
            link ? (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#ffffff",
                  textDecoration: "none",
                  fontSize: 14,
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: "1px solid #005F9E",
                  background: "linear-gradient(135deg,#005F9E,#00B894)",
                  boxShadow: "0 8px 18px rgba(15,23,42,0.2)",
                }}
              >
                {value || "Open"}
              </a>
            ) : (
              "-"
            )
          ) : (
            (value ?? 0)
          )}
        </span>

        {delta && !hasLink && <DeltaBadge {...delta} />}
      </div>
    </div>
  );
}

// ---------- Default Export Wrapper ----------
export default function PublicSharePage(props) {
  const normalizedKey = String(props?.groupKey || "")
    .trim()
    .toUpperCase();

  if (normalizedKey === "TECHNICAL") return <PublicTechnicalDashboard />;
  if (normalizedKey === "SUPPLY") return <SupplyDashboard />;

  return <GroupDashboard groupKey={normalizedKey} isPublic />;
}
