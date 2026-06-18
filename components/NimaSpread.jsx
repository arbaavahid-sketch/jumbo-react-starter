import useSWR from "swr";

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

// Free-market USD (Navasan `usd`) vs the Exchange Center / NIMA rate
// (`mex_usd_sell`). Spread = (free - nima) / nima * 100.
export default function NimaSpread() {
  const { data } = useSWR("/api/rates", fetcher, {
    revalidateOnFocus: false,
    // Navasan's free plan is only 120 calls/month, so poll conservatively.
    refreshInterval: 30 * 60 * 1000,
  });

  const items = data?.items || {};
  let free = toNum(items?.usd?.value);
  let nima = toNum(items?.mex_usd_sell?.value);

  // Navasan returns some items in Toman and others in Rial. Both are a USD
  // price, so their real gap is always well under ~1.5x — a ~10x gap means a
  // unit mismatch. Scale the smaller one up by 10 until they match magnitude.
  if (Number.isFinite(free) && Number.isFinite(nima) && free > 0 && nima > 0) {
    while (free / nima >= 3) nima *= 10;
    while (nima / free >= 3) free *= 10;
  }

  const hasData = Number.isFinite(free) && Number.isFinite(nima) && nima > 0;
  const spread = hasData ? ((free - nima) / nima) * 100 : NaN;

  // Color by magnitude: small gap is calm, large gap is a warning.
  const accent = !hasData
    ? "#94a3b8"
    : spread >= 20
      ? "#ef4444"
      : spread >= 10
        ? "#f59e0b"
        : "#22c55e";

  return (
    <div dir="rtl" style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...dot, background: accent }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#e5e7eb" }}>
            اختلاف نرخ دلار بازار آزاد با مرکز مبادله (نیما)
          </span>
        </div>
        <span style={{ fontSize: 10, color: "rgba(229,231,235,0.6)" }}>LIVE • Navasan</span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: accent, fontVariantNumeric: "tabular-nums" }}>
          {hasData ? `${spread.toFixed(1)}٪` : "—"}
        </div>
        <div style={{ fontSize: 12, color: "#cbd5e1", display: "flex", gap: 14, flexWrap: "wrap" }}>
          <span>
            بازار آزاد: <b style={{ color: "#fff" }}>{fmt(free)}</b>
          </span>
          <span>
            نیما: <b style={{ color: "#fff" }}>{fmt(nima)}</b>
          </span>
        </div>
      </div>
    </div>
  );
}

const card = {
  borderRadius: 16,
  padding: "12px 14px",
  background: "linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,64,175,0.96))",
  boxShadow: "0 18px 45px rgba(15,23,42,0.78), 0 0 0 1px rgba(148,163,184,0.45)",
  color: "#e5e7eb",
};

const dot = {
  width: 9,
  height: 9,
  borderRadius: 999,
  display: "inline-block",
  boxShadow: "0 0 0 3px rgba(148,163,184,0.35)",
};
