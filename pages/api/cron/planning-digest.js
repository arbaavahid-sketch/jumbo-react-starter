import { AUTH_COOKIE, verifySession } from "../../../lib/auth";
import { sendPlanningDigest } from "../../../lib/planning-server";

// Vercel Cron (03:30 UTC = 07:00 Tehran) calls this with "Authorization: Bearer CRON_SECRET".
// A signed-in manager can also trigger it. Sends every day, including Fridays.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  const secret = process.env.CRON_SECRET;
  const viaCron = Boolean(secret) && req.headers.authorization === `Bearer ${secret}`;
  const viaSession = verifySession(req.cookies?.[AUTH_COOKIE]);
  if (!viaCron && !viaSession) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const result = await sendPlanningDigest();
    console.log(`[planning-digest] sent to ${result.to} (${result.file})`);
    return res.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[planning-digest] failed: ${message}`);
    return res.status(500).json({ ok: false, error: message });
  }
}

export const config = { maxDuration: 60 };
