import Head from "next/head";
import Link from "next/link";
import useSWR from "swr";
import {
  FiActivity,
  FiArrowRight,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiGrid,
  FiMessageSquare,
  FiPackage,
  FiRefreshCw,
  FiUsers,
} from "react-icons/fi";
import { fetchJson } from "../lib/fetch-json";

const sections = [
  {
    href: "/admin",
    eyebrow: "Management",
    title: "Executive overview",
    description: "Sales, targets, operations and business performance in one view.",
    icon: FiGrid,
    tone: "navy",
  },
  {
    href: "/technical",
    eyebrow: "Operations",
    title: "Technical dashboard",
    description: "Follow the technical queue, workload and current service status.",
    icon: FiActivity,
    tone: "blue",
  },
  {
    href: "/supply",
    eyebrow: "Procurement",
    title: "Supply dashboard",
    description: "Review supply requests, deliveries and outstanding purchasing work.",
    icon: FiPackage,
    tone: "teal",
  },
];

const quickLinks = [
  { href: "/group/1", label: "Group A", icon: FiBarChart2 },
  { href: "/group/2", label: "Group B", icon: FiBarChart2 },
  { href: "/group/3", label: "Group C", icon: FiBarChart2 },
  { href: "/admin/weekly-history", label: "Weekly history", icon: FiClock },
  { href: "/admin/messages", label: "CEO messages", icon: FiMessageSquare },
];

function SourceStatus({ label, request }) {
  const { data, error, isLoading, mutate } = request;
  const state = error ? "error" : isLoading || !data ? "loading" : "ready";
  const stateLabel =
    state === "error" ? "Unavailable" : state === "loading" ? "Checking" : "Connected";

  return (
    <div className={`portal-status-row is-${state}`}>
      <span className="portal-status-icon" aria-hidden="true">
        {state === "ready" ? <FiCheckCircle /> : <FiRefreshCw />}
      </span>
      <span className="portal-status-name">{label}</span>
      <span className="portal-status-value">{stateLabel}</span>
      {state === "error" && (
        <button type="button" className="portal-retry" onClick={() => mutate()}>
          Retry
        </button>
      )}
    </div>
  );
}

export default function Home() {
  const sales = useSWR("/api/data", fetchJson, { revalidateOnFocus: false });
  const technical = useSWR("/api/technical", fetchJson, { revalidateOnFocus: false });
  const supply = useSWR("/api/supply", fetchJson, { revalidateOnFocus: false });

  const requests = [sales, technical, supply];
  const readyCount = requests.filter((request) => request.data && !request.error).length;
  const hasError = requests.some((request) => request.error);
  const statusSummary = hasError
    ? "Needs attention"
    : readyCount < requests.length
      ? "Checking sources"
      : `${readyCount} of 3 connected`;

  return (
    <>
      <Head>
        <title>Management Center | Artin Azma</title>
        <meta
          name="description"
          content="Artin Azma management dashboards for sales, technical operations and supply."
        />
      </Head>

      <main className="portal-home">
        <section className="portal-hero">
          <div className="portal-hero-copy">
            <span className="portal-eyebrow">Management Center</span>
            <h1>A clear view of every active team.</h1>
            <p>
              Open the dashboard you need, review current performance and move between teams without
              losing context.
            </p>
            <div className="portal-hero-actions">
              <Link href="/admin" className="portal-primary-action">
                Open executive overview <FiArrowRight aria-hidden="true" />
              </Link>
              <Link href="/admin/weekly-history" className="portal-secondary-action">
                Review weekly history
              </Link>
            </div>
          </div>

          <aside className="portal-health-card" aria-label="Data source status">
            <div className="portal-health-head">
              <div>
                <span>Live data</span>
                <strong>{statusSummary}</strong>
              </div>
              <span
                className={`portal-live-dot${hasError ? " has-error" : readyCount < 3 ? " is-checking" : ""}`}
                aria-hidden="true"
              />
            </div>
            <SourceStatus label="Sales & groups" request={sales} />
            <SourceStatus label="Technical" request={technical} />
            <SourceStatus label="Supply" request={supply} />
          </aside>
        </section>

        <section className="portal-section" aria-labelledby="workspace-title">
          <div className="portal-section-heading">
            <div>
              <span className="portal-eyebrow">Workspaces</span>
              <h2 id="workspace-title">Choose a dashboard</h2>
            </div>
            <p>Each workspace keeps the figures and tools for one area together.</p>
          </div>

          <div className="portal-card-grid">
            {sections.map(({ href, eyebrow, title, description, icon: Icon, tone }) => (
              <Link href={href} className={`portal-card tone-${tone}`} key={href}>
                <span className="portal-card-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="portal-card-copy">
                  <small>{eyebrow}</small>
                  <strong>{title}</strong>
                  <span>{description}</span>
                </span>
                <FiArrowRight className="portal-card-arrow" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section className="portal-quick-panel" aria-labelledby="quick-title">
          <div className="portal-quick-heading">
            <span className="portal-quick-icon">
              <FiUsers aria-hidden="true" />
            </span>
            <div>
              <span className="portal-eyebrow">Direct access</span>
              <h2 id="quick-title">Teams and records</h2>
            </div>
          </div>
          <div className="portal-quick-links">
            {quickLinks.map(({ href, label, icon: Icon }) => (
              <Link href={href} key={href}>
                <Icon aria-hidden="true" />
                <span>{label}</span>
                <FiArrowRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
