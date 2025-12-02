// pages/api/rates.js

export default async function handler(req, res) {
  const key = process.env.NAVASAN_API_KEY;

  if (!key) {
    // اگر تو .env.local ست نشده باشد
    return res.status(500).json({ error: "NAVASAN_API_KEY not set", items: {} });
  }

  // آیتم‌هایی که خودت گفتی می‌خوای:
  // bahar, nim, rob, 18ayar, eur, rub, aed, usd, eth, btc, usdt
  const itemList = [
    "bahar",
    "nim",
    "rob",
    "18ayar",
    "eur",
    "rub",
    "aed",
    "usd",
    "eth",
    "btc",
    "usdt",
  ];

  const url = `http://api.navasan.tech/latest/?api_key=${encodeURIComponent(
    key
  )}&item=${itemList.join(",")}`;

  try {
    const r = await fetch(url);
    const text = await r.text(); // متن خام پاسخ (برای دیباگ 401 خیلی مفید است)

    if (!r.ok) {
      // اینجا دقیق پیام نوسان را لاگ می‌کنیم
      console.error("NAVASAN ERROR:", r.status, text);

      // به فرانت هم برگردونیم تا بفهمیم چی شده
      return res.status(200).json({
        items: {},
        error: `HTTP_${r.status}`,
        raw: text,
      });
    }

    // اگر 200 بود، دیتا JSON عادی نوسان است
    const data = JSON.parse(text);

    // همون آبجکت را زیر کلید items برمی‌گردونیم
    return res.status(200).json({
      items: data,
      error: null,
    });
  } catch (e) {
    console.error("Rates API error:", e);
    return res.status(200).json({
      items: {},
      error: e.message || "fetch_failed",
    });
  }
}
