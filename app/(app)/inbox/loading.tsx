export default function InboxLoading() {
  return (
    <div className="sanctuary-page">
      <div className="skeleton-block" style={{ height: "3rem", width: "55%", borderRadius: "8px" }} />
      <div className="workspace-content inbox-layout">
        <div className="skeleton-block" style={{ height: "260px", borderRadius: "12px" }} />
        <div style={{ display: "grid", gap: "1rem" }}>
          <div className="skeleton-block" style={{ height: "320px", borderRadius: "12px" }} />
          <div className="skeleton-block" style={{ height: "180px", borderRadius: "12px" }} />
        </div>
      </div>
    </div>
  );
}
