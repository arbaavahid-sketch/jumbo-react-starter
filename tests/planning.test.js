import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import * as XLSX from "xlsx";
import {
  isClosedStatus,
  nameKey,
  parseMoney,
  parsePlanningTeams,
  parsePlanningWorkbook,
  parseSalesPlan,
  planningBucket,
  planningDigest,
  planningGroups,
  planningMonthIndex,
  planningPeriod,
  planningScope,
  planningToday,
  splitPeople,
} from "../lib/planning";
import { resetTokenCache } from "../lib/google-auth";
import {
  loadPlanning,
  planningConfigFromEnv,
  planningStatus,
  resetPlanningCache,
  sendPlanningDigest,
} from "../lib/planning-server";
import handler from "../pages/api/planning";
import cron from "../pages/api/cron/planning-digest";
import { createSession } from "../lib/auth";

// Shaped like the real "Planning 2026.xlsx": a sheet per month with inconsistent names,
// a missing header on one sheet, multi-person rows, spelling variants and a milestones overview.
const HEADER = ["Responsible person", "Actions", "Status", "Comments"];
const sheets = () => [
  {
    name: "General milestones",
    rows: [
      [],
      [
        2026,
        "",
        "Feb",
        "",
        "",
        "March",
        "",
        "",
        "April",
        "",
        "",
        "May",
        "",
        "",
        "June",
        "",
        "",
        "July",
        "",
        "",
        "August",
        "",
        "",
        "September",
      ],
      [
        "Milestones",
        "Status",
        "Milestones",
        "",
        "Status",
        "Milestones",
        "",
        "",
        "Milestones",
        "",
        "",
        "Milestones",
        "",
        "",
        "Milestones",
        "",
        "",
        "Milestones",
        "",
        "",
        "Milestones",
        "",
        "",
        "Milestones",
        "",
        "Status",
      ],
      [
        "Jan goal",
        "done",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Oil Show participate",
        "",
        "in process",
      ],
      [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Catalyst contract",
        "",
        "",
      ],
      [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "Total planned Sales Target",
        "",
        "",
        "Sales Prediction",
        "Actual Sales",
        "",
        "",
        "",
        "Planned",
        "Actual",
        "",
        "Monthly Tasks priorities",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "ignored after blank",
      ],
      [
        "",
        "",
        "Jan",
        "€280,000.00",
        "",
        "",
        "",
        "Q1",
        "€840,000.00",
        "€0.00",
        "0.00%",
        "1- Get fullpayments",
      ],
      [
        "Chromatek",
        "€300,000",
        "Feb",
        "€280,000.00",
        "€10,000.00",
        "",
        "",
        "Q2",
        "",
        "",
        "",
        "2- Get prepayments",
      ],
      ["STPC", "€3,500,000", "Sept", "€414,000.00", "", "", "", "Q3", "", "", "", ""],
      ["Total", "€3,800,000", "Oct", "€414,000.00", "", "", "", "Q4", "", "", "", "3- Training"],
      ["", "", "Total", "€1,388,000.00", "€10,000.00"],
      [],
      ["Sales Control by team", "", "Q1", "Q2", "Q3", "Q4", "Actual", "", "Remaining"],
      ["Mona", "€200,000", "€42,000", "€33,900", "€62,100", "€62,000", "€5,000", "", "€195,000"],
      ["Ali ", "€900,000", "€189,000", "€152,550", "€279,450", "€279,000"],
      ["", "", "€0", "€0", "€0", "€0"],
      ["Total Group A", "€1,100,000", "€231,000", "€186,450", "€341,550", "€341,000"],
      ["Hamid", "€200,000", "€42,000", "€33,900", "€62,100", "€62,000"],
      ["Totlal Group C", "€200,000", "€42,000", "€33,900", "€62,100", "€62,000"],
      ["Total", "€1,300,000", "€273,000", "€220,350", "€403,650", "€403,000"],
      [],
      ["Big Lab Projects", "€2,000,000"],
      ["Export team", "€300,000"],
    ],
  },
  {
    name: "August",
    rows: [
      HEADER,
      [
        "Azat",
        "Brand List & Outreach\nGoal: get replies",
        "Partially done",
        "Brand list is prepared.",
      ],
      ["Mostafa", "Finalize corporate account", "in progress", "Rejected; trying another bank"],
      ["Fatima", "Old admin task", "not done (moved to Sept)", ""],
      ["Deniz", "EMD painting", "Done", ""],
      ["Uliana", "India Sea 5 shipment", "", ""],
      ["Pooria", "Customs broker", "hold", ""],
    ],
  },
  {
    name: "Sept",
    rows: [
      HEADER,
      ["Mostafa", "Finalize corporate account", "in progress", "Delma exchange option"],
      ["Azat/Uliana/Mostafa", "Supplier relationship management", "In process", ""],
      ["FAtima", "China visa application", "", ""],
      ["", "prepare various options for Dubai shipment", "", ""],
      ["Responsible person", "Actions", "Status", "Comments"],
      ["Mohsen", "<img src=x onerror=alert(1)>", "hold", "<b>bold</b>"],
      ["Deniz", "Site visit at Lamerd", "Done", ""],
      ["Ulyana", "Boosters + Europe truck", "in process", ""],
      ["Ulyana", "New logistics manager", "", ""],
      ["Pouria", "Import permission", "", ""],
      ["Fatima", "Tidying up the office", "", "Done"],
      ["Samira", "Meeting with Ms. Nabati", "", "in process"],
      ["Samira", "Update price list", "", "Prices are updated"],
    ],
  },
  { name: "Oct", rows: [HEADER, ["Ulyana", "Plan Q4 logistics", "in process", ""]] },
  { name: "Novemb", rows: [HEADER] },
];
const SEPT = new Date("2026-09-22T06:30:00Z");
const period = () => planningPeriod(SEPT);

