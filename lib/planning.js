// Pure planning logic shared by the API, the cron job and the page. No I/O here.
// The workbook is one file per year ("Planning 2026") with a sheet per month whose columns are
// Responsible person | Actions | Status | Comments, plus a "General milestones" overview sheet.
export const PLANNING_TIMEZONE = "Asia/Tehran";
export const PLANNING_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const PLANNING_BUCKETS = {
  carried: "Carried over",
  open: "In progress",
  unstarted: "No status",
  upcoming: "Planned ahead",
  done: "Closed",
};
export const DEFAULT_CLOSED_STATUSES =
  "done, completed, closed, cancel, canceld, moved, postponed, not relevant";
export const UNASSIGNED = "Unassigned";

export function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Spelling variants of the same person (Ulyana/Uliana, Pooria/Pouria/Pooriya, FAtima) share a key.
export function nameKey(value) {
  return normalizeName(value)
    .replace(/[^a-z؀-ۿ ]/g, "")
    .replace(/y/g, "i")
    .replace(/(oo|ou)/g, "u")
    .replace(/(.)\1+/g, "$1");
}

export function splitPeople(value) {
  const names = String(value ?? "")
    .split(/\s*(?:[/,&+;،]|\band\b)\s*/i)
    .map((name) => name.trim())
    .filter(Boolean);
  return [...new Map(names.map((name) => [nameKey(name), name])).values()];
}

// "Supply=Azat,Mostafa;Logistics=Ulyana" → [{ name, people }]. Empty string → no teams (group by person).
export function parsePlanningTeams(text) {
  return String(text || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, people = ""] = entry.split("=");
      if (!name.trim()) throw new Error(`PLANNING_TEAMS: team name missing in "${entry}".`);
      return { name: name.trim(), people: splitPeople(people) };
    });
}

