const CACHE_SECONDS = 15 * 60;
const TGJU_KEYS = {
  usd: "137203",
  eur: "137205",
};

const memoryCache = {
  payload: null,
  fetchedAt: 0,
};

const toNum = (value) => {
  const numeric = Number(
    String(value ?? "")
      .replace(/,/g, "")
      .trim(),
  );
  return Number.isFinite(numeric) ? numeric : NaN;
};

const send = (res, payload, cacheSeconds = CACHE_SECONDS) => {
  res.setHeader("Cache-Control", `public, s-maxage=${cacheSeconds}, stale-while-revalidate=3600`);
  return res.status(200).json(payload);
};

export default async function handler(req, res) {
  const ageSeconds = Math.floor((Date.now() - memoryCache.fetchedAt) / 1000);
  if (memoryCache.payload && ageSeconds >= 0 && ageSeconds < CACHE_SECONDS) {
    return send(
      res,
      {
        ...memoryCache.payload,
        cache: "memory",
        cache_age_seconds: ageSeconds,
      },
      CACHE_SECONDS - ageSeconds,
    );
  }

  try {
    const keys = Object.values(TGJU_KEYS).join(",");
    const response = await fetch(`https://api.tgju.org/v1/widget/tmp?keys=${keys}`);
    if (!response.ok) throw new Error(`TGJU HTTP ${response.status}`);

    const json = await response.json();
    const indicators = json?.response?.indicators || [];
    const rates = {};

    Object.entries(TGJU_KEYS).forEach(([currency, itemId]) => {
      const row = indicators.find((item) => String(item.item_id) === itemId);
      const value = toNum(row?.p);
      if (Number.isFinite(value)) {
        rates[currency] = {
          value,
          label: row?.title || currency.toUpperCase(),
          updated_at: row?.updated_at || null,
        };
      }
    });

    const payload = {
      rates,
      source: "tgju",
      error: null,
    };
    memoryCache.payload = payload;
    memoryCache.fetchedAt = Date.now();

    return send(res, payload);
  } catch (error) {
    if (memoryCache.payload) {
      return send(res, {
        ...memoryCache.payload,
        error: "TGJU_FETCH_FAILED",
        stale: true,
        cache_age_seconds: ageSeconds,
      });
    }

    return send(res, {
      rates: {},
      source: "tgju",
      error: "TGJU_FETCH_FAILED",
      detail: String(error.message || error),
    });
  }
}
