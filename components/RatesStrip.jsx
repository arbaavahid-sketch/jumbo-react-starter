import { useEffect, useState } from "react";
import useSWR from "swr";

// TGJU widget item IDs (free-market group and NIMA/transfer group).
// We render these hidden in the browser — where TGJU works — and read the
// rendered numbers to get the exact NIMA (تالار دوم) rate, then compute the gap.
const TGJU_NIMA_ITEMS = "398097,398096,535605,398115,398102"; // nima: usd, eur, ...

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const normDigits = (s) =>
  String(s || "")
    .replace(/[۰-۹]/g, (d) => PERSIAN_DIGITS.indexOf(d))
    .replace(/[٬،]/g, ",");

// Pull the USD/EUR numbers out of a rendered TGJU ticker's text.
const parseTgju = (text) => {
  const t = normDigits(text);
  const out = {};
  const usd = t.match(/دلار[^\d]{0,15}?([\d,]{5,})/); // first "دلار ... number" = US dollar
  const eur = t.match(/یورو[^\d]{0,15}?([\d,]{5,})/);
  if (usd) out.usd = Number(usd[1].replace(/,/g, ""));
  if (eur) out.eur = Number(eur[1].replace(/,/g, ""));
  return out;
};

const fetcher = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

const toNum = (v) => {
  if (v == null) return NaN;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
};

const fmt = (n) =>
  Number.isFinite(n) ? new Intl.NumberFormat("fa-IR").format(Math.round(n)) : "—";

// Navasan returns most items in Toman; show everything in Rial (×10).
const rial = (toman) => (Number.isFinite(toman) ? toman * 10 : NaN);

// Bring the NIMA value to the free-market scale (mex_* is Rial, free is Toman →
// a ~10x gap is a unit mismatch; the real spread is always well under 1.5x).
const matchScale = (free, nima) => {
  let f = free;
  let n = nima;
  if (f > 0 && n > 0) {
    while (n / f >= 3) n /= 10;
    while (f / n >= 3) n *= 10;
  }
  return [f, n];
};

const ITEMS = [
  { label: "دلار", key: "usd", nimaKey: "mex_usd_sell" },
  { label: "یورو", key: "eur", nimaKey: "mex_eur_sell" },
  { label: "روبل", key: "rub" },
  { label: "درهم", key: "aed" },
  { label: "طلای ۱۸", key: "18ayar" },
  { label: "بیت‌کوین", key: "btc" },
  { label: "تتر", key: "usdt" },
];

