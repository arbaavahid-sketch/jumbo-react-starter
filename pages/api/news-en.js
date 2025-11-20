// pages/api/news-en.js
export default async function handler(req, res) {
  try {
    const { NEWSAPI_KEY } = process.env;

    if (!NEWSAPI_KEY) {
      return res
        .status(500)
        .json({ items: [], error: "NEWSAPI_KEY is missing" });
    }

    // 🔹 کوئری اقتصادی از چند منبع معتبر
    const url =
      "https://newsapi.org/v2/everything" +
      "?language=en" +
      "&pageSize=30" +
      "&sortBy=publishedAt" +
      "&domains=bloomberg.com,ft.com,wsj.com,reuters.com" +
      "&q=markets OR stocks OR oil OR inflation OR \"central bank\"";

    const r = await fetch(url, {
      headers: {
        "X-Api-Key": NEWSAPI_KEY,
      },
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("NewsAPI error:", r.status, text);
      return res
        .status(500)
        .json({ items: [], error: "newsapi_http_" + r.status });
    }

    const json = await r.json();

    const items =
      (json.articles || []).map((a) => ({
        title: a.title,
        link: a.url,
        date: a.publishedAt || null,
        source: a.source?.name || "News",
      })) || [];

    res.setHeader(
      "Cache-Control",
      "s-maxage=300, stale-while-revalidate=600"
    );

    res.status(200).json({ items });
  } catch (err) {
    console.error("NEWS-EN API ERROR", err);
    res.status(500).json({ items: [], error: "failed_to_fetch_news_en" });
  }
}
