// pages/api/ceo-message.js
// این فقط درخواست را به Google Apps Script فوروارد می‌کند

export default async function handler(req, res) {
  const webhook = process.env.CEO_MSG_WEBHOOK_URL;
  if (!webhook) {
    res.status(500).json({ error: "CEO_MSG_WEBHOOK_URL not set" });
    return;
  }

  if (req.method === "POST") {
    try {
      const { group, message } = req.body || {};
      if (!group) {
        res.status(400).json({ error: "group required" });
        return;
      }

      const r = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group, message }),
      });

      const text = await r.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }

      if (!r.ok) {
        res
          .status(500)
          .json({ error: "Script error", status: r.status, body: json });
        return;
      }

      res.status(200).json(json);
    } catch (err) {
      console.error("POST /api/ceo-message error:", err);
      res.status(500).json({ error: String(err.message || err) });
    }
    return;
  }

  res.setHeader("Allow", ["POST"]);
  res.status(405).end("Method Not Allowed");
}
