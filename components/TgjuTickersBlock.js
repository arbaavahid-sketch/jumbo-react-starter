// components/TgjuTickersBlock.js
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((r) => r.json());

/// فرمت عدد به ریال با جداکننده هزارگان
function formatRial(v) {
  if (!v) return "-";

  // تبدیل استرینگ به عدد
  const toman = Number(String(v).replace(/[,]/g, "")) || 0;

  // تبدیل تومان به ریال
  const rial = toman * 10;

  // فقط عدد فرمت‌شده (بدون "ریال")
  return rial.toLocaleString("fa-IR");
}




function TickerCard({ title, items, accent = "#1d4ed8" }) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 18,
        padding: "12px 14px 14px",
        background:
          "radial-gradient(circle at top left, rgba(37,99,235,0.06), #f9fafb)",
        boxShadow:
          "0 18px 40px rgba(15,23,42,0.10), 0 0 0 1px rgba(148,163,184,0.16)",
        overflow: "hidden",
      }}
    >
      {/* نوار رنگی بالا */}
      <div
        style={{
          position: "absolute",
          insetInline: 0,
          top: 0,
          height: 3,
          background:
            "linear-gradient(90deg, rgba(59,130,246,0.95), rgba(45,212,191,0.95))",
        }}
      />

      {/* هدر کارت */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          gap: 8,
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "999px",
              background: accent,
              boxShadow: `0 0 0 5px ${accent}22`,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            {title}
          </span>
        </div>

        <span
          style={{
            fontSize: 11,
            color: "#9ca3af",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          LIVE • NAVASAN
        </span>
      </div>

      {/* نوار اسکرولی آیتم‌ها */}
      <div className="strip-outer">
        {!items || !items.length ? (
          <span className="loading">در حال دریافت…</span>
        ) : (
          <div className="ticker-track">
  {items.concat(items).map((it, idx) => (
    <span className="pill" key={idx}>
      {/* اسم ارز / کالا → سمت راست */}
      <span className="pill-label">{it.label}</span>

      {/* نقطه جداکننده */}
      <span className="pill-sep">•</span>

      {/* عدد ریالی → سمت چپ */}
      <span className="pill-value">
  {formatRial(it.value)} <span className="pill-currency">ریال</span>
</span>

    </span>
  ))}
</div>
        )}
      </div>

      <style jsx>{`
        /* جهت اسکرول: محتوا از راست می‌آید به چپ می‌رود،
           ولی چون container لِفت‌تو-رایت است، جابه‌جایی نرم می‌شود */
        .strip-outer {
  direction: ltr;         /* مسیر حرکت نوار */
  overflow: hidden;
  height: 46px;
  display: flex;
  align-items: center;
}

.ticker-track {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding-inline-start: 10px;
  animation: ticker-scroll 25s linear infinite;
  will-change: transform;
}

/* خود قرص‌ها راست‌به‌چپ باشند */
.pill {
  direction: rtl;         /* خیلی مهم: باعث می‌شود label راست باشد، عدد چپ */
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.55);
  font-size: 12px;
  white-space: nowrap;
}

.pill-label {
  color: #111827;
  font-weight: 600;
}

.pill-sep {
  color: #9ca3af;
  font-size: 11px;
}

.pill-value {
  font-weight: 700;
  color: #111827;
}

.pill-currency {
  font-weight: 500;
  margin-right: 4px;
  color: #6b7280;
}


        /* حرکت از چپ به راست */
@keyframes ticker-scroll {
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

export default function TgjuTickersBlock() {
  const { data } = useSWR("/api/rates", fetcher, { refreshInterval: 60_000 });
  const items = data?.items || {};

  const labels = {
    bahar: "سکه بهار",
    nim: "نیم سکه",
    rob: "ربع سکه",
    "18ayar": "طلای ۱۸ عیار",
    usd: "دلار آمریکا",
    eur: "یورو",
    rub: "روبل روسیه",
    aed: "درهم امارات",
    btc: "بیت‌کوین",
    eth: "اتریوم",
    usdt: "تتر",
  };

  const makeList = (keys) =>
    keys
      .map((k) =>
        items[k]
          ? {
              label: labels[k] || k,
              value: items[k].value,
            }
          : null
      )
      .filter(Boolean);

  return (
    <section style={{ margin: "4px 0 22px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: 14,
        }}
      >
        <TickerCard
          title="بازار طلا"
          accent="#f59e0b"
          items={makeList(["rob", "nim", "bahar", "18ayar"])}
        />

        <TickerCard
          title="قیمت ارز"
          accent="#3b82f6"
          items={makeList(["usd", "eur", "rub", "aed"])}
        />

        <TickerCard
          title="ارزهای دیجیتال"
          accent="#10b981"
          items={makeList(["btc", "eth", "usdt"])}
        />
      </div>
    </section>
  );
}
