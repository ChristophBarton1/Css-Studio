import { useState } from 'preact/hooks';
import { useStudio } from '../state/context';
import ui from '../styles/ui.module.css';
import { Dialog } from './Dialog';
import { RedoIcon, ResetIcon, SaveIcon, UndoIcon } from './icons';
import styles from './Footer.module.css';

export function Footer() {
  const studio = useStudio();
  const [confirmReset, setConfirmReset] = useState(false);
  const disabled = studio.pageStatus.value !== 'ready';

  return (
    <footer class={styles.footer}>
      <button
        class={ui.btnGhost}
        disabled={disabled || !studio.canUndo.value}
        aria-label={
          studio.lastPatchLabel.value ? `Undo: ${studio.lastPatchLabel.value}` : 'Undo'
        }
        title="Undo (Ctrl+Z)"
        onClick={() => void studio.undo()}
      >
        <UndoIcon />
        Undo
      </button>
      <button
        class={ui.btnGhost}
        disabled={disabled || !studio.canRedo.value}
        aria-label="Redo"
        title="Redo (Ctrl+Shift+Z)"
        onClick={() => void studio.redo()}
      >
        <RedoIcon />
        Redo
      </button>
      <button
        class={ui.btnGhost}
        disabled={disabled || !studio.isDirty.value}
        aria-label="Reset all changes"
        title="Reset all changes"
        onClick={() => setConfirmReset(true)}
      >
        <ResetIcon />
        Reset
      </button>

      <span class={styles.spacer} aria-live="polite">
        {studio.notice.value && <span class={styles.notice}>{studio.notice.value}</span>}
      </span>

      <button
        class={ui.btnPrimary}
        disabled={disabled || !studio.isDirty.value}
        title="Save project"
        onClick={() => void studio.saveProject()}
      >
        <SaveIcon />
        Save project
      </button>

      {confirmReset && (
        <Dialog title="Reset all changes?" onClose={() => setConfirmReset(false)}>
          <p class={ui.small}>
            This removes every change from this session and restores the page's original styles.
            Saved projects are not affected.
          </p>
          <div class={ui.row} style={{ justifyContent: 'flex-end' }}>
            <button class={ui.btn} onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
            <button
              class={ui.btnDanger}
              onClick={() => {
                void studio.reset();
                setConfirmReset(false);
              }}
            >
              Reset session
            </button>
          </div>
        </Dialog>
      )}
    </footer>
  );
}
