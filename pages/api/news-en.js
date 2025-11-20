import { parse } from "rss-to-json";

const SOURCES = [
  {
    id: "investing",
    name: "Investing",
    url: "https://www.investing.com/rss/news.rss",
  },
  {
    id: "yahoo-finance",
    name: "Yahoo Finance",
    url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EDJI&region=US&lang=en-US",
  },
  {
    id: "marketwatch",
    name: "MarketWatch",
    url: "https://feeds.content.dowjones.com/rss/mw_topstories",
  },
  {
    id: "reuters",
    name: "Reuters",
    url: "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
  },
  {
    id: "ft",
    name: "Financial Times",
    url: "https://www.ft.com/?format=rss",
  },
  {
    id: "cnbc",
    name: "CNBC",
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
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
            date:
              item.published ||
              item.created ||
              item.pubDate ||
              new Date().toISOString(),
            source: src.name,
          }));
        } catch (e) {
          console.error("RSS error for", src.id, e);
          return [];
        }
      })
    );

    // merge all sources
    let items = results.flat();

    // sort by date
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    // limit to latest 40
    items = items.slice(0, 40);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ items });
  } catch (err) {
    console.error("NEWS-EN API ERROR", err);
    res.status(500).json({ items: [], error: "failed_to_fetch_news_en" });
  }
}
