// components/CeoMessage.js
import Image from "next/image";

export default function CeoMessage({ text }) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 22,
        padding: "18px 22px",
        boxShadow:
          "0 24px 60px rgba(15,23,42,0.10), 0 0 0 1px rgba(148,163,184,0.25)",
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
      }}
    >
      {/* آواتار مدیر */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "999px",
          overflow: "hidden",
          flexShrink: 0,
          boxShadow: "0 0 0 3px rgba(148,163,184,0.5)",
          background: "#e5e7eb",
        }}
      >
        <Image
          src="/ceo.png" // یا هر عکسی که گذاشتی
          alt="CEO"
          width={72}
          height={72}
          style={{ objectFit: "cover" }}
        />
      </div>

      {/* متن پیام */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#6b7280",
            marginBottom: 6,
          }}
        >
          CEO MESSAGE
        </div>

        <div
          style={{
            fontSize: 15,        // بزرگ‌تر برای TV
            lineHeight: 1.9,     // فاصله خطوط بیشتر
            color: "#111827",
          }}
        >
          {text || "No message yet."}
        </div>
      </div>
    </div>
  );
}
