// components/TgjuTickersBlock.js
import { useEffect } from "react";

export default function TgjuTickersBlock() {
  useEffect(() => {
    const scriptId = "tgju-widget-script";

    // اسکریپت TGJU فقط یک‌بار لود شود
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://api.tgju.org/v1/widget/v2";
      script.defer = true;
      document.body.appendChild(script);
    }

    // حذف متن "By TGJU"
    const interval = setInterval(() => {
      document.querySelectorAll("*").forEach((el) => {
        if (el.innerText?.trim() === "By TGJU") {
          el.style.display = "none";
        }
      });
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <section style={{ margin: "6px 0 18px" }}>
      <div
        style={{
          position: "relative",
          borderRadius: 18,
          padding: "8px 14px 6px",
          background:
            "radial-gradient(circle at top left, rgba(37,99,235,0.06), #f9fafb)",
          boxShadow:
            "0 18px 40px rgba(15,23,42,0.10), 0 0 0 1px rgba(148,163,184,0.16)",
          overflow: "hidden",
          // اگر می‌خوای کل ردیف رو بگیره، این خط رو بردار:
          // maxWidth: 1000,
          // margin: "0 auto",
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
            marginBottom: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "#3b82f6",
                boxShadow: "0 0 0 5px #3b82f622",
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
            </span>
          </div>

          <span
            style={{
              fontSize: 11,
              color: "#9ca3af",
              letterSpacing: "0.16em",
              whiteSpace: "nowrap",
            }}
          >
            LIVE • TGJU
          </span>
        </div>

        {/* ویجت TGJU */}
        <div className="tgju-wrapper">
          <tgju
            type="ticker-tap"
            items="398096,398110,137139,137140,137121,137137,523798,523796,137203,137205,137206,137214"
            columns="dot"
            speed="55"
            token="webservice"
          ></tgju>
        </div>

        <style jsx>{`
          .tgju-wrapper {
            width: 100%;
            overflow: hidden;
          }
        `}</style>
      </div>
    </section>
  );
}