describe("workbook parsing", () => {
  it("maps month sheets by their first letters and handles Tehran month boundaries", () => {
    expect(["January", "Feb", "Sept", "Oct", "Novemb", "December"].map(planningMonthIndex)).toEqual(
      [0, 1, 8, 9, 10, 11],
    );
    expect(planningMonthIndex("General milestones")).toBe(-1);
    expect(planningToday(new Date("2026-09-30T21:00:00Z"))).toBe("2026-10-01");
    expect(planningPeriod(new Date("2026-09-30T21:00:00Z"))).toEqual({
      year: 2026,
      month: 9,
      day: 1,
      daysInMonth: 31,
    });
  });
  it("classifies statuses the way the file uses them", () => {
    for (const status of [
      "Done",
      "done",
      "canceled",
      "Cancel",
      "canceld",
      "not done (moved to feb)",
      "not done, moved to july.",
      "moved to june",
      "Postponed",
      "not relevant for august",
    ])
      expect(isClosedStatus(status), status).toBe(true);
    for (const status of [
      "",
      "in process",
      "In progress",
      "not done",
      "partially done",
      "in process, partially done",
      "in process, mostly done",
      "hold",
    ])
      expect(isClosedStatus(status), status).toBe(false);
  });
  it("treats spelling variants as one person and splits shared rows", () => {
    expect(nameKey("Ulyana")).toBe(nameKey("Uliana"));
    expect(nameKey("Pooria")).toBe(nameKey("Pouria"));
    expect(nameKey("Pooriya")).toBe(nameKey("Pouria"));
    expect(nameKey("FAtima")).toBe(nameKey("Fatima"));
    expect(nameKey("Samira")).not.toBe(nameKey("Samir"));
    expect(nameKey("Mona")).not.toBe(nameKey("Mobina"));
    expect(splitPeople("Azat/Uliana/Mostafa")).toEqual(["Azat", "Uliana", "Mostafa"]);
    expect(splitPeople("Azat, Alex and Azat")).toEqual(["Azat", "Alex"]);
    expect(parsePlanningTeams("Supply=Azat, Mostafa; Logistics=Ulyana")).toEqual([
      { name: "Supply", people: ["Azat", "Mostafa"] },
      { name: "Logistics", people: ["Ulyana"] },
    ]);
    expect(parsePlanningTeams("")).toEqual([]);
    expect(() => parsePlanningTeams("=Azat")).toThrow("PLANNING_TEAMS");
  });
  it("reads people, header-less rows and milestones; merges name variants to the common spelling", () => {
    const data = parsePlanningWorkbook(sheets());
    expect(data.months).toEqual([7, 8, 9, 10]);
    expect(data.tasks).toHaveLength(19);
    const shared = data.tasks.find((t) => t.title.startsWith("Supplier relationship"));
    expect(shared.people).toEqual(["Azat", "Ulyana", "Mostafa"]);
    expect(shared.teams).toEqual([]);
    const dubai = data.tasks.find((t) => t.title.startsWith("prepare various"));
    expect(dubai.person).toBe("");
    expect(data.tasks.some((t) => t.title === "Actions")).toBe(false);
    expect(data.people.map((p) => `${p.name}:${p.count}`)).toEqual([
      "Ulyana:5",
      "Fatima:3",
      "Mostafa:3",
      "Azat:2",
      "Deniz:2",
      "Pooria:2",
      "Samira:2",
      "Mohsen:1",
    ]);
    expect(data.people.find((p) => p.name === "Ulyana").variants.sort()).toEqual([
      "Uliana",
      "Ulyana",
    ]);
    expect(data.people.find((p) => p.name === "Fatima").variants.sort()).toEqual([
      "FAtima",
      "Fatima",
    ]);
    expect(data.milestones).toEqual([
      { month: 0, title: "Jan goal", status: "done" },
      { month: 8, title: "Oil Show participate", status: "in process" },
      { month: 8, title: "Catalyst contract", status: "" },
    ]);
    // "Done" / "in process" written in the Comments column count as the status.
    expect(data.tasks.find((t) => t.title.startsWith("Tidying"))).toMatchObject({
      status: "Done",
      closed: true,
    });
    expect(data.tasks.find((t) => t.title.startsWith("Update price"))).toMatchObject({
      status: "",
      closed: false,
    });
    expect(data.tasks.find((t) => t.title.startsWith("Meeting with"))).toMatchObject({
      status: "in process",
      closed: false,
    });
    expect(() => parsePlanningWorkbook([{ name: "Sheet1", rows: [] }])).toThrow("No monthly sheet");
  });
  it("reads the sales plan tables from the milestones sheet by their labels", () => {
    expect(parseMoney("€280,000.00")).toBe(280000);
    expect(parseMoney(3500000)).toBe(3500000);
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("(1,000)")).toBe(-1000);
    const plan = parsePlanningWorkbook(sheets()).salesPlan;
    expect(plan.currency).toBe("€");
    expect(plan.targets).toEqual([
      { name: "Chromatek", amount: 300000 },
      { name: "STPC", amount: 3500000 },
    ]);
    expect(plan.targetsTotal).toBe(3800000);
    expect(plan.monthly).toEqual([
      { month: 0, planned: 280000, actual: null },
      { month: 1, planned: 280000, actual: 10000 },
      { month: 8, planned: 414000, actual: null },
      { month: 9, planned: 414000, actual: null },
    ]);
    expect(plan.monthlyTotal).toEqual({ planned: 1388000, actual: 10000 });
    expect(plan.quarters[0]).toEqual({ name: "Q1", planned: 840000, actual: 0 });
    expect(plan.quarters).toHaveLength(4);
    expect(plan.priorities).toEqual(["1- Get fullpayments", "2- Get prepayments", "3- Training"]);
    expect(
      plan.groups.map(
        (g) => `${g.name}: ${g.people.map((p) => p.name).join(",")} = ${g.total.target}`,
      ),
    ).toEqual(["Group A: Mona,Ali = 1100000", "Group C: Hamid = 200000"]);
    expect(plan.groups[0].people[0]).toEqual({
      name: "Mona",
      target: 200000,
      quarters: [42000, 33900, 62100, 62000],
      actual: 5000,
      remaining: 195000,
    });
    expect(plan.groups[0].people[1].actual).toBeNull();
    expect(plan.groupsTotal.target).toBe(1300000);
    expect(plan.extra).toEqual([
      { name: "Big Lab Projects", amount: 2000000 },
      { name: "Export team", amount: 300000 },
    ]);
    expect(parseSalesPlan([["Milestones"], ["x"]])).toBeNull();
    expect(parsePlanningWorkbook([{ name: "Sept", rows: [HEADER] }]).salesPlan).toBeNull();
  });
  it("assigns optional teams by name variant", () => {
    const data = parsePlanningWorkbook(sheets(), {
      teams: parsePlanningTeams("Supply=Azat,Mostafa;Logistics=Uliana"),
    });
    expect(data.people.find((p) => p.name === "Ulyana").team).toBe("Logistics");
    expect(data.tasks.find((t) => t.title.startsWith("Supplier")).teams).toEqual([
      "Supply",
      "Logistics",
    ]);
    expect(data.tasks.find((t) => t.title.startsWith("China visa")).teams).toEqual(["Unassigned"]);
  });
  it("buckets this month's work and carries open work from earlier months", () => {
    const data = parsePlanningWorkbook(sheets());
    const scoped = planningScope(data.tasks, period(), 1);
    const buckets = Object.fromEntries(scoped.map((t) => [t.id, planningBucket(t, period())]));
    expect(buckets).toEqual({
      "August:2": "carried",
      "August:3": "carried",
      "August:6": "carried",
      "August:7": "carried",
      "Sept:2": "open",
      "Sept:3": "open",
      "Sept:4": "unstarted",
      "Sept:5": "unstarted",
      "Sept:7": "open",
      "Sept:8": "done",
      "Sept:9": "open",
      "Sept:10": "unstarted",
      "Sept:11": "unstarted",
      "Sept:12": "done",
      "Sept:13": "open",
      "Sept:14": "unstarted",
    });
    expect(planningScope(data.tasks, period(), 0)).toHaveLength(12);
    expect(
      planningBucket(
        data.tasks.find((t) => t.sheet === "Oct"),
        period(),
      ),
    ).toBe("upcoming");
    const [everyone] = planningGroups(scoped);
    expect(everyone.name).toBe("");
    expect(everyone.people.map((p) => `${p.name}:${p.tasks.length}`)).toEqual([
      "Ulyana:4",
      "Mostafa:3",
      "Azat:2",
      "Pooria:2",
      "Samira:2",
      "Fatima:1",
      "Mohsen:1",
      "Unassigned:1",
    ]);
  });
  it("builds the digest per person (or per team), escapes HTML and flags carried-over work", () => {
    const data = parsePlanningWorkbook(sheets());
    const digest = planningDigest({ lookbackMonths: 1, teams: [] }, data, SEPT);
    expect(digest.subject).toBe("Artin Azma daily planning | 22 September 2026");
    expect(digest.text).toContain("8 days left in September");
    expect(digest.text).toContain("- Oil Show participate [in process]");
    expect(digest.text).toContain("September sales target: €414,000 · actual: not reported yet");
    expect(digest.text).toContain("Monthly priorities\n- 1- Get fullpayments");
    expect(digest.html).toContain("<li>2- Get prepayments</li>");
    expect(digest.text).toContain("Ulyana — 4 open");
    expect(digest.text).toContain("carried over from August");
    expect(digest.text).not.toContain("Site visit at Lamerd");
    expect(digest.text).not.toContain("Plan Q4 logistics");
    expect(digest.html).not.toContain("<img");
    expect(digest.html).toContain("&lt;img");
    expect(digest.html).not.toContain("<b>bold");
    const teams = parsePlanningTeams("Supply=Azat,Mostafa;Sales=Nobody");
    const byTeam = planningDigest(
      { lookbackMonths: 1, teams },
      parsePlanningWorkbook(sheets(), { teams }),
      SEPT,
    );
    expect(byTeam.text).toContain("Supply — 5 open tasks");
    expect(byTeam.text).toContain("Sales — 0 open tasks\nNo open tasks.");
    expect(byTeam.text).toContain("Unassigned — 10 open tasks");
    expect(planningDigest({}, null, SEPT).text).toContain("has not been read yet");
  });
});

