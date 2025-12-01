// pages/login.js
import { useState } from "react";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      // اگر پارامتر next داشتیم، برگرد همونجا، وگرنه برو روی Portal (/)
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/";
      router.push(next);
    } catch (err) {
      console.error(err);
      setError("خطا در ارتباط با سرور.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top left,#e0f2fe,#eff6ff 40%,#dbeafe 70%)",
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          width: 380,
          maxWidth: "90vw",
          background: "rgba(255,255,255,0.96)",
          borderRadius: 24,
          boxShadow:
            "0 30px 80px rgba(15,23,42,0.35), 0 0 0 1px rgba(148,163,184,0.35)",
          padding: "26px 28px 30px",
        }}
      >
        {/* لوگو */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <img
            src="/company-logo.png"
            alt="Artin Azma"
            style={{ height: 46, objectFit: "contain" }}
          />
        </div>

        <h1
          style={{
            textAlign: "center",
            margin: "0 0 4px",
            fontSize: 20,
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          Manager Login
        </h1>
        <p
          style={{
            textAlign: "center",
            margin: "0 0 18px",
            fontSize: 12,
            color: "#6b7280",
          }}
        >
          
        </p>

        <form onSubmit={handleSubmit}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 4,
            }}
          >
            Username
          </label>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              marginBottom: 12,
              fontSize: 13,
            }}
          />

          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 4,
            }}
          >
            Password
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              marginBottom: 10,
              fontSize: 13,
            }}
          />

          {error && (
            <div
              style={{
                marginBottom: 10,
                fontSize: 12,
                color: "#b91c1c",
                background: "#fee2e2",
                borderRadius: 10,
                padding: "6px 8px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: 4,
              padding: "9px 0",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              background:
                "linear-gradient(135deg,#2563eb,#4f46e5,#a855f7)",
              boxShadow: "0 18px 40px rgba(37,99,235,0.55)",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "در حال ورود..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
