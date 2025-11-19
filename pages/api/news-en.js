import { parse } from "rss-to-json";

const SOURCES = [
  {
    id: "bloomberg",
    name: "Bloomberg",
    url: "https://news.google.com/rss/search?q=bloomberg&hl=en-US&gl=US&ceid=US:en",
  },
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

    let items = results.flat();
    items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    items = items.slice(0, 30);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ items });
  } catch (err) {
    console.error("NEWS-EN API ERROR", err);
    res.status(500).json({ items: [], error: "failed_to_fetch_news_en" });
  }
}
