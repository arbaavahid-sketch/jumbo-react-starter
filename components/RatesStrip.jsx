import { useEffect } from "react";
import useSWR from "swr";

const TGJU_SCRIPT_ID = "tgju-widget-script";
const TGJU_ITEMS =
  "398096,398110,137139,137140,137121,137137,523798,523796,137203,137205,137206,137214";

const fetcher = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const toNum = (value) => {
  const numeric = Number(
    String(value ?? "")
      .replace(/,/g, "")
      .trim(),
  );
  return Number.isFinite(numeric) ? numeric : NaN;
};

const matchScale = (free, official) => {
  let f = free;
  let o = official;
  if (f > 0 && o > 0) {
    while (f / o >= 3) o *= 10;
    while (o / f >= 3) f *= 10;
  }
  return [f, o];
};

const calcSpread = (free, official) => {
  const [f, o] = matchScale(free, official);
  return f > 0 && o > 0 ? ((f - o) / o) * 100 : NaN;
};

const spreadTone = (spread) => {
  if (!Number.isFinite(spread)) return spreadMuted;
  if (spread >= 20) return spreadDanger;
  if (spread >= 10) return spreadWarn;
  return spreadGood;
};

export default function RatesStrip() {
  const { data: tgjuData } = useSWR("/api/tgju-rates", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 15 * 60 * 1000,
  });
  const { data: nimaData } = useSWR("/api/nima", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    if (!document.getElementById(TGJU_SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = TGJU_SCRIPT_ID;
      script.src = "https://api.tgju.org/v1/widget/v2";
      script.defer = true;
      document.body.appendChild(script);
    }

    const interval = window.setInterval(() => {
      document.querySelectorAll("*").forEach((el) => {
        if (el.textContent?.trim() === "By TGJU") {
          el.style.display = "none";
        }
      });
    }, 500);

    return () => window.clearInterval(interval);
  }, []);

  const tgjuRates = tgjuData?.rates || {};
  const nimaRates = nimaData?.rates || {};
  const spreads = [
    {
      label: "اختلاف دلار با حواله فروش",
      value: calcSpread(toNum(tgjuRates.usd?.value), toNum(nimaRates.usd)),
    },
    {
      label: "اختلاف یورو با حواله فروش",
      value: calcSpread(toNum(tgjuRates.eur?.value), toNum(nimaRates.eur)),
    },
  ];

  return (
    <div className="fxwrap" dir="ltr">
      <span className="fxtag">نرخ ارز • LIVE TGJU</span>
      <div className="spreadbar" dir="rtl">
        {spreads.map((item) => (
          <span key={item.label} className="spread" style={spreadTone(item.value)}>
            {item.label}: {Number.isFinite(item.value) ? `${item.value.toFixed(1)}٪` : "—"}
          </span>
        ))}
      </div>
      <div className="fxbar">
        <tgju
          type="ticker-tap"
          items={TGJU_ITEMS}
          columns="dot"
          speed="95"
          token="webservice"
        ></tgju>
      </div>

      <style jsx>{`
        .fxwrap {
          display: flex;
          align-items: stretch;
          gap: 12px;
          border-radius: 14px;
          padding: 4px 12px;
          font-family: "Vazirmatn", system-ui, sans-serif;
          background: #ffffff;
          box-shadow:
            0 10px 30px rgba(15, 23, 42, 0.1),
            0 0 0 1px rgba(148, 163, 184, 0.35);
          border-top: 3px solid #3b82f6;
          color: #0f172a;
          overflow: hidden;
        }
        .fxtag {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          font-size: 12px;
          font-weight: 800;
          color: #64748b;
          white-space: nowrap;
          padding-right: 12px;
          border-right: 1px solid rgba(148, 163, 184, 0.4);
        }
        .spreadbar {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .spread {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          border-radius: 999px;
          padding: 3px 10px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
          border: 1px solid transparent;
        }
        .fxbar {
          flex: 1 1 auto;
          min-width: 180px;
          min-height: 42px;
          overflow: hidden;
          position: relative;
          direction: ltr;
          display: flex;
          align-items: center;
        }
        @media (max-width: 760px) {
          .fxwrap {
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
            padding: 7px 10px;
          }
          .fxtag {
            font-size: 11px;
            min-height: 28px;
            padding-right: 8px;
          }
          .spreadbar {
            flex: 1 1 160px;
            flex-wrap: nowrap;
            overflow-x: auto;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }
          .spreadbar::-webkit-scrollbar {
            display: none;
          }
          .spread {
            min-height: 26px;
            padding: 3px 8px;
            font-size: 11px;
          }
          .fxbar {
            flex: 1 0 100%;
            width: 100%;
            min-width: 100%;
            min-height: 44px;
            order: 3;
          }
        }
      `}</style>
      <style jsx global>{`
        .fxbar tgju {
          width: 100%;
          display: block;
        }
      `}</style>
    </div>
  );
}

const spreadMuted = {
  background: "#f1f5f9",
  color: "#64748b",
  borderColor: "#e2e8f0",
};

const spreadGood = {
  background: "#dcfce7",
  color: "#166534",
  borderColor: "#bbf7d0",
};

const spreadWarn = {
  background: "#fef3c7",
  color: "#92400e",
  borderColor: "#fde68a",
};

const spreadDanger = {
  background: "#fee2e2",
  color: "#991b1b",
  borderColor: "#fecaca",
};
