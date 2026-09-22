import Head from "next/head";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiClock,
  FiFlag,
  FiFolder,
  FiMail,
  FiRefreshCw,
  FiSend,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import {
  PLANNING_BUCKETS,
  PLANNING_MONTHS,
  UNASSIGNED,
  planningBucket,
  planningDigest,
  planningGroups,
  planningPeriod,
  planningScope,
  formatMoney,
} from "../lib/planning";

const formatTimestamp = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Tehran",
      }).format(new Date(value))
    : "—";
const firstLine = (text) =>
  String(text || "")
    .split("\n")
    .map((s) => s.trim())
    .find(Boolean) || "";

async function requestPlanning(action) {
  const response = await fetch(
    "/api/planning",
    action
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      : {},
  );
  if (response.status === 401)
    throw new Error("Your session has expired; sign in to the dashboard again.");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not load planning data.");
  return data;
}

export default function Planning() {
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState("tasks");
  const [group, setGroup] = useState("all");
  const [filter, setFilter] = useState("open");
  const [monthFilter, setMonthFilter] = useState("scope");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState("load");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(() => new Date());

  async function run(action) {
    setBusy(action || "load");
    setError("");
    setNotice("");
    try {
      const next = await requestPlanning(action);
      setResult(next);
      setNow(new Date());
      if (action === "refresh")
        setNotice(
          next.error
            ? "Drive could not be read; see the message above."
            : "Workbook re-read from Google Drive.",
        );
      if (action === "send") setNotice(`Digest sent to ${next.sent.to} (${next.sent.subject}).`);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy("");
    }
  }
  useEffect(() => {
    run();
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const period = useMemo(() => planningPeriod(now), [now]);
  const config = result?.config || { teams: [], lookbackMonths: 1, recipients: "", time: "07:00" };
  const status = result?.status || { drive: false, mail: false, cron: false, serviceAccount: "" };
  const data = result?.data || null;
  const source = result?.source || null;
  const tasks = data?.tasks || [];
  const scoped = data ? planningScope(tasks, period, config.lookbackMonths) : [];
  const inScope = monthFilter === "scope";
  const monthTasks = inScope
    ? scoped
    : tasks.filter((task) => monthFilter === "all" || task.month === Number(monthFilter));
  // Within one chosen month "carried over" has no meaning, so an open task is judged on its status.
  const countBucket = (task) =>
    inScope
      ? planningBucket(task, period)
      : task.closed
        ? "done"
        : task.status
          ? "open"
          : "unstarted";
  const tiles = inScope
    ? [
        ["carried", FiClock],
        ["open", FiCheck],
        ["unstarted", FiAlertCircle],
        ["done", FiFlag],
      ]
    : [
        ["open", FiCheck],
        ["unstarted", FiAlertCircle],
        ["done", FiFlag],
      ];
  const byTeam = config.teams.length > 0;
  // Cards describe the same set as the table: the live scope, or the chosen month.
  const groups = planningGroups(monthTasks, config.teams);
  const carriedOf = (tasks) => tasks.filter((t) => countBucket(t) === "carried").length;
  const cards = byTeam
    ? groups.map((g) => {
        const tasks = g.people.flatMap((p) => p.tasks);
        return {
          id: g.name,
          name: g.name,
          open: tasks.length,
          carried: carriedOf(tasks),
          detail: g.people.map((p) => p.name).join(", ") || "Nobody listed",
          matches: (task) => task.teams.includes(g.name),
        };
      })
    : groups[0].people.map((p) => ({
        id: p.name,
        name: p.name,
        open: p.tasks.length,
        carried: carriedOf(p.tasks),
        detail: (data?.people.find((x) => x.name === p.name)?.variants || [])
          .filter((v) => v !== p.name)
          .join(", "),
        matches: (task) => (task.people.length ? task.people : [UNASSIGNED]).includes(p.name),
      }));
  const maxOpen = Math.max(...cards.map((c) => c.open), 1);
  const initials = (name) =>
    name
      .split(/[\s/]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  const selected = cards.find((card) => card.id === group);
  const openCount = new Map();
  for (const task of scoped)
    if (!task.closed) openCount.set(task.person, (openCount.get(task.person) || 0) + 1);
  const rank = (person) => (person ? -(openCount.get(person) || 0) : 1);
  const countedTasks = monthTasks.filter(
    (task) =>
      (!selected || selected.matches(task)) &&
      `${task.title} ${task.person} ${task.comment}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const counts = Object.fromEntries(
    Object.keys(PLANNING_BUCKETS).map((key) => [
      key,
      countedTasks.filter((t) => countBucket(t) === key).length,
    ]),
  );
  const visibleTasks = countedTasks
    .filter(
      (task) =>
        filter === "all" || (filter === "open" ? !task.closed : countBucket(task) === filter),
    )
    .sort(
      // Same order as the digest: busiest person first, then that person's oldest work first.
      (a, b) =>
        rank(a.person) - rank(b.person) ||
        a.person.localeCompare(b.person) ||
        a.month - b.month ||
        a.row - b.row,
    );
  const preview = planningDigest(config, data, now);
  const milestoneMonth = inScope || monthFilter === "all" ? period.month : Number(monthFilter);
  const milestones = (data?.milestones || []).filter((m) => m.month === milestoneMonth);
  const plan = data?.salesPlan || null;
  const money = (value) => formatMoney(value, plan?.currency || "");
  const thisMonthPlan = plan?.monthly.find((m) => m.month === period.month);
  const maxMonthly = plan ? Math.max(...plan.monthly.map((m) => m.planned || 0), 1) : 1;
  const hasActual = Boolean(plan?.monthly.some((m) => m.actual));
  const ready = status.drive && status.mail;

  return (
    <>
      <Head>
        <title>Planning | Artin Azma</title>
      </Head>
      <main className="planning-page">
        <header className="planning-hero">
          <div>
            <span className="planning-eyebrow">Team planning</span>
            <h1>Planning</h1>
            <p>
              {PLANNING_MONTHS[period.month]} {period.year}: every person&apos;s actions from the
              planning workbook, carried-over work and the morning management digest.
            </p>
          </div>
          <div className="planning-hero-status">
            <FiMail aria-hidden="true" />
            <strong>{ready ? "Daily email on" : "Daily email not configured"}</strong>
            <span>{config.time} · Tehran time · every day</span>
          </div>
        </header>
        {error && (
          <div className="planning-alert is-error" role="alert">
            {error}{" "}
            {!result && (
              <button onClick={() => run()} disabled={!!busy}>
                Retry
              </button>
            )}
          </div>
        )}
        {notice && (
          <div className="planning-alert" role="status">
            {notice}
          </div>
        )}
        {busy === "load" && <p role="status">Loading planning data…</p>}
        {result && (
          <>
            {result.error && (
              <div className={`planning-alert ${data ? "" : "is-error"}`} role="alert">
                <strong>
                  {data
                    ? "Showing the last successful read; Google Drive could not be read just now."
                    : "The planning workbook could not be read."}
                </strong>
                <p>{result.error}</p>
              </div>
            )}
            {!status.drive && (
              <div className="planning-setup-note">
                <FiFolder aria-hidden="true" />
                <div>
                  <strong>Connect Google Drive</strong>
                  <p>
                    Share the planning workbook (or its folder) with the service account as Viewer
                    and set <code>PLANNING_FILE_ID</code> or <code>PLANNING_DRIVE_FOLDER_ID</code>{" "}
                    on the server. The dashboard then reads it by itself; nothing is entered here.
                  </p>
                </div>
              </div>
            )}
            <div className="planning-tabbar" role="tablist" aria-label="Planning sections">
              {[
                ["tasks", "Actions", FiCalendar],
                ["sales", "Sales plan", FiTrendingUp],
                ["email", "Daily digest", FiMail],
              ].map(([key, label, Icon]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  aria-controls={`planning-${key}`}
                  id={`tab-${key}`}
                  onClick={() => setTab(key)}
                >
                  <Icon aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            {tab === "tasks" && (
              <section id="planning-tasks" role="tabpanel" aria-labelledby="tab-tasks">
                <div className={`planning-metrics${inScope ? "" : " is-month"}`}>
                  {tiles.map(([key, Icon]) => (
                    <button
                      key={key}
                      className={`planning-metric ${key}${filter === key ? " is-selected" : ""}`}
                      onClick={() => setFilter(filter === key ? "all" : key)}
                    >
                      <span className="planning-metric-icon">
                        <Icon aria-hidden="true" />
                      </span>
                      <span>{PLANNING_BUCKETS[key]}</span>
                      <strong>{data ? counts[key] : "—"}</strong>
                      <small>
                        {data && countedTasks.length
                          ? `${Math.round((counts[key] / countedTasks.length) * 100)}% of ${countedTasks.length}`
                          : "no data yet"}
                      </small>
                    </button>
                  ))}
                </div>
                {milestones.length > 0 && (
                  <div className="planning-milestones">
                    <strong>
                      <FiFlag aria-hidden="true" /> {PLANNING_MONTHS[milestoneMonth]} milestones
                    </strong>
                    <ul>
                      {milestones.map((m, i) => (
                        <li key={i}>
                          {m.title}
                          {m.status && <em>{m.status}</em>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="planning-group-grid">
                  <button
                    className={`planning-group is-everyone${group === "all" ? " is-selected" : ""}`}
                    onClick={() => setGroup("all")}
                  >
                    <span className="planning-avatar">
                      <FiUsers aria-hidden="true" />
                    </span>
                    <strong>{byTeam ? "All teams" : "Everyone"}</strong>
                    <span className="planning-group-count">
                      {data ? monthTasks.filter((t) => !t.closed).length : "—"}
                      <em>open</em>
                    </span>
                    {data && (
                      <small>
                        {cards.length} {byTeam ? "teams" : "people"}
                      </small>
                    )}
                  </button>
                  {cards.map((card, ci) => (
                    <button
                      key={card.id}
                      className={`planning-group planning-brand-${ci % 8}${group === card.id ? " is-selected" : ""}${card.id === UNASSIGNED ? " is-unassigned" : ""}`}
                      onClick={() => setGroup(card.id)}
                      title={card.detail ? `${card.name} — ${card.detail}` : card.name}
                    >
                      <span className="planning-avatar">{initials(card.name)}</span>
                      <strong>{card.name}</strong>
                      <span className="planning-group-count">
                        {card.open}
                        <em>open</em>
                        {card.carried > 0 && <i>{card.carried} carried</i>}
                      </span>
                      <span className="planning-group-bar" aria-hidden="true">
                        <i style={{ width: `${(card.open / maxOpen) * 100}%` }} />
                      </span>
                    </button>
                  ))}
                </div>
                <div className="planning-panel">
                  <div className="planning-toolbar">
                    <div>
                      <h2>Actions</h2>
                      <p>
                        {source ? (
                          <>
                            <a href={source.url} target="_blank" rel="noreferrer">
                              {source.name}
                            </a>
                            {" · "}read {formatTimestamp(source.readAt)} · file changed{" "}
                            {formatTimestamp(source.modifiedTime)}
                          </>
                        ) : (
                          "No workbook read yet."
                        )}
                      </p>
                    </div>
                    <div className="planning-actions">
                      <button disabled={!!busy || !status.drive} onClick={() => run("refresh")}>
                        <FiRefreshCw aria-hidden="true" />
                        {busy === "refresh" ? "Reading…" : "Re-read from Drive"}
                      </button>
                    </div>
                  </div>
                  <div className="planning-filters">
                    <label>
                      Search
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Action, person or comment"
                      />
                    </label>
                    <label>
                      Status
                      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="open">All open</option>
                        <option value="all">Everything</option>
                        {Object.entries(PLANNING_BUCKETS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Month
                      <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                        <option value="scope">
                          {PLANNING_MONTHS[period.month]} + carried over
                        </option>
                        <option value="all">All months</option>
                        {(data?.months || []).map((m) => (
                          <option key={m} value={m}>
                            {PLANNING_MONTHS[m]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {!visibleTasks.length ? (
                    <div className="planning-empty">
                      <FiCalendar aria-hidden="true" />
                      <h3>
                        {!tasks.length ? "No actions read yet" : "No actions match these filters"}
                      </h3>
                      <p>
                        {!tasks.length
                          ? "Once Google Drive is connected, each person's actions, status and comments appear here."
                          : "Change the person, status, month or search text."}
                      </p>
                    </div>
                  ) : (
                    <div className="planning-table-scroll">
                      <table className="planning-table">
                        <thead>
                          <tr>
                            <th>Person</th>
                            <th>Action</th>
                            <th>Status</th>
                            <th>Latest comment</th>
                            <th>Month</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleTasks.map((task) => {
                            const bucket = countBucket(task);
                            const open = expanded === task.id;
                            return (
                              <tr
                                key={task.id}
                                className={open ? "is-expanded" : ""}
                                onClick={() => setExpanded(open ? null : task.id)}
                              >
                                <td className="planning-person">
                                  <span
                                    className={`planning-avatar planning-brand-${
                                      Math.max(
                                        0,
                                        cards.findIndex(
                                          (c) => c.id === (task.person || UNASSIGNED),
                                        ),
                                      ) % 8
                                    }`}
                                  >
                                    {initials(task.person || UNASSIGNED)}
                                  </span>
                                  <span>
                                    <strong>{task.person || UNASSIGNED}</strong>
                                    {byTeam && <small>{task.teams.join(", ")}</small>}
                                  </span>
                                </td>
                                <td className="planning-text">
                                  {open ? task.title : firstLine(task.title)}
                                  <small>
                                    {task.sheet} · row {task.row}
                                  </small>
                                </td>
                                <td>
                                  <span className={`planning-badge ${bucket}`}>
                                    {PLANNING_BUCKETS[bucket]}
                                  </span>
                                  {task.status &&
                                    task.status.toLowerCase() !==
                                      PLANNING_BUCKETS[bucket].toLowerCase() && (
                                      <small>{task.status}</small>
                                    )}
                                </td>
                                <td className="planning-text">
                                  {open ? task.comment : firstLine(task.comment)}
                                </td>
                                <td>
                                  <span className="planning-month-pill">
                                    {PLANNING_MONTHS[task.month].slice(0, 3)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="planning-footnote">
                    Click a row to expand the full action and comment. Carried over = still open in
                    an earlier month&apos;s sheet (last {config.lookbackMonths} month
                    {config.lookbackMonths === 1 ? "" : "s"}). Spelling variants of a name are
                    merged automatically.
                  </p>
                </div>
              </section>
            )}
            {tab === "sales" && (
              <section id="planning-sales" role="tabpanel" aria-labelledby="tab-sales">
                {!plan ? (
                  <div className="planning-panel">
                    <div className="planning-empty">
                      <FiTrendingUp aria-hidden="true" />
                      <h3>No sales plan found</h3>
                      <p>
                        The General milestones sheet with &quot;Total planned Sales Target&quot;,
                        &quot;Sales Prediction&quot; and &quot;Sales Control by team&quot; was not
                        read yet.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {plan.warnings.length > 0 && (
                      <div className="planning-alert is-warning" role="alert">
                        <strong>
                          The sheet&apos;s totals do not match its rows — check the General
                          milestones sheet after the latest update.
                        </strong>
                        {plan.warnings.map((w, i) => (
                          <p key={i}>{w}</p>
                        ))}
                      </div>
                    )}
                    <div className="planning-metrics planning-metrics-sales">
                      <div className="planning-metric">
                        <span>Yearly sales target</span>
                        <strong>{money(plan.targetsTotal)}</strong>
                      </div>
                      <div className="planning-metric">
                        <span>Monthly predictions total</span>
                        <strong>{money(plan.monthlyTotal.planned)}</strong>
                        <small>
                          actual{" "}
                          {plan.monthlyTotal.actual
                            ? money(plan.monthlyTotal.actual)
                            : "not reported"}
                        </small>
                      </div>
                      <div className="planning-metric open">
                        <span>{PLANNING_MONTHS[period.month]} target</span>
                        <strong>{money(thisMonthPlan?.planned ?? null)}</strong>
                        <small>
                          actual{" "}
                          {thisMonthPlan?.actual ? money(thisMonthPlan.actual) : "not reported"}
                        </small>
                      </div>
                      <div className="planning-metric">
                        <span>Sales team target</span>
                        <strong>{money(plan.groupsTotal?.target ?? null)}</strong>
                        <small>
                          {plan.groups.reduce((n, g) => n + g.people.length, 0)} people ·{" "}
                          {plan.groups.length} groups
                        </small>
                      </div>
                    </div>
                    <div className="planning-sales-grid">
                      <div className="planning-panel">
                        <div className="planning-toolbar">
                          <h2>Sales prediction by month</h2>
                          <div className="planning-legend planning-quarters">
                            {["Q1", "Q2", "Q3", "Q4"].map((q, i) => (
                              <span key={q} className={`planning-brand-${i * 2}`}>
                                {q}
                              </span>
                            ))}
                          </div>
                        </div>
                        <ul className={`planning-bars${hasActual ? " has-actual" : ""}`}>
                          {plan.monthly.map((m) => (
                            <li
                              key={m.month}
                              className={`planning-brand-${Math.floor(m.month / 3) * 2}${m.month === period.month ? " is-current" : ""}${m.month < period.month ? " is-past" : ""}`}
                            >
                              <span>{PLANNING_MONTHS[m.month].slice(0, 3)}</span>
                              <div>
                                <i style={{ width: `${((m.planned || 0) / maxMonthly) * 100}%` }} />
                                {m.actual ? (
                                  <b style={{ width: `${(m.actual / maxMonthly) * 100}%` }} />
                                ) : null}
                              </div>
                              <strong>{money(m.planned)}</strong>
                              {hasActual && <small>{m.actual ? money(m.actual) : "—"}</small>}
                            </li>
                          ))}
                        </ul>
                        {!hasActual && (
                          <p className="planning-footnote">
                            Actual sales are not reported in the file yet.
                          </p>
                        )}
                        {plan.quarters.some((q) => q.planned !== null) && (
                          <p className="planning-footnote">
                            {plan.quarters
                              .filter((q) => q.planned !== null)
                              .map(
                                (q) =>
                                  `${q.name}: ${money(q.planned)} planned, ${q.actual ? money(q.actual) : "actual not reported"}`,
                              )
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                      <div className="planning-panel">
                        <h2>Yearly target by brand</h2>
                        <ul className="planning-brand-bars">
                          {[...plan.targets]
                            .map((t, i) => ({ ...t, tone: i % 8 }))
                            .sort((x, y) => (y.amount || 0) - (x.amount || 0))
                            .map((t) => {
                              const base = plan.targetsTotal || 1;
                              const share = ((t.amount || 0) / base) * 100;
                              return (
                                <li key={t.name} className={`planning-brand-${t.tone}`}>
                                  <span>{t.name}</span>
                                  <div>
                                    <i style={{ width: `${share}%` }} />
                                  </div>
                                  <em>{Math.round(share)}%</em>
                                  <b>{money(t.amount)}</b>
                                </li>
                              );
                            })}
                          <li className="planning-brand-total">
                            <span>Total</span>
                            <div />
                            <em />
                            <b>{money(plan.targetsTotal)}</b>
                          </li>
                        </ul>
                        {plan.priorities.length > 0 && (
                          <>
                            <h2>Monthly priorities</h2>
                            <ol className="planning-priorities">
                              {plan.priorities.map((p, i) => (
                                <li key={i}>{p.replace(/^\d+\s*[-.)]\s*/, "")}</li>
                              ))}
                            </ol>
                          </>
                        )}
                      </div>
                    </div>
                    {plan.groups.length > 0 && (
                      <div className="planning-panel">
                        <div className="planning-toolbar">
                          <h2>Sales control by team</h2>
                          <div className="planning-legend">
                            {plan.groups
                              .filter((g) => g.name)
                              .map((g, gi) => (
                                <span key={g.name} className={`planning-tone-${gi % 6}`}>
                                  {g.name}
                                </span>
                              ))}
                          </div>
                        </div>
                        <div className="planning-table-scroll">
                          <table className="planning-table planning-compact">
                            <thead>
                              <tr>
                                <th>Salesperson</th>
                                <th className="planning-num">Year target</th>
                                <th className="planning-num">Q1</th>
                                <th className="planning-num">Q2</th>
                                <th className="planning-num">Q3</th>
                                <th className="planning-num">Q4</th>
                                <th className="planning-num">Actual</th>
                                <th className="planning-num">Remaining</th>
                              </tr>
                            </thead>
                            <tbody>
                              {plan.groups.map((g, gi) => (
                                <Fragment key={gi}>
                                  {g.people.map((p) => (
                                    <tr key={p.name} className={`planning-tone-${gi % 6}`}>
                                      <td>{p.name}</td>
                                      <td className="planning-num">{money(p.target)}</td>
                                      {p.quarters.map((q, i) => (
                                        <td key={i} className="planning-num">
                                          {money(q)}
                                        </td>
                                      ))}
                                      <td className="planning-num">{money(p.actual)}</td>
                                      <td className="planning-num">{money(p.remaining)}</td>
                                    </tr>
                                  ))}
                                  {g.total && (
                                    <tr className={`planning-total planning-tone-${gi % 6}`}>
                                      <td>Total {g.name}</td>
                                      <td className="planning-num">{money(g.total.target)}</td>
                                      {g.total.quarters.map((q, i) => (
                                        <td key={i} className="planning-num">
                                          {money(q)}
                                        </td>
                                      ))}
                                      <td className="planning-num">{money(g.total.actual)}</td>
                                      <td className="planning-num">{money(g.total.remaining)}</td>
                                    </tr>
                                  )}
                                </Fragment>
                              ))}
                              {plan.groupsTotal && (
                                <tr className="planning-total planning-grand">
                                  <td>Total</td>
                                  <td className="planning-num">{money(plan.groupsTotal.target)}</td>
                                  {plan.groupsTotal.quarters.map((q, i) => (
                                    <td key={i} className="planning-num">
                                      {money(q)}
                                    </td>
                                  ))}
                                  <td className="planning-num">{money(plan.groupsTotal.actual)}</td>
                                  <td className="planning-num">
                                    {money(plan.groupsTotal.remaining)}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {plan.extra.length > 0 && (
                      <div className="planning-panel">
                        <div className="planning-toolbar">
                          <div>
                            <h2>Target breakdown</h2>
                            <p>How the yearly target splits by segment, sales group and person.</p>
                          </div>
                          <div className="planning-inline-kpis">
                            {plan.extra
                              .filter((e) => e.total)
                              .map((e) => (
                                <div key={e.name}>
                                  <span>{e.name}</span>
                                  <strong>{money(e.amount)}</strong>
                                </div>
                              ))}
                          </div>
                        </div>
                        <div className="planning-cards">
                          {plan.extra
                            .filter((e) => e.children.length)
                            .map((e) => {
                              const base = e.children.reduce((n, c) => n + (c.amount || 0), 0) || 1;
                              return (
                                <div className="planning-card" key={e.name}>
                                  <h3>{e.name}</h3>
                                  <strong>{money(e.amount)}</strong>
                                  <div className="planning-stack" aria-hidden="true">
                                    {e.children.map((c) => {
                                      const gi = plan.groups.findIndex((g) => g.name === c.name);
                                      return (
                                        <i
                                          key={c.name}
                                          className={gi >= 0 ? `planning-tone-${gi % 6}` : ""}
                                          style={{ width: `${((c.amount || 0) / base) * 100}%` }}
                                        />
                                      );
                                    })}
                                  </div>
                                  <ul>
                                    {e.children.map((c) => {
                                      const gi = plan.groups.findIndex((g) => g.name === c.name);
                                      return (
                                        <li
                                          key={c.name}
                                          className={gi >= 0 ? `planning-tone-${gi % 6}` : ""}
                                        >
                                          <span>{c.name}</span>
                                          <em>{Math.round(((c.amount || 0) / base) * 100)}%</em>
                                          <b>{money(c.amount)}</b>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              );
                            })}
                          {plan.extra.some((e) => !e.total && !e.children.length) && (
                            <div className="planning-card">
                              <h3>Individual &amp; team targets</h3>
                              <strong>
                                {money(
                                  plan.extra
                                    .filter((e) => !e.total && !e.children.length)
                                    .reduce((n, e) => n + (e.amount || 0), 0),
                                )}
                              </strong>
                              <ul className="planning-mini-bars">
                                {plan.extra
                                  .filter((e) => !e.total && !e.children.length)
                                  .map((e, _, all) => {
                                    const max = Math.max(...all.map((x) => x.amount || 0), 1);
                                    return (
                                      <li key={e.name}>
                                        <span>{e.name}</span>
                                        <div>
                                          <i
                                            style={{ width: `${((e.amount || 0) / max) * 100}%` }}
                                          />
                                        </div>
                                        <b>{money(e.amount)}</b>
                                      </li>
                                    );
                                  })}
                              </ul>
                            </div>
                          )}
                        </div>
                        <p className="planning-footnote">
                          Read from the General milestones sheet. Each person belongs to the group
                          whose &quot;Total Group …&quot; row comes next below them; new people and
                          new groups appear automatically. Actual and Remaining fill in as soon as
                          they are entered in the file.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
            {tab === "email" && (
              <section id="planning-email" role="tabpanel" aria-labelledby="tab-email">
                <div className="planning-panel">
                  <div className="planning-toolbar">
                    <div>
                      <h2>Daily digest</h2>
                      <p>
                        Sent automatically at {config.time} Tehran time every day from the latest
                        workbook read. Viewing this page does not send email.
                      </p>
                    </div>
                    <div className="planning-actions">
                      <button
                        className="planning-primary"
                        disabled={!!busy || !status.drive || !status.mail}
                        onClick={() => {
                          if (window.confirm(`Send today's digest now to ${config.recipients}?`))
                            run("send");
                        }}
                      >
                        <FiSend aria-hidden="true" />
                        {busy === "send" ? "Sending…" : "Send now"}
                      </button>
                    </div>
                  </div>
                  <ul className="planning-checklist">
                    <li className={status.drive ? "is-ok" : ""}>
                      Google Drive {status.drive ? "connected" : "not connected"}
                      {status.serviceAccount && <small>{status.serviceAccount}</small>}
                    </li>
                    <li className={status.mail ? "is-ok" : ""}>
                      Email{" "}
                      {status.mail
                        ? `configured → ${config.recipients}`
                        : "not configured (SMTP_* and PLANNING_DIGEST_TO)"}
                    </li>
                    <li className={status.cron ? "is-ok" : ""}>
                      Schedule{" "}
                      {status.cron
                        ? "active (Vercel Cron, 07:00 Tehran)"
                        : "inactive (CRON_SECRET not set)"}
                    </li>
                  </ul>
                  {result.error && (
                    <p className="planning-stale">
                      The digest is not sent while the workbook cannot be read; this preview shows
                      the last successful read.
                    </p>
                  )}
                  <p>Subject: {preview.subject}</p>
                  <div
                    className="planning-email-html"
                    dangerouslySetInnerHTML={{ __html: preview.html }}
                  />
                  <details>
                    <summary>Plain-text version</summary>
                    <pre className="planning-email-preview">{preview.text}</pre>
                  </details>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
