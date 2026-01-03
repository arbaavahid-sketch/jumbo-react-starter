// pages/index.js
import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        fontFamily: "system-ui",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top left, #e0f2fe, #f9fafb 55%, #e5e7eb)",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          width: "100%",
          padding: 32,
          borderRadius: 32,
          background: "rgba(255,255,255,0.9)",
          boxShadow:
            "0 25px 60px rgba(15,23,42,0.18), 0 0 0 1px rgba(148,163,184,0.5)",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>Group Dashboard Portal</h1>
        <p style={{ marginTop: 0, marginBottom: 24, fontSize: 14 }}></p>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          }}
        >
          <Link href="/admin" style={{ textDecoration: "none" }}>
            <div
              style={{
                padding: 14,
                borderRadius: 18,
                background: "linear-gradient(135deg,#0f172a,#1e293b,#020617)",
                color: "#e5e7eb",
                boxShadow:
                  "0 16px 40px rgba(15,23,42,0.7), 0 0 0 1px rgba(15,23,42,0.9)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Admin Panel</div>
              <div style={{ fontSize: 13, opacity: 0.8 }}></div>
            </div>
          </Link>

          <Link href="/technical" style={{ textDecoration: "none" }}>
            <div
              style={{
                padding: 14,
                borderRadius: 18,
                background: "linear-gradient(135deg,#0369a1,#0ea5e9,#e0f2fe)",
                color: "#0f172a",
                boxShadow:
                  "0 16px 40px rgba(15,23,42,0.4), 0 0 0 1px rgba(56,189,248,0.6)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                Technical Dashboard
              </div>
              <div style={{ fontSize: 13, opacity: 0.8 }}></div>
            </div>
          </Link>

          <Link href="/admin/messages" style={{ textDecoration: "none" }}>
            <div
              style={{
                padding: 14,
                borderRadius: 18,
                background: "linear-gradient(135deg,#6b21a8,#9333ea,#e9d5ff)",
                color: "#f9fafb",
                boxShadow:
                  "0 16px 40px rgba(88,28,135,0.6), 0 0 0 1px rgba(147,51,234,0.7)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>CEO Messages</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}></div>
            </div>
          </Link>

          {/* ✅ کارت جدید: Weekly History (هم‌استایل بقیه) */}
          <Link href="/admin/weekly-history" style={{ textDecoration: "none" }}>
            <div
              style={{
                padding: 14,
                borderRadius: 18,
                background: "linear-gradient(135deg,#10b981,#34d399,#ecfeff)",
                color: "#022c22",
                boxShadow:
                  "0 16px 40px rgba(16,185,129,0.35), 0 0 0 1px rgba(52,211,153,0.7)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                📊 Weekly History
              </div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                
              </div>
            </div>
          </Link>

          <Link href="/group/1" style={{ textDecoration: "none" }}>
            <div
              style={{
                padding: 14,
                borderRadius: 18,
                background: "linear-gradient(135deg,#16a34a,#4ade80,#dcfce7)",
                color: "#022c22",
                boxShadow:
                  "0 16px 40px rgba(22,163,74,0.4), 0 0 0 1px rgba(74,222,128,0.7)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                Group A Dashboard
              </div>
              <div style={{ fontSize: 13, opacity: 0.9 }}></div>
            </div>
          </Link>

          <Link href="/group/2" style={{ textDecoration: "none" }}>
            <div
              style={{
                padding: 14,
                borderRadius: 18,
                background: "linear-gradient(135deg,#f97316,#fdba74,#fff7ed)",
                color: "#451a03",
                boxShadow:
                  "0 16px 40px rgba(234,88,12,0.4), 0 0 0 1px rgba(249,115,22,0.7)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                Group B Dashboard
              </div>
              <div style={{ fontSize: 13, opacity: 0.9 }}></div>
            </div>
          </Link>

          <Link href="/group/3" style={{ textDecoration: "none" }}>
            <div
              style={{
                padding: 14,
                borderRadius: 18,
                background: "linear-gradient(135deg,#0ea5e9,#38bdf8,#e0f2fe)",
                color: "#0f172a",
                boxShadow:
                  "0 16px 40px rgba(14,165,233,0.4), 0 0 0 1px rgba(56,189,248,0.7)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                Group C Dashboard
              </div>
              <div style={{ fontSize: 13, opacity: 0.9 }}></div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
