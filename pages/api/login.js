// pages/api/login.js
export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const { username, password } = req.body || {};

  const validUser = process.env.LOGIN_USER || "manager";
  const validPass = process.env.LOGIN_PASS || "artin123";

  if (username === validUser && password === validPass) {
    // ساختن کوکی بدون نیاز به پکیج اضافه
    const cookie = [
      "dashboard_auth=ok",
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=" + 60 * 60 * 8, // 8 ساعت
      process.env.NODE_ENV === "production" ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; ");

    res.setHeader("Set-Cookie", cookie);
    return res.status(200).json({ ok: true });
  }

  return res
    .status(401)
    .json({ ok: false, message: "Username یا Password اشتباه است." });
}
