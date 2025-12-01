// pages/admin/messages.js — پنل مدیریت پیام‌ها برای گروه‌ها + Technical

import { useState, useEffect } from "react";
import useSWR from "swr";

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  });

// پیکربندی کارت‌ها
const GROUPS = [
  { key: "A", title: "Group A" },
  { key: "B", title: "Group B" },
  { key: "C", title: "Group C" },
  {
    key: "TECH",
    title: "Technical Dashboard",
    tag: "TECH",
  },
];

export default function AdminMessages() {
  const { data, error, isLoading, mutate } = useSWR("/api/data", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });

  const messages = data?.ceo_messages || {};

  // ❗ استیت لوکال برای متن هر کارت
  const [localMessages, setLocalMessages] = useState({});

  // وقتی دیتا از سرور می‌آید، استیت لوکال را سینک کن
  useEffect(() => {
    const initial = {};
    Object.entries(messages).forEach(([k, v]) => {
      initial[k] = v || "";
    });
    // اگر ردیف TECH در شیت هست ولی خالیه
    if (!initial.TECH) initial.TECH = "";
    setLocalMessages(initial);
  }, [messages]);

  if (error)
    return (
      <div style={{ padding: 24, color: "#b91c1c" }}>
        Error: {String(error.message || "load failed")}
      </div>
    );
  if (isLoading || !data) return <div style={{ padding: 24 }}>Loading…</div>;

  // پیام فعلی برای نمایش
  const getCurrentMessage = (key) => {
    if (key === "TECH") {
      // اول از استیت لوکال بخوان
      if (localMessages.TECH !== undefined) return localMessages.TECH;
      // فالس‌ بک روی داده‌ی خام
      return (
        messages.TECH ||
        messages.TECHNICAL ||
        messages.Technical ||
        ""
      );
    }
    return localMessages[key] ?? messages[key] ?? "";
  };

  // ذخیره روی وبهوک
  const saveMessage = async (groupKey) => {
    const value = getCurrentMessage(groupKey);

    // گروهی که برای Apps Script می‌فرستیم
    const groupToSend = groupKey; // چون تو شیت دقیقا "TECH" نوشته‌ای

    await fetch("/api/ceo-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group: groupToSend, message: value }),
    });

    // بعد از ذخیره، داده‌ها را از سرور رفرش کن
    mutate();
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 24px 60px",
        display: "flex",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, #eef2ff 0, #f9fafb 35%, #e5e7eb 80%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1200 }}>
        <header style={{ marginBottom: 32 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 800,
              color: "#020617",
            }}
          >
            CEO Messages – Admin Panel
          </h1>
          <p
            style={{
              marginTop: 8,
              maxWidth: 720,
              fontSize: 14,
              color: "#4b5563",
              lineHeight: 1.7,
            }}
          ></p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
          }}
        >
          {GROUPS.map((g) => {
            const current = getCurrentMessage(g.key);
            return (
              <article
                key={g.key}
                style={{
                  position: "relative",
                  borderRadius: 28,
                  padding: 20,
                  background:
                    "radial-gradient(circle at top left, #1e293b, #020617)",
                  boxShadow:
                    "0 30px 80px rgba(15,23,42,0.9), 0 0 0 1px rgba(148,163,184,0.5)",
                  color: "#e5e7eb",
                  overflow: "hidden",
                }}
              >
                {/* هاله روشن */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(circle at top right, rgba(96,165,250,0.45), transparent 55%)",
                    opacity: 0.9,
                    pointerEvents: "none",
                  }}
                />

                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {g.title}
                    </div>
                    {g.tag && (
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 11,
                          opacity: 0.8,
                        }}
                      >
                        {g.tag}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      border: "1px solid rgba(148,163,184,0.9)",
                      background: "rgba(15,23,42,0.75)",
                    }}
                  >
                    CEO message
                  </span>
                </div>

                {/* textarea پیام */}
                <textarea
                  value={current}
                  onChange={(e) =>
                    setLocalMessages((prev) => ({
                      ...prev,
                      [g.key]: e.target.value,
                    }))
                  }
                  placeholder="پیام مدیریت برای این بخش…"
                  style={{
                    position: "relative",
                    width: "100%",
                    minHeight: 150,
                    borderRadius: 18,
                    border: "1px solid rgba(30,64,175,0.9)",
                    background:
                      "radial-gradient(circle at top left, #020617, #020617)",
                    color: "#e5e7eb",
                    padding: 12,
                    fontSize: 14,
                    resize: "vertical",
                    outline: "none",
                    boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.9)",
                  }}
                />

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    opacity: 0.8,
                    position: "relative",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>بعد از ویرایش، روی دکمه Save بزن.</span>

                  <button
                    type="button"
                    onClick={() => saveMessage(g.key)}
                    style={{
                      padding: "4px 14px",
                      borderRadius: 999,
                      border: "1px solid rgba(96,165,250,0.9)",
                      background:
                        "linear-gradient(135deg,rgba(59,130,246,0.9),rgba(56,189,248,0.9))",
                      color: "#f9fafb",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Save
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
