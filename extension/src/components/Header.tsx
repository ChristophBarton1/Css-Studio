import { useEffect, useRef, useState } from 'preact/hooks';
import type { Plan } from '../types';
import { useStudio } from '../state/context';
import ui from '../styles/ui.module.css';
import { Dialog } from './Dialog';
import { MoreIcon } from './icons';
import { StatusBadge } from './StatusBadge';
import styles from './Header.module.css';

type InfoDialog = 'shortcuts' | 'privacy' | 'about' | null;

const PLANS: Plan[] = ['free', 'pro', 'team'];

export function Header() {
  const studio = useStudio();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<InfoDialog>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent): void {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !menuButtonRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  function openDialog(next: Exclude<InfoDialog, null>): void {
    setMenuOpen(false);
    setDialog(next);
  }

  return (
    <header class={styles.header}>
      <span class={styles.wordmark}>
        <span class={styles.logo} aria-hidden="true" />
        Style Studio
      </span>
      <span class={styles.hostname} title={studio.hostname.value}>
        {studio.hostname.value}
      </span>
      <StatusBadge kind={studio.statusKind.value} />
      <button
        ref={menuButtonRef}
        class={ui.iconBtn}
        aria-label="More options"
        title="More options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <MoreIcon />
      </button>

      {menuOpen && (
        <div class={styles.menu} role="menu" aria-label="Style Studio options" ref={menuRef}>
          <button class={styles.menuItem} role="menuitem" onClick={() => openDialog('shortcuts')}>
            Keyboard shortcuts
          </button>
          <button class={styles.menuItem} role="menuitem" onClick={() => openDialog('privacy')}>
            Privacy
          </button>
          <button class={styles.menuItem} role="menuitem" onClick={() => openDialog('about')}>
            Settings &amp; about
          </button>
          <div class={styles.menuDivider} role="separator" />
          <div class={styles.menuGroupLabel} aria-hidden="true">
            Plan (dev preview)
          </div>
          <div class={styles.planRow} role="group" aria-label="Simulated plan">
            {PLANS.map((plan) => (
              <button
                key={plan}
                class={`${ui.btn} ${ui.btnSm}`}
                aria-pressed={studio.plan.value === plan}
                style={
                  studio.plan.value === plan
                    ? { borderColor: 'var(--ss-accent)', color: 'var(--ss-accent-strong)' }
                    : undefined
                }
                onClick={() => {
                  void studio.setPlan(plan);
                  setMenuOpen(false);
                }}
              >
                {plan}
              </button>
            ))}
          </div>
        </div>
      )}

      {dialog === 'shortcuts' && (
        <Dialog title="Keyboard shortcuts" onClose={() => setDialog(null)}>
          <ul class={`${ui.small} ${ui.muted}`} style={{ paddingLeft: '18px', margin: 0 }}>
            <li>
              <strong>Ctrl/⌘ + Z</strong> — Undo last change
            </li>
            <li>
              <strong>Ctrl/⌘ + Shift + Z</strong> or <strong>Ctrl + Y</strong> — Redo
            </li>
            <li>
              <strong>← →</strong> on the tab bar — Switch tabs
            </li>
            <li>
              <strong>Esc</strong> — Close dialogs and menus
            </li>
          </ul>
        </Dialog>
      )}

      {dialog === 'privacy' && (
        <Dialog title="Privacy" onClose={() => setDialog(null)}>
          <p class={ui.small}>Style Studio never sends the following to any server:</p>
          <ul class={`${ui.small} ${ui.muted}`} style={{ paddingLeft: '18px' }}>
            <li>the full DOM of the page</li>
            <li>cookies or tokens</li>
            <li>form values</li>
            <li>browsing history</li>
          </ul>
          <p class={ui.small}>
            Exports contain only design tokens, generated CSS, and changed selectors. The Export
            tab always shows the exact payload before anything leaves the browser.
          </p>
        </Dialog>
      )}

      {dialog === 'about' && (
        <Dialog title="Settings & about" onClose={() => setDialog(null)}>
          <p class={ui.small}>
            <strong>Style Studio</strong> 0.1.0 — first frontend milestone.
          </p>
          <p class={`${ui.small} ${ui.muted}`}>
            Backend API: <span class={ui.mono}>{studio.apiMode === 'mock' ? 'mock (in-memory)' : 'HTTP'}</span>
            <br />
            The API base URL is configured at build time via{' '}
            <span class={ui.mono}>WXT_API_BASE_URL</span>; mock mode via{' '}
            <span class={ui.mono}>WXT_USE_MOCK_API</span>.
          </p>
        </Dialog>
      )}
    </header>
  );
}
