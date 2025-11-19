// pages/api/rates.js
export default async function handler(req, res) {
  try {
    // از exchangerate.host استفاده می‌کنیم (رایگان و بدون کلید)
    const url =
      "https://api.exchangerate.host/lhttps://www.tgju.org/atest?base=USD&symbols=IRR,EUR";

    const r = await fetch(url);
    if (!r.ok) {
      throw new Error(`HTTP ${r.status}`);
    }

    const data = await r.json();

    const usdIrr = data?.rates?.IRR ?? null; // ۱ دلار چند ریال
    const usdEur = data?.rates?.EUR ?? null; // ۱ دلار چند یورو
    const eurIrr =
      usdIrr && usdEur ? usdIrr / usdEur : null; // ۱ یورو چند ریال (تقریبی)
    const usdtIrr = usdIrr; // تتر ≈ دلار

    res.status(200).json({
      usdIrr,
      usdEur,
      eurIrr,
      usdtIrr,
      date: data?.date || null,
    });
  } catch (e) {
    console.error("Rates API error:", e);
    res.status(200).json({
      usdIrr: null,
      usdEur: null,
      eurIrr: null,
      usdtIrr: null,
      date: null,
      error: e.message || "fetch_failed",
    });
  }
}
