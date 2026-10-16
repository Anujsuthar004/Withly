import styles from "@/app/fallback-design.module.css";

export function PageLoading({ label }: { label: string }) {
  return <div className={styles.loading} role="status" aria-label={`Loading ${label}`}>
    <span className={styles.loadingTitle} aria-hidden="true" />
    {[0, 1, 2].map((key) => <span className={styles.loadingCard} key={key} aria-hidden="true" />)}
  </div>;
}
