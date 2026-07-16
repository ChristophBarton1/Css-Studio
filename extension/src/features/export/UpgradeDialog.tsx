import { useState } from 'preact/hooks';
import { useStudio } from '../../state/context';
import type { UpgradeContext } from '../../state/studio';
import ui from '../../styles/ui.module.css';
import { Dialog } from '../../components/Dialog';
import styles from './UpgradeDialog.module.css';

const TARGET_LABELS: Record<string, string> = {
  codex: 'Codex Agent Pack',
  'claude-code': 'Claude Code Agent Pack',
  cursor: 'Cursor handoff',
  windsurf: 'Windsurf handoff',
  lovable: 'Lovable handoff',
};

function headline(context: UpgradeContext): string {
  switch (context.source) {
    case 'export-target':
      return `Unlock the ${TARGET_LABELS[context.target ?? ''] ?? 'professional export'}`;
    case 'duplicates':
      return 'Consolidate colors into shared tokens';
    case 'projects':
      return 'Save unlimited projects';
    case 'scss':
      return 'Edit SCSS with Pro';
  }
}

export function UpgradeDialog() {
  const studio = useStudio();
  const context = studio.upgradePrompt.value;
  const [note, setNote] = useState<string | null>(null);
  if (!context) return null;

  const close = (): void => {
    studio.upgradePrompt.value = null;
  };

  const notWired = (): void => setNote('Checkout is not wired up in this development build.');

  return (
    <Dialog title={headline(context)} onClose={close}>
      <ul class={styles.benefits}>
        <li>Unlimited saved projects and version history</li>
        <li>Responsive breakpoints and hover/focus state editing</li>
        <li>All agent handoffs: Codex, Claude Code, Cursor, Windsurf, Lovable</li>
      </ul>

      <div class={styles.plans}>
        <button class={styles.planAnnual} onClick={notWired}>
          <span class={styles.planName}>
            Annual <span class={styles.planTag}>2 months free</span>
          </span>
          <span class={styles.planPrice}>49 € / year</span>
        </button>
        <button class={styles.planMonthly} onClick={notWired}>
          <span class={styles.planName}>Monthly</span>
          <span class={styles.planPrice}>6.99 € / month</span>
        </button>
      </div>

      {note && (
        <p class={`${ui.small} ${ui.muted}`} role="status">
          {note}
        </p>
      )}

      <div class={ui.spread}>
        <button class={ui.btnGhost} onClick={notWired}>
          Restore purchase
        </button>
        <a
          href="https://stylestud.io/privacy"
          target="_blank"
          rel="noreferrer"
          class={`${ui.small}`}
        >
          Privacy &amp; cancellation
        </a>
      </div>
    </Dialog>
  );
}
