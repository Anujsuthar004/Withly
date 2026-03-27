export default function RequestsLoading() {
  return (
    <div className="sanctuary-page">
      <div className="skeleton-block" style={{ height: "3rem", width: "45%", borderRadius: "8px" }} />
      <div style={{ display: "grid", gap: "1rem" }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-block" style={{ height: "120px", borderRadius: "12px" }} />
        ))}
      </div>
    </div>
  );
}