// --- Server side: Google Drive read + SMTP send, with fetch mocked ---
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PEM = privateKey.export({ type: "pkcs8", format: "pem" });
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const GOOGLE_SHEET = "application/vnd.google-apps.spreadsheet";

function workbookBytes() {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets())
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

function driveEnv(extra = {}) {
  return {
    GOOGLE_SERVICE_ACCOUNT_EMAIL: "planning@test.iam.gserviceaccount.com",
    GOOGLE_PRIVATE_KEY: PEM.replace(/\n/g, "\\n"),
    PLANNING_DRIVE_FOLDER_ID: "folder123",
    PLANNING_DIGEST_TO: "ceo@example.com, ops@example.com",
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_USER: "bot@example.com",
    SMTP_PASS: "secret",
    ...extra,
  };
}

function mockDrive({
  files = [
    {
      id: "file1",
      name: "Planning 2026.xlsx",
      mimeType: XLSX_MIME,
      modifiedTime: "2026-09-21T10:00:00Z",
    },
  ],
  failDownload = false,
} = {}) {
  const calls = [];
  const fetchImpl = vi.fn(async (url, init) => {
    calls.push({ url: String(url), init });
    const u = String(url);
    if (u.startsWith("https://oauth2.googleapis.com/token"))
      return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), {
        status: 200,
      });
    if (u.startsWith("https://www.googleapis.com/drive/v3/files?"))
      return new Response(JSON.stringify({ files }), { status: 200 });
    if (/\/drive\/v3\/files\/[^/?]+\?fields=/.test(u))
      return new Response(JSON.stringify(files[0]), { status: 200 });
    if (u.includes("alt=media") || u.includes("/export?")) {
      if (failDownload) return new Response("Forbidden", { status: 403 });
      return new Response(workbookBytes(), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  });
  return { fetchImpl, calls };
}