export function planningToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PLANNING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// Calendar position in Tehran: { year, month (0-11), day, daysInMonth }.
export function planningPeriod(now = new Date()) {
  const [year, month, day] = planningToday(now).split("-").map(Number);
  return {
    year,
    month: month - 1,
    day,
    daysInMonth: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
}

// "Sept", "Novemb" and "Feb" all resolve by their first three letters.
export function planningMonthIndex(sheetName) {
  const key = normalizeName(sheetName).slice(0, 3);
  return key.length === 3 ? PLANNING_MONTHS.findIndex((m) => m.toLowerCase().startsWith(key)) : -1;
}

// Closed when any status fragment starts with a closed value, so "not done (moved to Feb)" closes
// via "moved" while "not done" and "partially done" stay open.
export function isClosedStatus(status, closedStatuses = DEFAULT_CLOSED_STATUSES) {
  const values = String(closedStatuses || "")
    .split(/[,،]/)
    .map((s) => normalizeName(s))
    .filter(Boolean);
  return String(status || "")
    .split(/[(),;/.\n]/)
    .map((s) => normalizeName(s))
    .filter(Boolean)
    .some((fragment) => values.some((value) => fragment.startsWith(value)));
}

const cellText = (value) => String(value ?? "").trim();

function parseMonthSheet(sheet, month, closedStatuses) {
  const tasks = [];
  sheet.rows.forEach((row, index) => {
    const [person, action, rawStatus, comment] = [0, 1, 2, 3].map((i) => cellText(row?.[i]));
    if (!action) return;
    if (normalizeName(person) === "responsible person" || normalizeName(action) === "actions")
      return;
    // The file sometimes carries the status ("Done", "in process") in the Comments column instead.
    const statusLike =
      comment.length <= 40 &&
      !comment.includes("\n") &&
      (isClosedStatus(comment, closedStatuses) ||
        /^(in\s*pro|hold|on hold|not done|partial|pending|waiting)/i.test(comment));
    const status = rawStatus || (statusLike ? comment : "");
    tasks.push({
      id: `${sheet.name}:${index + 1}`,
      sheet: sheet.name,
      month,
      row: index + 1,
      people: splitPeople(person),
      title: action,
      status,
      comment,
      closed: isClosedStatus(status, closedStatuses),
    });
  });
  return tasks;
}

function parseMilestoneSheet(sheet) {
  const rows = sheet.rows.map((row) => (row || []).map(cellText));
  const headerRow = rows.findIndex((row) =>
    row.some((cell) => normalizeName(cell) === "milestones"),
  );
  if (headerRow < 1) return [];
  const monthRow = rows[headerRow - 1];
  const header = rows[headerRow];
  const firstBlock = header.findIndex((c) => normalizeName(c) === "milestones");
  const milestones = [];
  header.forEach((cell, column) => {
    if (normalizeName(cell) !== "milestones") return;
    let month = planningMonthIndex(monthRow[column]);
    // The January block sits under the year cell rather than a month name.
    if (month < 0 && column === firstBlock) month = 0;
    if (month < 0) return;
    const statusColumn = header.findIndex((c, i) => i > column && normalizeName(c) === "status");
    for (let r = headerRow + 1; r < rows.length; r += 1) {
      const title = rows[r][column];
      if (!title) break;
      milestones.push({
        month,
        title,
        status: statusColumn >= 0 ? rows[r][statusColumn] || "" : "",
      });
    }
  });
  return milestones;
}

// sheets: [{ name, rows: string[][] }]. Returns tasks with canonical person names (the most
// frequent spelling of each name variant), the people list, milestones and the months found.
export function parsePlanningWorkbook(sheets, config = {}) {
  const closedStatuses = config.closedStatuses || DEFAULT_CLOSED_STATUSES;
  const teams = config.teams || [];
  const raw = [];
  const milestones = [];
  const months = [];
  for (const sheet of sheets) {
    const month = planningMonthIndex(sheet.name);
    if (month >= 0) {
      months.push(month);
      raw.push(...parseMonthSheet(sheet, month, closedStatuses));
    } else if (/milestone/i.test(sheet.name)) milestones.push(...parseMilestoneSheet(sheet));
  }
  if (!months.length) throw new Error("No monthly sheet (January … December) was found.");
  const spellings = new Map();
  for (const task of raw)
    for (const name of task.people) {
      const key = nameKey(name);
      const counts = spellings.get(key) || new Map();
      counts.set(name, (counts.get(name) || 0) + 1);
      spellings.set(key, counts);
    }
  const canonical = new Map(
    [...spellings].map(([key, counts]) => [key, [...counts].sort((a, b) => b[1] - a[1])[0][0]]),
  );
  const teamOf = new Map();
  for (const team of teams) for (const name of team.people) teamOf.set(nameKey(name), team.name);
  const people = new Map();
  const tasks = raw.map((task) => {
    const names = [...new Set(task.people.map((name) => canonical.get(nameKey(name))))];
    for (const name of names) {
      const entry = people.get(name) || {
        name,
        team: teamOf.get(nameKey(name)) || null,
        variants: [...spellings.get(nameKey(name)).keys()],
        count: 0,
      };
      entry.count += 1;
      people.set(name, entry);
    }
    const assigned = [...new Set(names.map((name) => teamOf.get(nameKey(name))).filter(Boolean))];
    return {
      ...task,
      people: names,
      person: names.join(" / "),
      teams: teams.length ? (assigned.length ? assigned : [UNASSIGNED]) : [],
    };
  });
  return {
    tasks,
    milestones,
    months: [...new Set(months)].sort((a, b) => a - b),
    people: [...people.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

export function planningBucket(task, period) {
  if (task.closed) return "done";
  if (task.month < period.month) return "carried";
  if (task.month > period.month) return "upcoming";
  return task.status ? "open" : "unstarted";
}

// Tasks the digest covers: the current month plus open work carried over from earlier months.
export function planningScope(tasks, period, lookbackMonths = 1) {
  return tasks.filter(
    (task) =>
      task.month === period.month ||
      (!task.closed && task.month < period.month && task.month >= period.month - lookbackMonths),
  );
}

const byMonthThenRow = (a, b) => a.month - b.month || a.row - b.row;

// Open tasks grouped for display: [{ name, people: [{ name, tasks }] }]. With no teams configured
// there is one unnamed group holding every person, busiest first.
export function planningGroups(tasks, teams = []) {
  const open = tasks.filter((task) => !task.closed);
  const teamOf = new Map();
  for (const team of teams) for (const name of team.people) teamOf.set(nameKey(name), team.name);
  // Inside a team group, a shared task is listed only under that team's own members.
  const personGroups = (list, teamName) => {
    const byPerson = new Map();
    for (const task of list)
      for (const name of task.people.length ? task.people : [UNASSIGNED]) {
        if (teamName !== undefined && (teamOf.get(nameKey(name)) || UNASSIGNED) !== teamName)
          continue;
        if (!byPerson.has(name)) byPerson.set(name, { name, tasks: [] });
        byPerson.get(name).tasks.push(task);
      }
    return [...byPerson.values()]
      .map((entry) => ({ ...entry, tasks: entry.tasks.sort(byMonthThenRow) }))
      .sort(
        (a, b) =>
          (a.name === UNASSIGNED) - (b.name === UNASSIGNED) ||
          b.tasks.length - a.tasks.length ||
          a.name.localeCompare(b.name),
      );
  };
  if (!teams.length) return [{ name: "", people: personGroups(open) }];
  const names = [...teams.map((team) => team.name), UNASSIGNED];
  return names
    .map((name) => ({
      name,
      people: personGroups(
        open.filter((task) => task.teams.includes(name)),
        name,
      ),
    }))
    .filter((group) => group.people.length || group.name !== UNASSIGNED);
}

const firstLine = (text, max) => {
  const line =
    String(text || "")
      .split("\n")
      .map((s) => s.trim())
      .find(Boolean) || "";
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

export function planningDigest(config, data, now = new Date()) {
  const period = planningPeriod(now);
  const monthName = PLANNING_MONTHS[period.month];
  const dateLabel = `${period.day} ${monthName} ${period.year}`;
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
    );
  const subject = `Artin Azma daily planning | ${dateLabel}`;
  const html = [
    `<div style="font-family:Segoe UI,Tahoma,Arial,sans-serif;line-height:1.6;color:#142033;max-width:900px">`,
    `<h1 style="font-size:22px;margin:0 0 4px">Artin Azma planning — ${escape(dateLabel)}</h1>`,
  ];
  const lines = [`Artin Azma planning — ${dateLabel}`];
  if (!data) {
    lines.push("", "The planning workbook has not been read yet.");
    html.push(`<p>The planning workbook has not been read yet.</p></div>`);
    return { subject, text: lines.join("\n"), html: html.join("") };
  }
  const tasks = planningScope(data.tasks, period, config.lookbackMonths ?? 1);
  const counts = { carried: 0, open: 0, unstarted: 0, done: 0 };
  for (const task of tasks) counts[planningBucket(task, period)] += 1;
  const daysLeft = period.daysInMonth - period.day;
  const summary = `${monthName} plan: ${counts.open} in progress, ${counts.unstarted} without status, ${counts.carried} carried over from earlier months, ${counts.done} closed. ${daysLeft} day${daysLeft === 1 ? "" : "s"} left in ${monthName}.`;
  lines.push(summary);
  html.push(`<p style="margin:0 0 16px;color:#526579">${escape(summary)}</p>`);
  const milestones = data.milestones.filter((m) => m.month === period.month);
  if (milestones.length) {
    lines.push("", `${monthName} milestones`);
    html.push(
      `<h2 style="font-size:17px;margin:20px 0 6px">${escape(monthName)} milestones</h2><ul style="margin:0;padding-left:20px">`,
    );
    for (const m of milestones) {
      lines.push(`- ${m.title}${m.status ? ` [${m.status}]` : ""}`);
      html.push(
        `<li>${escape(m.title)}${m.status ? ` <em style="color:#526579">[${escape(m.status)}]</em>` : ""}</li>`,
      );
    }
    html.push("</ul>");
  }
  for (const group of planningGroups(tasks, config.teams || [])) {
    if (group.name) {
      const total = group.people.reduce((sum, p) => sum + p.tasks.length, 0);
      lines.push("", `${group.name} — ${total} open task${total === 1 ? "" : "s"}`);
      html.push(
        `<h2 style="font-size:18px;margin:24px 0 4px;border-bottom:2px solid #173f7a">${escape(group.name)}</h2>`,
      );
      if (!group.people.length) {
        lines.push("No open tasks.");
        html.push(`<p style="color:#526579">No open tasks.</p>`);
      }
    }
    for (const person of group.people) {
      lines.push("", `${person.name} — ${person.tasks.length} open`);
      html.push(
        `<h3 style="font-size:15px;margin:16px 0 4px">${escape(person.name)} <span style="font-weight:normal;color:#526579">— ${person.tasks.length} open</span></h3>`,
        `<table style="border-collapse:collapse;width:100%;font-size:13px"><tbody>`,
      );
      for (const task of person.tasks) {
        const bucket = planningBucket(task, period);
        const flag =
          bucket === "carried"
            ? `carried over from ${PLANNING_MONTHS[task.month]}`
            : PLANNING_BUCKETS[bucket];
        const title = firstLine(task.title, 180);
        const comment = firstLine(task.comment, 160);
        lines.push(
          `- ${title} [${task.status || "no status"} · ${flag}]${comment ? ` — ${comment}` : ""}`,
        );
        html.push(
          `<tr style="border-bottom:1px solid #e2e8f0;vertical-align:top"><td style="padding:6px 8px 6px 0">${escape(title)}${bucket === "carried" ? `<br><span style="color:#b45309;font-size:12px">${escape(flag)}</span>` : ""}</td><td style="padding:6px 8px;white-space:nowrap;color:${task.status ? "#1d4f9c" : "#825c00"}">${escape(task.status || "no status")}</td><td style="padding:6px 0 6px 8px;color:#526579">${escape(comment)}</td></tr>`,
        );
      }
      html.push("</tbody></table>");
    }
  }
  html.push("</div>");
  return { subject, text: lines.join("\n"), html: html.join("") };
}
