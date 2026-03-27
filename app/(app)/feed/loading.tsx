export default function FeedLoading() {
  return (
    <div className="sanctuary-page">
      <div className="skeleton-block" style={{ height: "2.5rem", width: "40%", borderRadius: "8px" }} />
      <div className="sanctuary-feed-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-block" style={{ height: "180px", borderRadius: "12px" }} />
        ))}
      </div>
    </div>
  );
}
