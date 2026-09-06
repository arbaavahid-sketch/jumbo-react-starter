import { AUTH_COOKIE, SESSION_SECONDS, authConfigured, constantTimeEqual, createSession } from "../../lib/auth";
export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const { username, password } = req.body || {};

  res.setHeader("Cache-Control", "no-store");
  if (!authConfigured()) return res.status(503).json({ ok: false, message: "تنظیمات ورود سرور کامل نیست." });
  const validUser = process.env.LOGIN_USER;
  const validPass = process.env.LOGIN_PASS;

  const userMatches = constantTimeEqual(username, validUser);
  const passwordMatches = constantTimeEqual(password, validPass);
  if (userMatches && passwordMatches) {
    // ساختن کوکی بدون نیاز به پکیج اضافه
    const cookie = [
      `${AUTH_COOKIE}=${createSession()}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=" + SESSION_SECONDS,
      process.env.NODE_ENV === "production" ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; ");

    res.setHeader("Set-Cookie", cookie);
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false, message: "Username یا Password اشتباه است." });
}
