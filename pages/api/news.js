import { parse } from "rss-to-json";

const SOURCES = [
  {
    id: "bbc-fa",
    name: "BBC Persian",
    url: "https://www.bbc.co.uk/persian/index.xml",
  },
  {
    id: "euronews-fa",
    name: "Euronews Farsi",
    url: "https://fa.euronews.com/rss?level=theme&name=news",
  },
  // هر منبع دیگه‌ای خواستی اینجا اضافه کن
];

export default async function handler(req, res) {
  try {
    const results = await Promise.all(
      SOURCES.map(async (src) => {
        try {
          const feed = await parse(src.url);
          return (feed.items || []).map((item) => ({
            title: item.title,
            link: item.link,
            date: item.published || item.created || null,
            source: src.name,
          }));
        } catch (e) {
          console.error("RSS error for", src.id, e);
          return [];
        }
      })
    );

    // همه خبرها در یک آرایه
    let items = results.flat();

    // مرتب‌سازی بر اساس تاریخ (اگر بود)
    items.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

    // محدود کردن به مثلا ۳۰ خبر
    items = items.slice(0, 30);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600"); // کش برای Vercel
    res.status(200).json({ items });
  } catch (err) {
    console.error("NEWS API ERROR", err);
    res.status(500).json({ items: [], error: "failed_to_fetch_news" });
  }
}
