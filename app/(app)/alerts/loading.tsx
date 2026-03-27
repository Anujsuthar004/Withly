export default function AlertsLoading() {
  return (
    <div className="sanctuary-page">
      <div className="skeleton-block" style={{ height: "3rem", width: "35%", borderRadius: "8px" }} />
      <div className="alerts-list">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton-block" style={{ height: "80px", borderRadius: "10px" }} />
        ))}
      </div>
    </div>
  );
}
