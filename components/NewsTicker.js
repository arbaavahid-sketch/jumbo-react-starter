import useSWR from "swr";

const fetcher = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

export default function NewsTicker() {
  const { data, error, isLoading } = useSWR("/api/news", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 5 * 60_000,
  });

  const items = data?.items || [];

  if (error || isLoading || items.length === 0) return null;

  const line = items
    .map((n) => `【${n.source}】 ${n.title}`)
    .join("   •   ");

  return (
    <div
      style={{
        marginTop: 16,
        borderRadius: 16,
        padding: "6px 0",
        background: "linear-gradient(90deg,#0f172a,#111827)",
        boxShadow: "0 10px 25px rgba(15,23,42,0.35)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "#e5e7eb",
          fontSize: 13,
          paddingInline: 14,
          whiteSpace: "nowrap",
          direction: "ltr",
        }}
      >
        {/* 🔽 ticker */}
        <div className="ticker-wrapper" style={{ flex: 1 }}>
          <div className="ticker-content">
            {line} • {line}
          </div>
        </div>

        {/* 🔽 label */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#38bdf8",
          }}
        >
          LIVE NEWS
        </span>
      </div>

      <style jsx>{`
        .ticker-wrapper {
          overflow: hidden;
        }

        .ticker-content {
          display: inline-block;
          white-space: nowrap;
          animation: ticker-move 300s linear infinite;
        }

        @keyframes ticker-move {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
