import useSWR from "swr";

const fetcher = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

export default function NewsTickerEn() {
  const { data, error, isLoading } = useSWR("/api/news-en", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 5 * 60_000,
  });

  const items = data?.items || [];
  if (error || isLoading || items.length === 0) return null;

  const line = items.map((n) => `[${n.source}] ${n.title}`).join("   •   ");

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 16,
        padding: "6px 0",
        background: "linear-gradient(90deg,#1e293b,#0f172a)",
        boxShadow: "0 10px 25px rgba(15,23,42,0.35)",
        overflow: "hidden",
      }}
    >
      <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#e5e7eb",
    fontSize: 13,
    paddingInline: 14,
    whiteSpace: "nowrap",
    direction: "ltr",
    textAlign: "left",
  }}
>
  {/* ⬅️ ابتدا عنوان خبری بیاد سمت چپ */}
  <span
    style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "#34d399",
      flexShrink: 0,
    }}
  >
    BLOOMBERG NEWS
  </span>

  {/* اسکرول اخبار */}
  <div className="ticker-wrapper" style={{ flex: 1 }}>
    <div className="ticker-content">{line} • {line}</div>
  </div>
</div>
      <style jsx>{`
  .ticker-wrapper {
    overflow: hidden;
  }
  .ticker-content {
    display: inline-block;
    padding-left: 100%;
    animation: ticker-en 900s linear infinite;
    white-space: nowrap;
    direction: ltr;
    text-align: left;
  }

  @keyframes ticker-en {
    0% {
      transform: translateX(100%);
    }
    100% {
      transform: translateX(-100%);
    }
  }
`}</style>
    </div>
  );
}
