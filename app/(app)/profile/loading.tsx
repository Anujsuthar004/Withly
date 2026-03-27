export default function ProfileLoading() {
  return (
    <div className="sanctuary-page">
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <div className="skeleton-block" style={{ width: "72px", height: "72px", borderRadius: "50%" }} />
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <div className="skeleton-block" style={{ height: "1.5rem", width: "180px", borderRadius: "6px" }} />
          <div className="skeleton-block" style={{ height: "1rem", width: "120px", borderRadius: "6px" }} />
        </div>
      </div>
      <div className="skeleton-block" style={{ height: "280px", borderRadius: "12px" }} />
    </div>
  );
}
