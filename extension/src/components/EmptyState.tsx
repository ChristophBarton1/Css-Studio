import type { ComponentChildren } from 'preact';
import { useStudio } from '../state/context';
import ui from '../styles/ui.module.css';

interface EmptyStateProps {
  title: string;
  children?: ComponentChildren;
  action?: ComponentChildren;
}

/** Shared "Analyze page" CTA so every tab's empty state can start the flow. */
export function AnalyzeAction() {
  const studio = useStudio();
  const analyzing = studio.pageStatus.value === 'analyzing';
  return (
    <button class={ui.btnPrimary} disabled={analyzing} onClick={() => void studio.analyze()}>
      {analyzing ? 'Analyzing…' : 'Analyze page'}
    </button>
  );
}

export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--ss-space-6) var(--ss-space-4)' }}>
      <p style={{ fontWeight: 650, margin: '0 0 4px' }}>{title}</p>
      {children && <p class={`${ui.small} ${ui.muted}`} style={{ margin: '0 0 12px' }}>{children}</p>}
      {action}
    </div>
  );
}
