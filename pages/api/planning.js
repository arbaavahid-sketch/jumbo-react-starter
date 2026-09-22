import { requireReadAccess } from "../../lib/access";
import { loadPlanning, planningStatus, sendPlanningDigest } from "../../lib/planning-server";

// GET: workbook data (cached 10 min). POST { action: "refresh" | "send" }: reread Drive / email now.
export default async function handler(req, res) {
  const access = requireReadAccess(req, res, "/api/planning");
  if (!access) return;
  // Share links never reach planning data.
  if (access.scope) return res.status(401).json({ error: "Unauthorized" });
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (
    req.method === "POST" &&
    !/^application\/json(?:;|$)/i.test(req.headers?.["content-type"] || "")
  )
    return res.status(415).json({ error: "Request body must be JSON." });
  const action = req.method === "GET" ? "read" : req.body?.action;
  if (!["read", "refresh", "send"].includes(action))
    return res.status(400).json({ error: "Unknown action." });
  try {
    let sent = null;
    if (action === "send") sent = await sendPlanningDigest();
    const result = await loadPlanning({ force: action === "refresh" });
    return res.json({ ...result, status: planningStatus(), sent });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "4kb" } }, maxDuration: 60 };
