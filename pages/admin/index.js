// pages/admin/index.js
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiCheckSquare,
  FiClock,
  FiDatabase,
  FiExternalLink,
  FiMessageSquare,
  FiPackage,
  FiPieChart,
  FiSend,
  FiShoppingBag,
  FiTool,
  FiTrendingUp,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import RatesStrip from "../../components/RatesStrip";

const fetcher = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

const num = (v) => Number(v || 0);
const ensureArray = (v) => (Array.isArray(v) ? v : []);
const text = (v) => (v == null ? "" : String(v));
const fmtInt = (n) => new Intl.NumberFormat("en-US").format(num(n));
const fmtEUR = (n) =>
  num(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const GROUP_COLORS = {
  A: "#2563eb",
  B: "#f97316",
  C: "#14b8a6",
  D: "#7c3aed",
  E: "#dc2626",
  F: "#0891b2",
};

const FALLBACK_COLORS = ["#2563eb", "#f97316", "#14b8a6", "#7c3aed", "#dc2626", "#0891b2"];

const parseTextList = (value = "") =>
  text(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [idPart, ...rest] = line.split("-");
      return { id: idPart.trim(), description: rest.join("-").trim() };
    });

const normGroup = (value) => text(value).trim().toUpperCase();

function latestWeeklyByGroup(rows) {
  const map = {};
  for (const row of ensureArray(rows)) {
    const group = normGroup(row.group);
    if (!group) continue;
    const week = num(row.week);
    if (!map[group] || week >= num(map[group].week)) map[group] = row;
  }
  return map;
}

