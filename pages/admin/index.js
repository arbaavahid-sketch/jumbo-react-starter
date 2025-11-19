// pages/admin/index.js
import Link from "next/link";
import useSWR from "swr";
import { FiUsers, FiActivity } from "react-icons/fi";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const fetcher = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

const fmtEUR = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";

const toStr = (v) => (v == null ? "" : String(v));
const ensureArray = (v) => (Array.isArray(v) ? v : []);

const GROUP_COLORS = ["#2563eb", "#f97316", "#14b8a6"]; // رنگ برای Group A,B,C

export default function Admin() {
  const { data, error, isLoading } = useSWR("/api/data", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

  // دیتا برای کارت تکنیکال
  const { data: techData } = useSWR("/api/technical", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
  const techLatest = techData?.latest || null;

  if (error)
    return (
      <div style={{ padding: 16, color: "#b91c1c" }}>
        Error: {String(error.message || "load failed")}
      </div>
    );
  if (isLoading || !data) return <div style={{ padding: 16 }}>Loading...</div>;

  const groups = [
    { id: 1, key: "A" },
    { id: 2, key: "B" },
    { id: 3, key: "C" },
  ];

  const latest = data.latest || {};
  const allDeals = ensureArray(data.deals_exec);

  // ---------- Total Deals و Total Sales هر گروه بر اساس آخرین هفته ----------
  const totalsByGroup = groups.map((g) => {
    const gKey = g.key.toUpperCase();
    const last = latest[gKey] || {};

    const totalDeals = Number(last.total_deals || 0); // از latest
    const totalSales = Number(last.total_sales_eur || 0);

    return { key: gKey, label: `Group ${gKey}`, totalDeals, totalSales };
  });

  const dealsPieData = totalsByGroup.map((t) => ({
    name: t.label,
    value: t.totalDeals,
  }));

  const salesPieData = totalsByGroup.map((t) => ({
    name: t.label,
    value: t.totalSales,
  }));

  const renderPieLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }) => {
    if (!percent || percent <= 0) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#0f172a"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={700}
      >
        {(percent * 100).toFixed(1)}
      </text>
    );
  };

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "40px auto",
        padding: "0 16px 40px",
        fontFamily: "system-ui",
      }}
    >
      {/* هدر بالا: عنوان + لوگو سمت راست */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Admin – Groups Overview</h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "#6b7280",
            }}
          >
          </p>

          {/* دکمه CEO Messages زیر توضیحات */}
          <div style={{ marginTop: 14 }}>
            <Link href="/admin/messages" style={{ textDecoration: "none" }}>
              <button
                style={{
                  padding: "8px 18px",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(135deg, #6366f1, #ec4899)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: "0 12px 30px rgba(79,70,229,0.6)",
                  cursor: "pointer",
                }}
              >
                CEO Messages
              </button>
            </Link>
          </div>
        </div>

        {/* لوگو سمت راست، بدون ساعت */}
        <div
          style={{
            minWidth: 120,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              width: 160,
              height: 80,
              borderRadius: 24,
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src="/company-logo.svg"
              alt="Company Logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
        </div>
      </div>

      {/* کارت‌های گروه‌ها + کارت تکنیکال */}
      <div
        style={{
          display: "grid",
          gap: 18,
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          marginBottom: 32,
        }}
      >
        {groups.map((g) => {
          const row = latest[g.key] || {};
          return (
            <Link
              key={g.id}
              href={`/group/${g.id}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  position: "relative",
                  borderRadius: 24,
                  padding: 18,
                  color: "#e5e7eb",
                  background:
                    "radial-gradient(circle at top left, rgba(59,130,246,0.4), rgba(15,23,42,1))",
                  boxShadow:
                    "0 30px 70px rgba(15,23,42,0.75), 0 0 0 1px rgba(148,163,184,0.45)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.18,
                    background:
                      "radial-gradient(circle at top right, rgba(251,191,36,0.6), transparent 55%)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        opacity: 0.75,
                      }}
                    >
                      Group
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                      }}
                    >
                      {g.key}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "999px",
                      border: "1px solid rgba(148,163,184,0.9)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(15,23,42,0.75)",
                    }}
                  >
                    <FiUsers size={16} />
                  </div>
                </div>

                <div
                  style={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <div style={{ opacity: 0.8 }}>Total deals</div>
                    <div style={{ fontWeight: 700 }}>
                      {row.total_deals ?? 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.8 }}>Offers sent</div>
                    <div style={{ fontWeight: 700 }}>
                      {row.offers_sent ?? 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.8 }}>Weekly sales (€)</div>
                    <div style={{ fontWeight: 700 }}>
                      {fmtEUR(row.weekly_sales_eur ?? 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.8 }}>Total sales (€)</div>
                    <div style={{ fontWeight: 700 }}>
                      {fmtEUR(row.total_sales_eur ?? 0)}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {/* کارت Technical */}
        <Link href="/technical" style={{ textDecoration: "none" }}>
          <div
            style={{
              position: "relative",
              borderRadius: 24,
              padding: 18,
              color: "#e5e7eb",
              background:
                "radial-gradient(circle at top left, rgba(45,212,191,0.4), rgba(15,23,42,1))",
              boxShadow:
                "0 30px 70px rgba(15,23,42,0.75), 0 0 0 1px rgba(148,163,184,0.45)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.2,
                background:
                  "radial-gradient(circle at top right, rgba(59,130,246,0.7), transparent 55%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "relative",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    opacity: 0.75,
                  }}
                >
                  Technical
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                  }}
                >
                  TECH
                </div>
              </div>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "999px",
                  border: "1px solid rgba(148,163,184,0.9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(15,23,42,0.75)",
                }}
              >
                <FiActivity size={18} />
              </div>
            </div>

            <div
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                fontSize: 12,
              }}
            >
              <div>
                <div style={{ opacity: 0.8 }}>
                  Deals added this week
                </div>
                <div style={{ fontWeight: 700 }}>
                  {techLatest?.deals_added_technical ?? 0}
                </div>
              </div>
              <div>
                <div style={{ opacity: 0.8 }}>
                  Remaining in queue
                </div>
                <div style={{ fontWeight: 700 }}>
                  {techLatest?.remaining_queue ?? 0}
                </div>
              </div>
              <div>
                <div style={{ opacity: 0.8 }}>
                  Waiting for installation
                </div>
                <div style={{ fontWeight: 700 }}>
                  {techLatest?.waiting_installation ?? 0}
                </div>
              </div>
              <div>
                <div style={{ opacity: 0.8 }}>Total deals in week</div>
                <div style={{ fontWeight: 700 }}>
                  {techLatest?.total_deals_week ?? 0}
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* ---------- Pie Chart ها برای کل دیل‌ها و کل فروش ---------- */}
      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Group Distribution</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
            gap: 18,
          }}
        >
          {/* Pie Chart تعداد کل دیل‌ها */}
          <div
            style={{
              background:
                "radial-gradient(circle at top left,#eff6ff,#ffffff)",
              borderRadius: 22,
              padding: 18,
              boxShadow:
                "0 18px 45px rgba(15,23,42,0.12), 0 0 0 1px rgba(148,163,184,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                Total Deals 
              </div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#6b7280",
                }}
              >
                
              </div>
            </div>

            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={dealsPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    stroke="#f9fafb"
                    strokeWidth={2}
                    labelLine={false}
                    label={renderPieLabel}
                  >
                    {dealsPieData.map((entry, idx) => (
                      <Cell
                        key={`cell-deals-${idx}`}
                        fill={GROUP_COLORS[idx % GROUP_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={10}
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart کل فروش یورو */}
          <div
            style={{
              background:
                "radial-gradient(circle at top left,#ecfeff,#ffffff)",
              borderRadius: 22,
              padding: 18,
              boxShadow:
                "0 18px 45px rgba(15,23,42,0.12), 0 0 0 1px rgba(148,163,184,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                Total Sales (€) 
              </div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#6b7280",
                }}
              >
                
              </div>
            </div>

            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={salesPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    stroke="#f9fafb"
                    strokeWidth={2}
                    labelLine={false}
                    label={renderPieLabel}
                  >
                    {salesPieData.map((entry, idx) => (
                      <Cell
                        key={`cell-sales-${idx}`}
                        fill={GROUP_COLORS[idx % GROUP_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={10}
                  />
                  <Tooltip
                    formatter={(value) => fmtEUR(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Deal Executions Report برای همه گروه‌ها (بدون ستون Group) ---------- */}
      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>
          Deal Executions Report 
        </h2>

        <div
          style={{
            background: "#ffffff",
            borderRadius: 18,
            boxShadow:
              "0 16px 40px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.18)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              maxHeight: 420,
              overflow: "auto",
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
                  background:
                    "linear-gradient(135deg, #0f172a, #111827)",
                  color: "#e5e7eb",
                }}
              >
                <tr>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 600,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Deal
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 600,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Responsible
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 600,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      fontWeight: 600,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Amount (€)
                  </th>
                </tr>
              </thead>
              <tbody>
                {allDeals.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: 16,
                        textAlign: "center",
                        fontSize: 13,
                        color: "#6b7280",
                      }}
                    >
                      No deals in execution.
                    </td>
                  </tr>
                ) : (
                  allDeals.map((d, idx) => (
                    <tr
                      key={idx}
                      style={{
                        backgroundColor:
                          idx % 2 === 0 ? "#f9fafb" : "#ffffff",
                      }}
                    >
                      <td style={{ padding: "8px 12px", color: "#111827" }}>
                        {d.deal}
                      </td>
                      <td style={{ padding: "8px 12px", color: "#111827" }}>
                        {d.responsible}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          color: "#374151",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {d.status}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          color: "#111827",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {fmtEUR(d.amount_eur || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