export default function RatesStrip() {
  const { data } = useSWR("/api/rates", fetcher, {
    revalidateOnFocus: false,
    // Navasan free plan is only 120 calls/month, so poll conservatively.
    refreshInterval: 30 * 60 * 1000,
  });

  // Second-hall ("تالار دوم") rates entered in the sheet (ice.ir values).
  const { data: nimaData } = useSWR("/api/nima", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 30 * 60 * 1000,
  });

  const items = data?.items || {};
  const nimaRates = nimaData?.rates || {};

  // NIMA rates read live from a hidden TGJU widget in the browser.
  const [tgjuNima, setTgjuNima] = useState({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!document.querySelector('script[data-tgju="widget"]')) {
      const s = document.createElement("script");
      s.src = "https://api.tgju.org/v1/widget/v2";
      s.defer = true;
      s.dataset.tgju = "widget";
      document.body.appendChild(s);
    }

    const read = () => {
      const box = document.getElementById("tgju-nima-hidden");
      const text = box ? box.innerText || box.textContent || "" : "(no box)";
      const parsed = parseTgju(text);
      // eslint-disable-next-line no-console
      console.log("[NimaWidget] len=", text.length, "text=", text.slice(0, 400), "parsed=", parsed);
      if (Number.isFinite(parsed.usd) || Number.isFinite(parsed.eur)) {
        setTgjuNima((prev) => ({ ...prev, ...parsed }));
      }
    };

    const timer = setInterval(read, 2000);
    return () => clearInterval(timer);
  }, []);

  const segData = ITEMS.map((it) => {
    const val = toNum(items?.[it.key]?.value);
    const chg = toNum(items?.[it.key]?.change);
    const pct = Number.isFinite(chg) && val > 0 ? (chg / val) * 100 : NaN;

    let spread = NaN;
    if (it.nimaKey) {
      // Priority for the NIMA rate: live TGJU widget → sheet → Navasan center.
      // matchScale handles Rial vs Toman either way.
      const widgetNima = tgjuNima[it.key];
      const sheetNima = nimaRates[it.key];
      const rawNima =
        Number.isFinite(widgetNima) && widgetNima > 0
          ? widgetNima
          : Number.isFinite(sheetNima) && sheetNima > 0
            ? sheetNima
            : toNum(items?.[it.nimaKey]?.value);
      const [f, n] = matchScale(val, rawNima);
      if (f > 0 && n > 0) spread = ((f - n) / n) * 100;
    }

    return { label: it.label, valRial: rial(val), pct, spread };
  });

  const renderSeg = (d, i) => {
    const up = d.pct > 0;
    const down = d.pct < 0;
    const chgColor = up ? "#0a7f2e" : down ? "#c92a2a" : "#64748b";
    const arrow = up ? "▲" : down ? "▼" : "•";
    return (
      <span className="seg" key={i}>
        <span className="dot" />
        <b className="lbl">{d.label}</b>
        <span className="val">{fmt(d.valRial)}</span>
        {Number.isFinite(d.pct) && (
          <span className="chg" style={{ color: chgColor }}>
            {arrow} {Math.abs(d.pct).toFixed(2)}٪
          </span>
        )}
        {Number.isFinite(d.spread) && (
          <span
            className="badge"
            style={{
              background: d.spread >= 20 ? "#fee2e2" : d.spread >= 10 ? "#fef3c7" : "#dcfce7",
              color: d.spread >= 20 ? "#991b1b" : d.spread >= 10 ? "#92400e" : "#166534",
            }}
          >
            اختلاف نیما {d.spread.toFixed(1)}٪
          </span>
        )}
      </span>
    );
  };

  const loop = [...segData, ...segData];

  return (
    <div className="fxwrap" dir="ltr">
      <span className="fxtag">نرخ ارز • LIVE Navasan</span>
      <div className="fxbar">
        <div className="fxtrack">{loop.map(renderSeg)}</div>
      </div>

      {/* Hidden TGJU widget — rendered off-screen so we can read the live NIMA
          rate from the browser (where TGJU works) and compute the real gap. */}
      <div
        aria-hidden
        style={{ position: "absolute", left: -99999, top: 0, width: 600, height: 60 }}
        id="tgju-nima-hidden"
        dangerouslySetInnerHTML={{
          __html: `<tgju type="ticker-tap" items="${TGJU_NIMA_ITEMS}" columns="dot" speed="35" token="webservice"></tgju>`,
        }}
      />

      <style jsx>{`
        .fxwrap {
          display: flex;
          align-items: stretch;
          gap: 12px;
          border-radius: 14px;
          padding: 4px 12px;
          font-family: "Vazirmatn", system-ui, sans-serif;
          background: #ffffff;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(148, 163, 184, 0.35);
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
        .fxbar {
          flex: 1 1 auto;
          overflow: hidden;
          position: relative;
          direction: ltr;
        }
        .fxtrack {
          display: flex;
          align-items: center;
          gap: 34px;
          width: max-content;
          padding: 10px 0;
          /* مدت‌زمان = سرعت اسکرول؛ عددِ کمتر سریع‌تر، عددِ بیشتر کندتر */
          animation: fxscroll 35s linear infinite;
          will-change: transform;
        }
        .fxwrap:hover .fxtrack {
          animation-play-state: paused;
        }
        @keyframes fxscroll {
          from {
            transform: translateX(-50%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
      <style jsx global>{`
        .fxtrack .seg {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          white-space: nowrap;
        }
        .fxtrack .seg .dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #f59e0b;
          flex: 0 0 auto;
        }
        .fxtrack .seg .lbl {
          color: #0f172a;
          font-weight: 900;
          font-size: 15px;
        }
        .fxtrack .seg .val {
          color: #0f172a;
          font-weight: 800;
          font-size: 15px;
          font-variant-numeric: tabular-nums;
        }
        .fxtrack .seg .chg {
          font-weight: 800;
          font-size: 13px;
        }
        .fxtrack .seg .badge {
          font-weight: 900;
          font-size: 12px;
          border-radius: 999px;
          padding: 2px 10px;
        }
      `}</style>
    </div>
  );
}
