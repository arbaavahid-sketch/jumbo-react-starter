// components/TgjuTickersBlock.js
import Script from "next/script";

function TickerCard({ title, children, accent = "#1d4ed8" }) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 16,
        padding: "10px 12px 12px",
        background:
          "radial-gradient(circle at top left, rgba(37,99,235,0.06), #f9fafb)",
        boxShadow:
          "0 14px 32px rgba(15,23,42,0.10), 0 0 0 1px rgba(148,163,184,0.18)",
        overflow: "hidden",
      }}
    >
      {/* نوار رنگی باریک بالا */}
      <div
        style={{
          position: "absolute",
          insetInline: 0,
          top: 0,
          height: 3,
          background:
            "linear-gradient(90deg, rgba(59,130,246,0.9), rgba(14,165,233,0.9))",
        }}
      />

      {/* هدر کارت */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
          gap: 8,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "999px",
              background: accent,
              boxShadow: `0 0 0 4px ${accent}22`,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            {title}
          </span>
        </div>

        <span
          style={{
            fontSize: 10,
            color: "#9ca3af",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Live • TGJU
        </span>
      </div>

      {/* خود ویجت TGJU – کمی کوچک شده و کلیپ شده */}
      <div
        style={{
          direction: "ltr",
          overflow: "hidden",
          height: 32,
        }}
      >
        <div
          style={{
            transform: "scale(0.88)",
            transformOrigin: "left center",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default function TgjuTickersBlock() {
  return (
    <section style={{ margin: "4px 0 22px" }}>
      {/* اسکریپت رسمی TGJU – یک بار لود می‌شود */}
      <Script src="https://api.tgju.org/v1/widget/v2" strategy="lazyOnload" />

      {/* گرید کارت‌ها */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
          gap: 12,
        }}
      >
        {/* بازار طلا */}
        <TickerCard title="بازار طلا" accent="#f59e0b">
          <tgju
            type="ticker-tap"
            items="137119,137123,137120,137121,137122"
            columns="dot"
            speed="48"
            token="webservice"
          ></tgju>
        </TickerCard>

        {/* قیمت ارز */}
        <TickerCard title="قیمت ارز" accent="#3b82f6">
          <tgju
            type="ticker-tap"
            items="137225,137207,137221,137222,137218"
            columns="dot"
            speed="48"
            token="webservice"
          ></tgju>
        </TickerCard>

        {/* ارزهای دیجیتال */}
        <TickerCard title="ارزهای دیجیتال" accent="#10b981">
          <tgju
            type="ticker-tap"
            items="398097,398096,535605,398115,398102"
            columns="dot"
            speed="48"
            token="webservice"
          ></tgju>
        </TickerCard>

        {/* قیمت ارزهای نیما */}
        <TickerCard title="قیمت ارزهای نیما" accent="#ec4899">
          <tgju
            type="ticker-tap"
            items="523797,523761,523801,523799,523815"
            columns="dot"
            speed="48"
            token="webservice"
          ></tgju>
        </TickerCard>

      </div>
    </section>
  );
}
