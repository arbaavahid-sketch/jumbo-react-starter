import { FiAlertTriangle, FiInbox } from "react-icons/fi";

export function DashboardSkeleton({ label = "Loading dashboard…", cards = 8, panels = 2 }) {
  return (
    <section className="dashboard-skeleton" aria-busy="true" aria-live="polite">
      <div className="dashboard-skeleton-label">
        <span className="dashboard-skeleton-spinner" aria-hidden="true" />
        {label}
      </div>
      <div className="dashboard-skeleton-grid" aria-hidden="true">
        {Array.from({ length: cards }, (_, index) => (
          <div className="dashboard-skeleton-card" key={index}>
            <span />
            <strong />
          </div>
        ))}
      </div>
      <div className="dashboard-skeleton-panels" aria-hidden="true">
        {Array.from({ length: panels }, (_, index) => (
          <div key={index} />
        ))}
      </div>
    </section>
  );
}

export function DashboardNotice({ title, detail, tone = "error" }) {
  const Icon = tone === "empty" ? FiInbox : FiAlertTriangle;
  return (
    <section className={`dashboard-notice is-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span className="dashboard-notice-icon">
        <Icon aria-hidden="true" />
      </span>
      <div>
        <h2>{title}</h2>
        {detail ? <p>{detail}</p> : null}
      </div>
    </section>
  );
}
