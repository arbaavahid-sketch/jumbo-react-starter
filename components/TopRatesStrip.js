// components/TopRatesStrip.js
import { useEffect } from "react";

const WIDGETS = [
  {
    id: "gold",
    title: "بازار طلا",
    color: "#fbbf24",
    items: "137119,137123,137120,137121,137122",
  },
  {
    id: "fx",
    title: "قیمت ارز",
    color: "#3b82f6",
    items: "137225,137207,137221,137222,137218",
  },
  {
    id: "nima",
    title: "قیمت ارزهای نیما",
    color: "#22c55e",
    items: "398097,398096,535605,398115,398102",
  },
  {
    id: "crypto",
    title: "ارزهای دیجیتال",
    color: "#a855f7",
    items: "523797,523761,523801,523799,523815",
  },

  // 🆕 تازه اضافه‌شده
  {
    id: "oil_energy",
    title: "بازار نفت و انرژی",
    color: "#fb7185",
    items: "398096,398097,535605,398115,398102",
  },
  {
    id: "seke",
    title: "بازار سکه",
    color: "#f59e0b",
    items: "398096,398097,535605,398115,398102",
  },
];

export default function TopRatesStrip() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // جلوگیری از بارگذاری چندباره اسکریپت TGJU
    if (!document.querySelector('script[data-tgju="widget"]')) {
      const s = document.createElement("script");
      s.src = "https://api.tgju.org/v1/widget/v2";
      s.defer = true;
      s.dataset.tgju = "widget";
      document.body.appendChild(s);
    }
  }, []);

  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {WIDGETS.map((w) => (
          <div
            key={w.id}
            style={{
              flex: "1 1 250px",
              borderRadius: 16,
              padding: 10,
              background:
                "linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,64,175,0.96))",
              boxShadow:
                "0 18px 45px rgba(15,23,42,0.78), 0 0 0 1px rgba(148,163,184,0.45)",
              color: "#e5e7eb",
              minWidth: 0,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
                fontSize: 11,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: w.color,
                    boxShadow: "0 0 0 3px rgba(148,163,184,0.45)",
                  }}
                />
                <span style={{ fontWeight: 600 }}>{w.title}</span>
              </div>
              <div style={{ opacity: 0.7 }}>LIVE • TGJU</div>
            </div>

            {/* Widget */}
            <div
              style={{
                borderRadius: 10,
                overflow: "hidden",
                background: "rgba(15,23,42,0.9)",
                height: 40,
              }}
              dangerouslySetInnerHTML={{
                __html: `<tgju type="ticker-tap" items="${w.items}" columns="dot" speed="45" token="webservice"></tgju>`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
