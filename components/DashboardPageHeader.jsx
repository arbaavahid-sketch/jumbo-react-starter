import { FiClock } from "react-icons/fi";
import LiveClock from "./LiveClock";

export default function DashboardPageHeader({
  eyebrow,
  title,
  description,
  Icon,
  accent = "#2563eb",
}) {
  return (
    <header className="dashboard-page-header" style={{ "--dashboard-accent": accent }}>
      <div className="dashboard-page-heading">
        {Icon ? (
          <span className="dashboard-page-icon">
            <Icon aria-hidden="true" />
          </span>
        ) : null}
        <div>
          <span className="dashboard-page-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      <div className="dashboard-page-meta">
        <FiClock aria-hidden="true" />
        <div>
          <span>Local time</span>
          <strong>
            <LiveClock />
          </strong>
        </div>
      </div>
    </header>
  );
}
