import { useId } from "react";

export function DashboardChart({ title, description, height = 300, children }) {
  const titleId = `chart-${useId().replace(/:/g, "")}`;
  return (
    <figure className="dashboard-chart" aria-labelledby={titleId}>
      <figcaption className="dashboard-chart-caption">
        <strong id={titleId}>{title}</strong>
        {description ? <span>{description}</span> : null}
      </figcaption>
      <div className="dashboard-chart-canvas" style={{ height }}>
        {children}
      </div>
    </figure>
  );
}

export function DashboardChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (value) => new Intl.NumberFormat("en-US").format(Number(value) || 0),
  valueSelector = (entry) => entry.value,
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="dashboard-chart-tooltip">
      {label ? <strong>{label}</strong> : null}
      {payload.map((entry) => (
        <div key={`${entry.dataKey || entry.name}-${entry.value}`}>
          <span>
            <i style={{ background: entry.color || entry.fill }} />
            {entry.name}
          </span>
          <b>{valueFormatter(valueSelector(entry))}</b>
        </div>
      ))}
    </div>
  );
}
