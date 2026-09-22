// Server-only: reads the planning workbook straight from Google Drive with the service account,
// caches the parsed result in memory and emails the daily digest over SMTP.
import * as XLSX from "xlsx";
import { getAccessToken, googleFetch, serviceAccountFromEnv } from "./google-auth";
import {
  DEFAULT_CLOSED_STATUSES,
  parsePlanningTeams,
  parsePlanningWorkbook,
  planningDigest,
  planningPeriod,
} from "./planning";

const DRIVE = "https://www.googleapis.com/drive/v3/files";
const GOOGLE_SHEET = "application/vnd.google-apps.spreadsheet";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const CACHE_MS = 10 * 60 * 1000;

export function planningConfigFromEnv(env = process.env) {
  const lookback = env.PLANNING_LOOKBACK_MONTHS ? Number(env.PLANNING_LOOKBACK_MONTHS) : 1;
  if (!Number.isInteger(lookback) || lookback < 0 || lookback > 11)
    throw new Error("PLANNING_LOOKBACK_MONTHS must be a whole number between 0 and 11.");
  return {
    fileId: env.PLANNING_FILE_ID?.trim() || "",
    folderId: env.PLANNING_DRIVE_FOLDER_ID?.trim() || "",
    pattern: env.PLANNING_FILE_PATTERN?.trim() || "Planning {YYYY}",
    teams: parsePlanningTeams(env.PLANNING_TEAMS),
    closedStatuses: env.PLANNING_CLOSED_STATUSES?.trim() || DEFAULT_CLOSED_STATUSES,
    lookbackMonths: lookback,
    recipients: (env.PLANNING_DIGEST_TO || "")
      .split(/[,;\s]+/)
      .filter(Boolean)
      .join(", "),
    time: "07:00",
  };
}

export function planningStatus(env = process.env) {
  const config = planningConfigFromEnv(env);
  return {
    serviceAccount: env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || "",
    drive: Boolean(serviceAccountFromEnv(env) && (config.fileId || config.folderId)),
    mail: Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && config.recipients),
    cron: Boolean(env.CRON_SECRET),
  };
}

function fileUrl(file) {
  return file.mimeType === GOOGLE_SHEET
    ? `https://docs.google.com/spreadsheets/d/${file.id}/edit`
    : `https://drive.google.com/file/d/${file.id}/view`;
}

const FIELDS = "id,name,mimeType,modifiedTime";

// The fixed file, or this year's file inside the shared folder ("Planning 2026" / "Planning 2026.xlsx").
export async function findPlanningFile(token, config, now = new Date(), fetchImpl = fetch) {
  if (config.fileId) {
    const res = await googleFetch(
      token,
      `${DRIVE}/${encodeURIComponent(config.fileId)}?${new URLSearchParams({ fields: FIELDS, supportsAllDrives: "true" })}`,
      fetchImpl,
    );
    const file = await res.json();
    if (![GOOGLE_SHEET, XLSX_MIME].includes(file.mimeType))
      throw new Error(`"${file.name}" is not a Google Sheet or .xlsx file.`);
    return file;
  }
  if (!config.folderId) throw new Error("Set PLANNING_FILE_ID or PLANNING_DRIVE_FOLDER_ID.");
  const expected = config.pattern.replaceAll("{YYYY}", String(planningPeriod(now).year));
  const quote = (value) => `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  const q = `${quote(config.folderId)} in parents and trashed = false and (name = ${quote(expected)} or name = ${quote(`${expected}.xlsx`)}) and (mimeType = '${GOOGLE_SHEET}' or mimeType = '${XLSX_MIME}')`;
  const res = await googleFetch(
    token,
    `${DRIVE}?${new URLSearchParams({
      q,
      fields: `files(${FIELDS})`,
      pageSize: "10",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    })}`,
    fetchImpl,
  );
  const files = (await res.json()).files || [];
  if (files.length !== 1)
    throw new Error(
      files.length
        ? `More than one "${expected}" file exists in the planning folder.`
        : `"${expected}" was not found in the planning folder (is it shared with the service account?).`,
    );
  return files[0];
}

// Downloads the workbook (native Sheets are exported as .xlsx) and returns [{ name, rows }].
export async function downloadPlanningSheets(token, file, fetchImpl = fetch) {
  const url =
    file.mimeType === GOOGLE_SHEET
      ? `${DRIVE}/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(XLSX_MIME)}`
      : `${DRIVE}/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`;
  const res = await googleFetch(token, url, fetchImpl);
  const workbook = XLSX.read(Buffer.from(await res.arrayBuffer()), { type: "buffer" });
  return workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: "", raw: false }),
  }));
}

let cache = null;

export function resetPlanningCache() {
  cache = null;
}

// { config, data, source, error, readAt }. On failure the previous successful read is kept with
// the error attached so the dashboard can show stale data with a warning.
export async function loadPlanning({
  force = false,
  now = new Date(),
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const config = planningConfigFromEnv(env);
  const sa = serviceAccountFromEnv(env);
  if (!sa || (!config.fileId && !config.folderId))
    return {
      config,
      data: null,
      source: null,
      error:
        "Google Drive is not connected: set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY and PLANNING_FILE_ID (or PLANNING_DRIVE_FOLDER_ID).",
    };
  if (!force && cache && Date.now() - cache.readAt < CACHE_MS) return { config, ...cache };
  try {
    const token = await getAccessToken(sa, fetchImpl);
    const file = await findPlanningFile(token, config, now, fetchImpl);
    const sheets = await downloadPlanningSheets(token, file, fetchImpl);
    const data = parsePlanningWorkbook(sheets, config);
    cache = {
      data,
      source: {
        id: file.id,
        name: file.name,
        url: fileUrl(file),
        modifiedTime: file.modifiedTime,
        readAt: new Date().toISOString(),
      },
      error: null,
      readAt: Date.now(),
    };
    return { config, ...cache };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { config, data: cache?.data || null, source: cache?.source || null, error: message };
  }
}

export function mailTransport(env = process.env) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS)
    throw new Error("Email is not configured: set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS.");
  const port = Number(env.SMTP_PORT || 587);
  return import("nodemailer").then((nodemailer) =>
    nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    }),
  );
}

// Reads the workbook fresh and emails the digest. Never sends stale data: a read error throws.
export async function sendPlanningDigest({
  now = new Date(),
  env = process.env,
  fetchImpl = fetch,
  transport,
} = {}) {
  const result = await loadPlanning({ force: true, now, env, fetchImpl });
  if (result.error) throw new Error(`Digest not sent: ${result.error}`);
  if (!result.config.recipients) throw new Error("Digest not sent: PLANNING_DIGEST_TO is empty.");
  const digest = planningDigest(result.config, result.data, now);
  const mailer = transport || (await mailTransport(env));
  const info = await mailer.sendMail({
    from: env.MAIL_FROM || `"Artin Azma Planning" <${env.SMTP_USER}>`,
    to: result.config.recipients,
    subject: digest.subject,
    text: digest.text,
    html: digest.html,
  });
  return {
    to: result.config.recipients,
    subject: digest.subject,
    messageId: info?.messageId || null,
    file: result.source.name,
  };
}