describe("Google Drive reading and the daily email", () => {
  beforeEach(() => {
    resetPlanningCache();
    resetTokenCache();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  it("reports which pieces are configured", () => {
    expect(planningStatus({})).toEqual({
      serviceAccount: "",
      drive: false,
      mail: false,
      cron: false,
    });
    expect(planningStatus(driveEnv({ CRON_SECRET: "x" }))).toEqual({
      serviceAccount: "planning@test.iam.gserviceaccount.com",
      drive: true,
      mail: true,
      cron: true,
    });
    expect(planningConfigFromEnv(driveEnv()).recipients).toBe("ceo@example.com, ops@example.com");
    expect(() => planningConfigFromEnv({ PLANNING_LOOKBACK_MONTHS: "12" })).toThrow(
      "PLANNING_LOOKBACK_MONTHS",
    );
  });
  it("finds this year's .xlsx in the shared folder, downloads and parses it, and caches the result", async () => {
    const { fetchImpl, calls } = mockDrive();
    const result = await loadPlanning({ now: SEPT, env: driveEnv(), fetchImpl });
    expect(result.error).toBeNull();
    expect(result.source).toMatchObject({
      id: "file1",
      name: "Planning 2026.xlsx",
      url: "https://drive.google.com/file/d/file1/view",
    });
    expect(result.data.tasks).toHaveLength(19);
    expect(result.data.people[0].name).toBe("Ulyana");
    const list = calls.find((c) => c.url.startsWith("https://www.googleapis.com/drive/v3/files?"));
    const q = new URL(list.url).searchParams.get("q");
    expect(q).toContain("'folder123' in parents");
    expect(q).toContain("name = 'Planning 2026' or name = 'Planning 2026.xlsx'");
    expect(calls.find((c) => c.url.includes("alt=media")).init.headers.authorization).toBe(
      "Bearer tok",
    );
    const again = await loadPlanning({ now: SEPT, env: driveEnv(), fetchImpl });
    expect(again.data).toBe(result.data);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
  it("exports native Google Sheets and reads a fixed file id", async () => {
    const { fetchImpl, calls } = mockDrive({
      files: [
        {
          id: "sheet1",
          name: "Planning 2026",
          mimeType: GOOGLE_SHEET,
          modifiedTime: "2026-09-21T10:00:00Z",
        },
      ],
    });
    const result = await loadPlanning({
      now: SEPT,
      env: driveEnv({ PLANNING_DRIVE_FOLDER_ID: "", PLANNING_FILE_ID: "sheet1" }),
      fetchImpl,
    });
    expect(result.error).toBeNull();
    expect(result.source.url).toBe("https://docs.google.com/spreadsheets/d/sheet1/edit");
    expect(calls.some((c) => c.url.includes("/files/sheet1/export?mimeType="))).toBe(true);
    expect(calls.some((c) => c.url.startsWith("https://www.googleapis.com/drive/v3/files?"))).toBe(
      false,
    );
  });
  it("explains a missing or ambiguous yearly file and keeps the last good read on failure", async () => {
    const missing = await loadPlanning({
      now: SEPT,
      env: driveEnv(),
      fetchImpl: mockDrive({ files: [] }).fetchImpl,
    });
    expect(missing.error).toContain('"Planning 2026" was not found');
    expect(missing.data).toBeNull();
    const dup = await loadPlanning({
      now: SEPT,
      env: driveEnv(),
      fetchImpl: mockDrive({
        files: [
          { id: "a", name: "Planning 2026", mimeType: XLSX_MIME },
          { id: "b", name: "Planning 2026.xlsx", mimeType: XLSX_MIME },
        ],
      }).fetchImpl,
    });
    expect(dup.error).toContain("More than one");
    const good = await loadPlanning({
      now: SEPT,
      env: driveEnv(),
      fetchImpl: mockDrive().fetchImpl,
    });
    expect(good.error).toBeNull();
    const stale = await loadPlanning({
      force: true,
      now: SEPT,
      env: driveEnv(),
      fetchImpl: mockDrive({ failDownload: true }).fetchImpl,
    });
    expect(stale.error).toContain("403");
    expect(stale.data).toBe(good.data);
    expect(await loadPlanning({ env: {}, fetchImpl: vi.fn() })).toMatchObject({
      data: null,
      error: expect.stringContaining("not connected"),
    });
  });
  it("emails the digest to PLANNING_DIGEST_TO and never sends stale data", async () => {
    const transport = { sendMail: vi.fn(async () => ({ messageId: "<id@test>" })) };
    const sent = await sendPlanningDigest({
      now: SEPT,
      env: driveEnv(),
      fetchImpl: mockDrive().fetchImpl,
      transport,
    });
    expect(sent).toMatchObject({
      to: "ceo@example.com, ops@example.com",
      messageId: "<id@test>",
      file: "Planning 2026.xlsx",
    });
    const mail = transport.sendMail.mock.calls[0][0];
    expect(mail.from).toBe('"Artin Azma Planning" <bot@example.com>');
    expect(mail.subject).toBe("Artin Azma daily planning | 22 September 2026");
    expect(mail.text).toContain("Ulyana — 4 open");
    expect(mail.html).toContain("carried over from August");
    await expect(
      sendPlanningDigest({
        now: SEPT,
        env: driveEnv(),
        fetchImpl: mockDrive({ failDownload: true }).fetchImpl,
        transport,
      }),
    ).rejects.toThrow("Digest not sent");
    expect(transport.sendMail).toHaveBeenCalledTimes(1);
    await expect(
      sendPlanningDigest({
        now: SEPT,
        env: driveEnv({ PLANNING_DIGEST_TO: "" }),
        fetchImpl: mockDrive().fetchImpl,
        transport,
      }),
    ).rejects.toThrow("PLANNING_DIGEST_TO");
  });
});

describe("planning API boundaries", () => {
  const response = () => ({ setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() });
  const auth = () => {
    vi.stubEnv("LOGIN_USER", "test");
    vi.stubEnv("LOGIN_PASS", "test");
    vi.stubEnv("AUTH_SECRET", "s".repeat(64));
    return { dashboard_auth: createSession() };
  };
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetPlanningCache();
  });
  it("rejects anonymous and shared-link requests without contacting Google", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    for (const request of [
      { cookies: {}, query: {} },
      { cookies: auth(), query: { share: "anything" } },
    ]) {
      const res = response();
      await handler({ method: "GET", ...request }, res);
      expect(res.status).toHaveBeenCalledWith(401);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns the not-connected state without secrets, and rejects unknown or non-JSON actions", async () => {
    const cookies = auth();
    const get = response();
    await handler({ method: "GET", cookies, query: {} }, get);
    expect(get.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: null, error: expect.stringContaining("not connected") }),
    );
    expect(JSON.stringify(get.json.mock.calls[0][0])).not.toContain("PRIVATE KEY");
    const text = response();
    await handler(
      { method: "POST", cookies, query: {}, headers: { "content-type": "text/plain" } },
      text,
    );
    expect(text.status).toHaveBeenCalledWith(415);
    const bad = response();
    await handler(
      {
        method: "POST",
        cookies,
        query: {},
        headers: { "content-type": "application/json" },
        body: { action: "drop" },
      },
      bad,
    );
    expect(bad.status).toHaveBeenCalledWith(400);
    const send = response();
    await handler(
      {
        method: "POST",
        cookies,
        query: {},
        headers: { "content-type": "application/json" },
        body: { action: "send" },
      },
      send,
    );
    expect(send.status).toHaveBeenCalledWith(502);
    expect(send.json.mock.calls[0][0].error).toContain("not connected");
  });
  it("lets Vercel Cron in with the bearer secret only", async () => {
    vi.stubEnv("CRON_SECRET", "cron-secret");
    const anon = response();
    await cron({ method: "GET", headers: {}, cookies: {} }, anon);
    expect(anon.status).toHaveBeenCalledWith(401);
    const wrong = response();
    await cron({ method: "GET", headers: { authorization: "Bearer nope" }, cookies: {} }, wrong);
    expect(wrong.status).toHaveBeenCalledWith(401);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const ok = response();
    await cron(
      { method: "GET", headers: { authorization: "Bearer cron-secret" }, cookies: {} },
      ok,
    );
    // Drive is not configured in this test, so the send fails cleanly instead of silently succeeding.
    expect(ok.status).toHaveBeenCalledWith(500);
    expect(ok.json.mock.calls[0][0]).toMatchObject({
      ok: false,
      error: expect.stringContaining("not connected"),
    });
  });
});