export default function Admin() {
  const {
    data,
    error,
    isLoading,
    mutate: refreshMain,
  } = useSWR("/api/data", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
  const { data: technicalData, error: technicalError } = useSWR("/api/technical", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });
  const { data: supplyData, error: supplyError } = useSWR("/api/supply", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });

  if (error) {
    return <LoadState tone="danger" title="Admin data could not load" detail={String(error)} />;
  }

  if (isLoading || !data) {
    return <LoadState title="Loading admin command center..." />;
  }

  const groups = ensureArray(data.groups).length
    ? ensureArray(data.groups)
    : ["A", "B", "C"].map((key, idx) => ({ id: idx + 1, key, name: `Group ${key}` }));
  const weeklyLatest = latestWeeklyByGroup(data.weekly_reports);
  const latest = data.latest || {};
  const ceoMessages = data.ceo_messages || {};
  const supplyRows = ensureArray(supplyData?.rows);
  const supplyTotals = supplyData?.totals || {};
  const tech = technicalData?.latest || {};
  const techQueue = ensureArray(data.technical_queue).sort((a, b) => {
    const groupCmp = text(a.group).localeCompare(text(b.group));
    return groupCmp || text(a.deal).localeCompare(text(b.deal));
  });

  const installedRows = parseTextList(tech.installed_ids);
  const waitingRows = parseTextList(tech.waiting_installation_ids);
  const dealsExec = ensureArray(data.deals_exec);
  const arList = ensureArray(data.ar_list);
  const megaDeals = ensureArray(data.mega_deals_details || data.mega_deals);

  const groupModels = groups.map((g, idx) => {
    const key = normGroup(g.key || g.code || g.group || g.name);
    const live = latest[key] || {};
    const weekly = weeklyLatest[key] || {};
    const color = GROUP_COLORS[key] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
    return {
      id: g.id || idx + 1,
      key,
      title: g.name || `Group ${key}`,
      color,
      date: live.date || weekly.date || "-",
      week: weekly.week || "-",
      totalSales: num(live.total_sales_eur || weekly.total_sales_eur),
      weeklySales: num(live.weekly_sales_eur || weekly.weekly_sales_eur),
      offers: num(live.offers_sent || weekly.offers_sent),
      totalDeals: num(live.total_deals || weekly.total_deals),
      inSales: num(weekly.in_sales_process),
      inSupply: num(weekly.in_supply),
      inTechnical: num(weekly.in_technical),
      mega: num(live.mega_deals || weekly.mega_deals),
      trips: num(live.weekly_trips || weekly.weekly_trips),
      lastMeeting: live.last_meeting || weekly.last_meeting || "-",
      mom: live.mom || weekly.mom || "",
      ceoMessage: text(ceoMessages[key]).trim(),
      members: ensureArray(data.members?.[key]),
      megaDeals: megaDeals.filter((row) => normGroup(row.group) === key),
    };
  });

  const totals = groupModels.reduce(
    (acc, g) => ({
      sales: acc.sales + g.totalSales,
      weeklySales: acc.weeklySales + g.weeklySales,
      offers: acc.offers + g.offers,
      deals: acc.deals + g.totalDeals,
      inSales: acc.inSales + g.inSales,
      inSupply: acc.inSupply + g.inSupply,
      inTechnical: acc.inTechnical + g.inTechnical,
      mega: acc.mega + g.mega,
      trips: acc.trips + g.trips,
    }),
    {
      sales: 0,
      weeklySales: 0,
      offers: 0,
      deals: 0,
      inSales: 0,
      inSupply: 0,
      inTechnical: 0,
      mega: 0,
      trips: 0,
    },
  );

  const maxDistributionSales = Math.max(...groupModels.map((g) => g.totalSales), 0);
  const minVisibleSalesSlice = maxDistributionSales * 0.035;
  const distribution = groupModels.map((g) => ({
    name: `Group ${g.key}`,
    sales: g.totalSales,
    chartSales: g.totalSales > 0 ? Math.max(g.totalSales, minVisibleSalesSlice) : 0,
    deals: g.totalDeals,
    fill: g.color,
  }));

  const supplyAlerts = supplyRows
    .filter((row) => num(row.deals_in_supply_side_stage_now) || num(row.late_items))
    .sort(
      (a, b) =>
        num(b.deals_in_supply_side_stage_now) +
        num(b.late_items) -
        (num(a.deals_in_supply_side_stage_now) + num(a.late_items)),
    )
    .slice(0, 6);

  const adminAlerts = [
    supplyError && "Supply API is not responding.",
    technicalError && "Technical API is not responding.",
    !supplyData?.publishDate && "Supply publish date is missing.",
    !technicalData?.latest && "Technical latest row is missing.",
    groupModels.some((g) => !g.ceoMessage) && "Some CEO messages are empty.",
    num(supplyTotals.late_items) > 0 &&
      `${fmtInt(supplyTotals.late_items)} late ERP items need review.`,
    techQueue.length > 0 &&
      `${fmtInt(techQueue.length)} deals are waiting in technical approval queue.`,
  ].filter(Boolean);

  return (
    <>
      <Head>
        <title>Admin Command Center</title>
      </Head>

      <main style={page}>
        <div style={shell}>
          <header style={hero}>
            <div>
              <div style={eyebrow}>Admin Panel</div>
              <h1 style={title}>Management Command Center</h1>
              <p style={subtitle}>
                One screen for group performance, supply workload, technical queue, CEO messages,
                and operational alerts.
              </p>
            </div>
            <div style={heroActions}>
              <ActionLink href="/" label="Portal" />
              <ActionLink href="/admin/messages" label="CEO Messages" Icon={FiMessageSquare} />
              <ActionLink href="/admin/weekly-history" label="Weekly History" Icon={FiBarChart2} />
              <button type="button" onClick={() => refreshMain()} style={refreshButton}>
                Refresh
              </button>
            </div>
          </header>

          <div style={ratesStripWrap}>
            <RatesStrip />
          </div>

          <section style={overviewGrid}>
            <MetricCard
              label="Total Sales 2026"
              value={`€ ${fmtEUR(totals.sales)}`}
              Icon={FiTrendingUp}
            />
            <MetricCard
              label="Weekly Sales"
              value={`€ ${fmtEUR(totals.weeklySales)}`}
              Icon={FiBarChart2}
            />
            <MetricCard label="Offers Sent" value={fmtInt(totals.offers)} Icon={FiSend} />
            <MetricCard label="Total Deals" value={fmtInt(totals.deals)} Icon={FiShoppingBag} />
            <MetricCard label="Sales Process" value={fmtInt(totals.inSales)} Icon={FiUsers} />
            <MetricCard label="Supply Process" value={fmtInt(totals.inSupply)} Icon={FiTruck} />
            <MetricCard
              label="Technical Process"
              value={fmtInt(totals.inTechnical)}
              Icon={FiActivity}
            />
            <MetricCard label="Mega Projects" value={fmtInt(totals.mega)} Icon={FiPieChart} />
          </section>

          <section style={sectionGrid}>
            <Panel title="Operational Alerts" Icon={FiAlertTriangle}>
              <div style={alertList}>
                {adminAlerts.length ? (
                  adminAlerts.map((item) => (
                    <div key={item} style={alertItem}>
                      {item}
                    </div>
                  ))
                ) : (
                  <EmptyState text="No urgent admin alerts." />
                )}
              </div>
            </Panel>

            <Panel title="Group Distribution by Total Sales" Icon={FiPieChart}>
              <div style={{ height: 250 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={distribution}
                      dataKey="chartSales"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={86}
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {distribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" />
                    <Tooltip formatter={(_, __, item) => `€ ${fmtEUR(item.payload.sales)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </section>

          <SectionTitle title="Groups" detail="All group dashboard cards in one admin view." />
          <section style={groupGrid}>
            {groupModels.map((g) => (
              <GroupAdminCard key={g.key} group={g} />
            ))}
          </section>

          <SectionTitle title="Supply" detail="Same supply KPI set plus manager-level workload." />
          <section style={overviewGrid}>
            <MetricCard
              label="Supply Updated"
              value={supplyData?.publishDate || "-"}
              Icon={FiClock}
            />
            <MetricCard
              label="Deals YTD"
              value={fmtInt(supplyTotals.deals_ytd)}
              Icon={FiShoppingBag}
            />
            <MetricCard
              label="Deals Last 30 Days"
              value={fmtInt(supplyTotals.deals_last_30_days)}
              Icon={FiBarChart2}
            />
            <MetricCard
              label="Deals Last Week"
              value={fmtInt(supplyTotals.deals_last_week)}
              Icon={FiTrendingUp}
            />
            <MetricCard
              label="Waiting Supply Approval"
              value={fmtInt(supplyTotals.deals_in_supply_side_stage_now)}
              Icon={FiTruck}
              tone="good"
            />
            <MetricCard
              label="Undelivered ERP"
              value={fmtInt(supplyTotals.undelivered_items)}
              Icon={FiPackage}
            />
            <MetricCard
              label="Late ERP Items"
              value={fmtInt(supplyTotals.late_items)}
              Icon={FiAlertTriangle}
              tone="danger"
            />
            <MetricCard
              label="Open PO Count"
              value={fmtInt(supplyTotals.open_po_count)}
              Icon={FiClock}
            />
            <MetricCard
              label="PO Val Sub YTD"
              value={fmtInt(supplyTotals.po_val_sub_ytd)}
              Icon={FiDatabase}
            />
          </section>

          <section style={sectionGrid}>
            <Panel title="Supply Workload by Manager" Icon={FiTruck} href="/supply">
              <DataTable
                columns={["Manager", "YTD", "Last 30", "Last Week", "In Supply", "Late ERP"]}
                rows={supplyRows.map((row) => [
                  row.manager,
                  fmtInt(row.deals_ytd),
                  fmtInt(row.deals_last_30_days),
                  fmtInt(row.deals_last_week),
                  fmtInt(row.deals_in_supply_side_stage_now),
                  fmtInt(row.late_items),
                ])}
              />
            </Panel>

            <Panel title="Supply Attention List" Icon={FiAlertTriangle}>
              <DataTable
                columns={["Manager", "Waiting", "Late", "Undelivered", "Open PO"]}
                rows={supplyAlerts.map((row) => [
                  row.manager,
                  fmtInt(row.deals_in_supply_side_stage_now),
                  fmtInt(row.late_items),
                  fmtInt(row.undelivered_items),
                  fmtInt(row.open_po_count),
                ])}
              />
            </Panel>
          </section>

          <SectionTitle
            title="Technical"
            detail="Technical dashboard KPIs, people, installation lists, and queue."
          />
          <section style={overviewGrid}>
            <MetricCard label="Tech Publish Date" value={tech.date || "-"} Icon={FiClock} />
            <MetricCard
              label="Deals Added This Week"
              value={fmtInt(tech.deals_added_technical)}
              Icon={FiTrendingUp}
            />
            <MetricCard
              label="Total Deals Done Week"
              value={fmtInt(tech.total_deals_week)}
              Icon={FiCheckSquare}
            />
            <MetricCard
              label="Approval Queue"
              value={fmtInt(techQueue.length)}
              Icon={FiTool}
              tone="danger"
            />
            <MetricCard
              label="Waiting Installation"
              value={fmtInt(tech.waiting_installation)}
              Icon={FiClock}
            />
            <MetricCard
              label="Installed Deals 2026"
              value={fmtInt(installedRows.length)}
              Icon={FiCheckSquare}
              tone="good"
            />
            <MetricCard
              label="Promotion Trips"
              value={fmtInt(tech.promotion_trips)}
              Icon={FiUsers}
            />
            <MetricCard label="Demo Shows" value={fmtInt(tech.demo_shows)} Icon={FiActivity} />
            <MetricCard
              label="Internal Trainings"
              value={fmtInt(tech.internal_trainings)}
              Icon={FiDatabase}
            />
            <MetricCard
              label="Last Meeting"
              value={tech.last_meeting || "-"}
              Icon={FiMessageSquare}
            />
          </section>

          <section style={sectionGrid}>
            <Panel title="Technical Team Output" Icon={FiBarChart2} href="/technical">
              <div style={{ height: 260 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={[
                      { name: "Aref", weekly: num(tech.aref_deals_done), total: num(tech.aref) },
                      {
                        name: "Golsanam",
                        weekly: num(tech.golsanam_deals_done),
                        total: num(tech.golsanam),
                      },
                      { name: "Vahid", weekly: num(tech.vahid_deals_done), total: num(tech.vahid) },
                      {
                        name: "Pouria",
                        weekly: num(tech.pouria_deals_done),
                        total: num(tech.pouria),
                      },
                    ]}
                    margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "#64748b" }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="weekly" name="This week" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="total" name="Total" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Technical Approval Queue" Icon={FiTool}>
              <DataTable
                columns={["Owner", "Deal", "Center", "Subject", "Status"]}
                rows={techQueue.map((row) => [
                  row.group,
                  row.deal,
                  row.center || "-",
                  row.subject || "-",
                  row.status || "In process",
                ])}
              />
            </Panel>
          </section>

          <section style={sectionGrid}>
            <Panel title={`Installed Deals (${installedRows.length})`} Icon={FiCheckSquare}>
              <DataTable
                columns={["ID", "Center / Subject"]}
                rows={installedRows.map((row) => [row.id, row.description || "-"])}
              />
            </Panel>
            <Panel title={`Waiting Installation (${waitingRows.length})`} Icon={FiClock}>
              <DataTable
                columns={["ID", "Center / Subject"]}
                rows={waitingRows.map((row) => [row.id, row.description || "-"])}
              />
            </Panel>
          </section>

          <SectionTitle
            title="Execution & AR"
            detail="Admin-friendly versions of the operational lists."
          />
          <section style={sectionGrid}>
            <Panel title={`Deal Executions (${dealsExec.length})`} Icon={FiShoppingBag}>
              <DataTable
                columns={["Deal", "Responsible", "Status", "Amount EUR"]}
                rows={dealsExec.map((row) => [
                  row.deal,
                  row.responsible || "-",
                  row.status || "-",
                  `€ ${fmtEUR(row.amount_eur)}`,
                ])}
              />
            </Panel>
            <Panel title={`AR List (${arList.length})`} Icon={FiDatabase}>
              <DataTable
                columns={["Group", "Deal No", "Currency", "% of Total AR"]}
                rows={arList.map((row) => [
                  row.group,
                  row.deal_no,
                  row.payment_currency || "-",
                  typeof row.percentage === "number" ? `${row.percentage.toFixed(1)}%` : "-",
                ])}
              />
            </Panel>
          </section>
        </div>
      </main>
    </>
  );
}

function LoadState({ title, detail, tone = "info" }) {
  return (
    <main style={page}>
      <div style={{ ...panel, borderColor: tone === "danger" ? "#fecaca" : "#bfdbfe" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>{title}</h1>
        {detail ? <p style={{ color: "#64748b" }}>{detail}</p> : null}
      </div>
    </main>
  );
}

function ActionLink({ href, label, Icon = FiExternalLink }) {
  return (
    <Link href={href} style={actionLink}>
      <Icon size={15} />
      {label}
    </Link>
  );
}

function SectionTitle({ title, detail }) {
  return (
    <div style={sectionTitle}>
      <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
      <span>{detail}</span>
    </div>
  );
}

function MetricCard({ label, value, Icon, tone = "default" }) {
  const accent = tone === "danger" ? "#ef4444" : tone === "good" ? "#16a34a" : "#2563eb";
  return (
    <div style={metricCard}>
      <div style={{ ...metricIcon, color: accent, background: `${accent}14` }}>
        <Icon size={18} />
      </div>
      <div style={metricLabel}>{label}</div>
      <div style={metricValue}>{value ?? "-"}</div>
    </div>
  );
}

function Panel({ title, Icon, href, children }) {
  return (
    <section style={panel}>
      <div style={panelHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon size={17} />
          <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
        </div>
        {href ? (
          <Link href={href} style={panelLink}>
            Open
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function GroupAdminCard({ group }) {
  return (
    <article style={{ ...panel, borderTop: `4px solid ${group.color}` }}>
      <div style={groupHead}>
        <div>
          <div style={eyebrow}>Group {group.key}</div>
          <h3 style={{ margin: "2px 0 0", fontSize: 20 }}>{group.title}</h3>
          <div style={smallMuted}>
            Week {group.week} · {group.date}
          </div>
        </div>
        <Link href={`/group/${group.id}`} style={panelLink}>
          Open dashboard
        </Link>
      </div>

      <div style={miniGrid}>
        <MiniStat label="Total Sales" value={`€ ${fmtEUR(group.totalSales)}`} />
        <MiniStat label="Weekly Sales" value={`€ ${fmtEUR(group.weeklySales)}`} />
        <MiniStat label="Offers" value={fmtInt(group.offers)} />
        <MiniStat label="Total Deals" value={fmtInt(group.totalDeals)} />
        <MiniStat label="Sales Process" value={fmtInt(group.inSales)} />
        <MiniStat label="Supply Process" value={fmtInt(group.inSupply)} />
        <MiniStat label="Technical Process" value={fmtInt(group.inTechnical)} />
        <MiniStat label="Mega Projects" value={fmtInt(group.mega)} />
        <MiniStat label="Weekly Trips" value={fmtInt(group.trips)} />
        <MiniStat label="Last Meeting" value={group.lastMeeting} />
      </div>

      <div style={messagePreview}>
        <b>CEO message:</b> {group.ceoMessage || "Empty"}
      </div>

      <div style={groupFooter}>
        <span>{group.members.length} members</span>
        <span>{group.megaDeals.length} mega deals</span>
        {group.mom ? (
          <a href={group.mom} target="_blank" rel="noreferrer" style={inlineLink}>
            MOM link
          </a>
        ) : (
          <span>No MOM link</span>
        )}
      </div>
    </article>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={miniStat}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function DataTable({ columns, rows }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = normalizedQuery
    ? rows.filter((row) => row.some((cell) => text(cell).toLowerCase().includes(normalizedQuery)))
    : rows;

  if (!rows.length) return <EmptyState text="No rows found." />;

  return (
    <>
      <div style={tableTools}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this table..."
          style={tableSearch}
        />
        <span style={tableCount}>
          {filteredRows.length}/{rows.length}
        </span>
      </div>
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} style={th}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 ? "#fff" : "#f8fafc" }}>
                {row.map((cell, cellIdx) => (
                  <td key={`${idx}-${cellIdx}`} style={td}>
                    {cell || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function EmptyState({ text: value }) {
  return <div style={emptyState}>{value}</div>;
}

const page = {
  minHeight: "100vh",
  background: "#f6f8fb",
  color: "#0f172a",
  fontFamily: "system-ui",
  padding: "22px 16px 44px",
};

const shell = { maxWidth: 1500, margin: "0 auto" };

const hero = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap",
  background: "#0f172a",
  color: "#f8fafc",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 18px 42px rgba(15,23,42,0.18)",
};

const eyebrow = {
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#64748b",
};

const title = { margin: "4px 0 0", fontSize: 30, lineHeight: 1.1 };
const subtitle = { margin: "8px 0 0", color: "#cbd5e1", maxWidth: 720, fontSize: 14 };

const heroActions = { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" };

const ratesStripWrap = {
  marginTop: 14,
};

const actionLink = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 12px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.10)",
  color: "#f8fafc",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 800,
};

const refreshButton = {
  ...actionLink,
  border: "1px solid rgba(255,255,255,0.18)",
  cursor: "pointer",
};

const overviewGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 12,
  marginTop: 14,
};

const metricCard = {
  background: "#fff",
  borderRadius: 12,
  padding: 14,
  boxShadow: "0 12px 30px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.18)",
  minHeight: 105,
};

const metricIcon = {
  width: 34,
  height: 34,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 10,
};

const metricLabel = { fontSize: 12, color: "#64748b", fontWeight: 800 };
const metricValue = { marginTop: 4, fontSize: 21, fontWeight: 950, color: "#0f172a" };

const sectionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))",
  gap: 14,
  marginTop: 14,
};

const groupGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))",
  gap: 14,
};

const panel = {
  background: "#fff",
  borderRadius: 14,
  padding: 14,
  boxShadow: "0 12px 30px rgba(15,23,42,0.06), 0 0 0 1px rgba(148,163,184,0.18)",
};

const panelHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
};

const panelLink = {
  fontSize: 12,
  color: "#2563eb",
  fontWeight: 900,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const sectionTitle = {
  marginTop: 22,
  marginBottom: 10,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  color: "#0f172a",
};

const groupHead = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  marginBottom: 12,
};

const smallMuted = { marginTop: 4, color: "#64748b", fontSize: 12, fontWeight: 700 };

const miniGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
  gap: 8,
};

const miniStat = {
  borderRadius: 10,
  background: "#f8fafc",
  padding: "9px 10px",
  display: "grid",
  gap: 3,
  fontSize: 12,
  color: "#64748b",
};

const messagePreview = {
  marginTop: 10,
  padding: 10,
  borderRadius: 10,
  background: "#eff6ff",
  color: "#1e3a8a",
  fontSize: 12,
  lineHeight: 1.5,
};

const groupFooter = {
  marginTop: 10,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
};

const inlineLink = { color: "#2563eb", textDecoration: "none" };

const alertList = { display: "grid", gap: 8 };

const alertItem = {
  borderRadius: 10,
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
  padding: "9px 10px",
  fontSize: 13,
  fontWeight: 800,
};

const tableWrap = {
  maxHeight: 360,
  overflow: "auto",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
};

const tableTools = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 8,
};

const tableSearch = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 12,
  outline: "none",
};

const tableCount = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const table = { width: "100%", borderCollapse: "collapse", fontSize: 12 };

const th = {
  position: "sticky",
  top: 0,
  background: "#0f172a",
  color: "#f8fafc",
  padding: "9px 10px",
  textAlign: "left",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const td = {
  padding: "8px 10px",
  borderTop: "1px solid #e2e8f0",
  color: "#334155",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

const emptyState = {
  borderRadius: 10,
  background: "#f8fafc",
  color: "#64748b",
  padding: 14,
  textAlign: "center",
  fontSize: 13,
  fontWeight: 800,
};
