import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { useState } from "react";
import { FiArrowRight, FiLock, FiUser } from "react-icons/fi";
import companyLogo from "../public/company-logo.png";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.message || "Login failed. Please check your details.");
        setLoading(false);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/";
      router.push(
        next.startsWith("/") && !next.startsWith("//") && !/[\\\r\n]/.test(next) ? next : "/",
      );
    } catch {
      setError("The server could not be reached. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Sign in | Artin Azma</title>
      </Head>
      <main className="login-page">
        <section className="login-intro" aria-label="Artin Azma Management Center">
          <div className="login-intro-content">
            <span className="login-intro-label">Internal workspace</span>
            <h1>One place to follow every active operation.</h1>
            <p>Secure access to sales, technical and supply dashboards for the management team.</p>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-card">
            <div className="login-logo">
              <Image src={companyLogo} alt="Artin Azma" priority />
            </div>
            <span className="portal-eyebrow">Management Center</span>
            <h2>Welcome back</h2>
            <p className="login-subtitle">Enter your account details to continue.</p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="username">Username</label>
              <div className="login-input-wrap">
                <FiUser aria-hidden="true" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </div>

              <label htmlFor="password">Password</label>
              <div className="login-input-wrap">
                <FiLock aria-hidden="true" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="login-error" role="alert">
                  {error}
                </div>
              )}

              <button type="submit" className="login-submit" disabled={loading}>
                <span>{loading ? "Signing in…" : "Sign in"}</span>
                {!loading && <FiArrowRight aria-hidden="true" />}
              </button>
            </form>
            <p className="login-security-note">Protected company access</p>
          </div>
        </section>
      </main>
    </>
  );
}
