import { AUTH_COOKIE } from "../../lib/auth";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");
  res.setHeader(
    "Set-Cookie",
    [
      `${AUTH_COOKIE}=`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=0",
      process.env.NODE_ENV === "production" ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; "),
  );
  return res.status(200).json({ ok: true });
}
