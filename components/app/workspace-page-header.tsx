import { StatusBadge } from "@/components/app/status-badge";

interface WorkspacePageHeaderProps {
  kicker: string;
  title: string;
  intro: string;
  status?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export function WorkspacePageHeader({ kicker, title, intro, status, meta, actions }: WorkspacePageHeaderProps) {
  return (
    <section className="workspace-page-header panel">
      <div className="workspace-page-header-main">
        <div className="workspace-page-header-copy">
          <p className="kicker">{kicker}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
        {meta ? <div className="workspace-page-header-meta">{meta}</div> : null}
      </div>

      {actions ? <div className="workspace-page-header-actions">{actions}</div> : null}
      {status ? <StatusBadge message={status} /> : null}
    </section>
  );
}
