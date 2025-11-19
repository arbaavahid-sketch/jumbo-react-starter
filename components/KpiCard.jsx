export default function KpiCard({ label, value }){
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="kpi">{value}</div>
    </div>
  );
}
