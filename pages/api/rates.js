// pages/api/rates.js

const SUCCESS_CACHE_SECONDS = 60 * 60;
const STALE_CACHE_SECONDS = 6 * 60 * 60;
const ERROR_CACHE_SECONDS = 60;

const memoryCache = {
  items: null,
  fetchedAt: 0,
};

const send = (res, payload, cacheSeconds = ERROR_CACHE_SECONDS) => {
  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${STALE_CACHE_SECONDS}`,
  );
  return res.status(200).json(payload);
};

export default async function handler(req, res) {
  const key = process.env.NAVASAN_API_KEY;

  if (!key) {
    // اگر تو .env.local ست نشده باشد
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ error: "NAVASAN_API_KEY_NOT_SET", items: {} });
  }

  const cacheAgeSeconds = Math.floor((Date.now() - memoryCache.fetchedAt) / 1000);
  if (memoryCache.items && cacheAgeSeconds >= 0 && cacheAgeSeconds < SUCCESS_CACHE_SECONDS) {
    return send(
      res,
      {
        items: memoryCache.items,
        error: null,
        cache: "memory",
        cache_age_seconds: cacheAgeSeconds,
      },
      SUCCESS_CACHE_SECONDS - cacheAgeSeconds,
    );
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
    // مرکز مبادله (نیما) — برای محاسبه‌ی اختلاف نرخ بازار آزاد با نیما
    "mex_usd_sell",
    "mex_usd_buy",
    "mex_eur_sell",
    "mex_eur_buy",
  ];

  const url = `https://api.navasan.tech/latest/?api_key=${encodeURIComponent(
    key,
  )}&item=${itemList.join(",")}`;

  try {
    const r = await fetch(url);
    const text = await r.text(); // متن خام پاسخ (برای دیباگ 401 خیلی مفید است)

    if (!r.ok) {
      // اینجا دقیق پیام نوسان را لاگ می‌کنیم
      console.error("NAVASAN ERROR:", r.status, text);

      // به فرانت هم برگردونیم تا بفهمیم چی شده
      if (memoryCache.items) {
        return send(res, {
          items: memoryCache.items,
          error: r.status === 429 ? "NAVASAN_RATE_LIMITED" : `HTTP_${r.status}`,
          stale: true,
          cache_age_seconds: cacheAgeSeconds,
        });
      }

      return send(res, {
        items: {},
        error: r.status === 429 ? "NAVASAN_RATE_LIMITED" : `HTTP_${r.status}`,
        raw: text,
      });
    }

    // اگر 200 بود، دیتا JSON عادی نوسان است
    const data = JSON.parse(text);
    memoryCache.items = data;
    memoryCache.fetchedAt = Date.now();

    // همون آبجکت را زیر کلید items برمی‌گردونیم
    return send(
      res,
      {
        items: data,
        error: null,
        cache: "fresh",
      },
      SUCCESS_CACHE_SECONDS,
    );
  } catch (e) {
    console.error("Rates API error:", e);
    if (memoryCache.items) {
      return send(res, {
        items: memoryCache.items,
        error: "NAVASAN_FETCH_FAILED",
        stale: true,
        cache_age_seconds: cacheAgeSeconds,
      });
    }
    return send(res, {
      items: {},
      error: "NAVASAN_FETCH_FAILED",
      detail: e.message || "fetch_failed",
    });
  }
}
