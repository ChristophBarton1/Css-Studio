import type { StatusKind } from '../state/studio';
import styles from './StatusBadge.module.css';

const LABELS: Record<StatusKind, string> = {
  ready: 'Ready',
  analyzing: 'Analyzing',
  offline: 'Offline',
  unsupported: 'Unsupported',
};

/** Status is always shown as text plus color — never color alone. */
export function StatusBadge({ kind }: { kind: StatusKind }) {
  return (
    <span class={`${styles.badge} ${styles[kind] ?? ''}`} role="status">
      <span class={styles.dot} aria-hidden="true" />
      {LABELS[kind]}
    </span>
  );
}
