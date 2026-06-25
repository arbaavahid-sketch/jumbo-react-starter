// pages/admin/messages.js
import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";

const fetcher = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

const GROUPS = [
  { key: "A", title: "Group A" },
  { key: "B", title: "Group B" },
  { key: "C", title: "Group C" },
  { key: "SUPPLY", title: "Supply Dashboard", tag: "SUPPLY" },
  { key: "TECH", title: "Technical Dashboard", tag: "TECH" },
];

const serverMessageFor = (messages, key) => {
  if (key === "SUPPLY") {
    return messages.SUPPLY || messages.Supply || "";
  }
  if (key === "TECH") {
    return messages.TECH || messages.TECHNICAL || messages.Technical || "";
  }
  return messages[key] || "";
};

export default function AdminMessages() {
  const { data, error, isLoading, mutate } = useSWR("/api/data", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });

  const messages = data?.ceo_messages || {};
  const [localMessages, setLocalMessages] = useState({});
  const [touched, setTouched] = useState({});
  const [saveState, setSaveState] = useState({});

  useEffect(() => {
    setLocalMessages((prev) => {
      const next = { ...prev };
      for (const group of GROUPS) {
        if (touched[group.key]) continue;
        next[group.key] = serverMessageFor(messages, group.key);
      }
      return next;
    });
  }, [messages, touched]);

  if (error) {
    return (
      <div style={{ padding: 24, color: "#b91c1c" }}>Error: {String(error.message || error)}</div>
    );
  }

  if (isLoading || !data) return <div style={{ padding: 24 }}>Loading...</div>;

  const getCurrentMessage = (key) =>
    localMessages[key] !== undefined ? localMessages[key] : serverMessageFor(messages, key);

  const changeMessage = (key, value) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setSaveState((prev) => ({
      ...prev,
      [key]: { status: "dirty", message: "Unsaved changes" },
    }));
    setLocalMessages((prev) => ({ ...prev, [key]: value }));
  };

  const saveMessage = async (groupKey) => {
    const value = getCurrentMessage(groupKey);

    setSaveState((prev) => ({
      ...prev,
      [groupKey]: { status: "saving", message: "Saving..." },
    }));

    try {
      const res = await fetch("/api/ceo-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        redirect: "manual",
        body: JSON.stringify({ group: groupKey, message: value }),
      });

      const contentType = res.headers.get("content-type") || "";
      let body = null;
      if (contentType.includes("application/json")) {
        try {
          body = await res.json();
        } catch {
          body = null;
        }
      }

      if (!res.ok) {
        throw new Error(body?.error || body?.message || `Save failed (${res.status})`);
      }

      if (!contentType.includes("application/json")) {
        throw new Error("Session expired. Please log in again.");
      }

      setTouched((prev) => ({ ...prev, [groupKey]: true }));
      setLocalMessages((prev) => ({ ...prev, [groupKey]: value }));
      mutate(
        (current) =>
          current
            ? {
                ...current,
                ceo_messages: {
                  ...(current.ceo_messages || {}),
                  [groupKey]: value,
                },
              }
            : current,
        false,
      );

      setSaveState((prev) => ({
        ...prev,
        [groupKey]: { status: "saved", message: "Saved" },
      }));

      setTimeout(() => mutate(), 2500);
    } catch (err) {
      setSaveState((prev) => ({
        ...prev,
        [groupKey]: {
          status: "error",
          message: String(err.message || err),
        },
      }));
    }
  };

  const reloadFromServer = () => {
    setTouched({});
    setSaveState({});
    mutate();
  };

  return (
    <main style={page}>
      <div style={shell}>
        <header style={header}>
          <div>
            <h1 style={title}>CEO Messages - Admin Panel</h1>
            <p style={subtitle}>
              Edit dashboard messages once. The card keeps your saved value while Google Sheet
              catches up.
            </p>
          </div>
          <div style={actions}>
            <Link href="/admin" style={linkButton}>
              Back to Admin
            </Link>
            <button type="button" onClick={reloadFromServer} style={secondaryButton}>
              Reload from server
            </button>
          </div>
        </header>

        <section style={grid}>
          {GROUPS.map((group) => {
            const current = getCurrentMessage(group.key);
            const state = saveState[group.key] || {};
            const isSaving = state.status === "saving";
            const statusText =
              state.status === "saved"
                ? "Saved."
                : state.status === "error"
                  ? `Error: ${state.message}`
                  : state.status === "dirty"
                    ? "Unsaved changes."
                    : "Edit the message, then click Save.";

            return (
              <article key={group.key} style={card}>
                <div style={glow} />

                <div style={cardHead}>
                  <div>
                    <div style={cardTitle}>{group.title}</div>
                    {group.tag ? <div style={tag}>{group.tag}</div> : null}
                  </div>
                  <span style={pill}>CEO message</span>
                </div>

                <textarea
                  value={current}
                  onChange={(e) => changeMessage(group.key, e.target.value)}
                  placeholder="Message for this dashboard..."
                  style={textarea}
                />

                <div style={footer}>
                  <span style={state.status === "error" ? errorText : hintText}>{statusText}</span>

                  <button
                    type="button"
                    onClick={() => saveMessage(group.key)}
                    disabled={isSaving}
                    style={{
                      ...saveButton,
                      cursor: isSaving ? "wait" : "pointer",
                      opacity: isSaving ? 0.7 : 1,
                    }}
                  >
                    {isSaving ? "Saving..." : state.status === "saved" ? "Saved" : "Save"}
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

const page = {
  minHeight: "100vh",
  padding: "40px 24px 60px",
  display: "flex",
  justifyContent: "center",
  background: "radial-gradient(circle at top, #eef2ff 0, #f9fafb 35%, #e5e7eb 80%)",
  fontFamily: "system-ui",
};

const shell = { width: "100%", maxWidth: 1320 };

const header = {
  marginBottom: 32,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const title = {
  margin: 0,
  fontSize: 32,
  fontWeight: 900,
  color: "#020617",
};

const subtitle = {
  margin: "8px 0 0",
  maxWidth: 760,
  fontSize: 14,
  color: "#4b5563",
  lineHeight: 1.6,
};

const actions = { display: "flex", gap: 10, flexWrap: "wrap" };

const linkButton = {
  padding: "9px 13px",
  borderRadius: 999,
  background: "#0f172a",
  color: "#fff",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 800,
};

const secondaryButton = {
  padding: "9px 13px",
  borderRadius: 999,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 24,
};

const card = {
  position: "relative",
  borderRadius: 28,
  padding: 20,
  background: "radial-gradient(circle at top left, #1e293b, #020617)",
  boxShadow: "0 30px 80px rgba(15,23,42,0.55), 0 0 0 1px rgba(148,163,184,0.5)",
  color: "#e5e7eb",
  overflow: "hidden",
};

const glow = {
  position: "absolute",
  inset: 0,
  background: "radial-gradient(circle at top right, rgba(96,165,250,0.45), transparent 55%)",
  opacity: 0.9,
  pointerEvents: "none",
};

const cardHead = {
  position: "relative",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
};

const cardTitle = {
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const tag = { marginTop: 2, fontSize: 11, opacity: 0.8 };

const pill = {
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 11,
  border: "1px solid rgba(148,163,184,0.9)",
  background: "rgba(15,23,42,0.75)",
};

const textarea = {
  position: "relative",
  width: "100%",
  minHeight: 170,
  borderRadius: 18,
  border: "1px solid rgba(30,64,175,0.9)",
  background: "radial-gradient(circle at top left, #020617, #020617)",
  color: "#e5e7eb",
  padding: 12,
  fontSize: 14,
  resize: "vertical",
  outline: "none",
  boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.9)",
};

const footer = {
  marginTop: 8,
  position: "relative",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
};

const hintText = { fontSize: 11, opacity: 0.82 };
const errorText = { fontSize: 11, color: "#fecaca", fontWeight: 800 };

const saveButton = {
  padding: "5px 16px",
  borderRadius: 999,
  border: "1px solid rgba(96,165,250,0.9)",
  background: "linear-gradient(135deg,rgba(59,130,246,0.95),rgba(56,189,248,0.95))",
  color: "#f9fafb",
  fontSize: 12,
  fontWeight: 800,
};
