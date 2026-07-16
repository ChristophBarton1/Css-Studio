import { useState } from 'preact/hooks';
import type { ColorToken } from '../../types';
import { useStudio } from '../../state/context';
import { createColorPatch } from '../../state/patches';
import ui from '../../styles/ui.module.css';
import { AnalyzeAction, EmptyState } from '../../components/EmptyState';
import { PipetteIcon } from '../../components/icons';
import {
  COLOR_ROLE_LABELS,
  COLOR_ROLE_ORDER,
  findNearDuplicates,
  normalizeHex,
  rgbLabel,
} from './color-utils';
import styles from './ColorsTab.module.css';

interface EyeDropperResult {
  sRGBHex: string;
}

interface EyeDropperConstructor {
  new (): { open(): Promise<EyeDropperResult> };
}

function getEyeDropper(): EyeDropperConstructor | undefined {
  return (globalThis as Record<string, unknown>)['EyeDropper'] as
    | EyeDropperConstructor
    | undefined;
}

function ColorEditor({ color, originalValue }: { color: ColorToken; originalValue: string }) {
  const studio = useStudio();
  const [draft, setDraft] = useState(color.value);
  const [confirming, setConfirming] = useState(false);
  const normalized = normalizeHex(draft);
  const eyeDropper = getEyeDropper();
  const invalid = normalized === null;
  const unchanged = normalized !== null && normalizeHex(color.value) === normalized;
  const errorId = `color-error-${color.name}`;

  async function pickWithEyeDropper(): Promise<void> {
    const Ctor = getEyeDropper();
    if (!Ctor) return;
    try {
      const result = await new Ctor().open();
      setDraft(result.sRGBHex.toUpperCase());
    } catch {
      // User cancelled the eyedropper — nothing to do.
    }
  }

  function applyDraft(): void {
    if (!normalized || unchanged) return;
    setConfirming(true);
  }

  function confirmReplace(): void {
    if (!normalized) return;
    void studio.commit(createColorPatch(color, normalized));
    setConfirming(false);
  }

  return (
    <div class={styles.editor}>
      <div class={styles.editorControls}>
        <input
          type="color"
          class={styles.nativePicker}
          value={normalized ?? '#000000'}
          aria-label={`Pick ${color.name} color`}
          onInput={(event) => setDraft((event.target as HTMLInputElement).value.toUpperCase())}
        />
        <input
          class={`${ui.input} ${styles.hexInput}`}
          value={draft}
          aria-label={`${color.name} hex value`}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          onInput={(event) => setDraft((event.target as HTMLInputElement).value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') applyDraft();
          }}
        />
        {eyeDropper && (
          <button
            class={ui.iconBtn}
            aria-label="Pick color from screen"
            title="Pick color from screen"
            onClick={() => void pickWithEyeDropper()}
          >
            <PipetteIcon />
          </button>
        )}
        <span class={`${ui.small} ${ui.muted}`}>{normalized ? rgbLabel(normalized) : ''}</span>
      </div>
      {invalid && (
        <span class={ui.errorText} id={errorId}>
          Enter a hex color like #6C5CE7.
        </span>
      )}
      <div class={ui.row}>
        <button class={ui.btnPrimary} disabled={invalid || unchanged} onClick={applyDraft}>
          Apply
        </button>
        <button
          class={ui.btn}
          disabled={normalizeHex(color.value) === normalizeHex(originalValue)}
          onClick={() => {
            setDraft(originalValue);
            void studio.commit(createColorPatch(color, originalValue));
          }}
        >
          Reset to original
        </button>
      </div>
      {confirming && normalized && (
        <div class={styles.confirm} role="alertdialog" aria-label="Confirm color replacement">
          <span>
            Replace <strong>{color.value.toUpperCase()}</strong> in{' '}
            <strong>{color.occurrences ?? 0} matching elements</strong>?
          </span>
          <div class={ui.row}>
            <button class={ui.btnPrimary} onClick={confirmReplace}>
              Replace
            </button>
            <button class={ui.btn} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ColorsTab() {
  const studio = useStudio();
  const [expanded, setExpanded] = useState<string | null>(null);
  const design = studio.design.value;
  const original = studio.originalDesign.value;

  if (!design || !original) {
    return (
      <EmptyState title="No colors yet" action={<AnalyzeAction />}>
        Analyze the page first — detected colors appear here, grouped by role.
      </EmptyState>
    );
  }

  const groups = COLOR_ROLE_ORDER.map((role) => ({
    role,
    colors: design.colors.filter((color) => color.role === role),
  })).filter((group) => group.colors.length > 0);

  const duplicates = findNearDuplicates(design.colors);
  const isFree = studio.plan.value === 'free';

  return (
    <div>
      {groups.map((group) => (
        <div class={styles.roleGroup} key={group.role}>
          <h3 class={styles.roleLabel}>{COLOR_ROLE_LABELS[group.role] ?? group.role}</h3>
          {group.colors.map((color) => {
            const originalValue =
              original.colors.find((c) => c.name === color.name)?.value ?? color.value;
            const isOpen = expanded === color.name;
            return (
              <div key={color.name}>
                <div class={styles.row}>
                  <span class={styles.swatch} style={{ background: color.value }} aria-hidden="true" />
                  <span class={styles.name}>{color.name}</span>
                  <span class={styles.value}>{color.value.toUpperCase()}</span>
                  <span class={styles.count}>×{color.occurrences ?? 0}</span>
                  <button
                    class={`${ui.btn} ${ui.btnSm}`}
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : color.name)}
                  >
                    {isOpen ? 'Close' : 'Edit'}
                  </button>
                </div>
                {isOpen && (
                  <ColorEditor key={`${color.name}:${color.value}`} color={color} originalValue={originalValue} />
                )}
              </div>
            );
          })}
        </div>
      ))}

      {isFree && duplicates.length > 0 && (
        <div class={styles.proCard}>
          <span class={ui.small}>
            <strong>{duplicates.length} near-duplicate {duplicates.length === 1 ? 'pair' : 'pairs'}</strong>{' '}
            could be consolidated into shared tokens.
          </span>
          <button
            class={`${ui.btn} ${ui.btnSm}`}
            onClick={() => (studio.upgradePrompt.value = { source: 'duplicates' })}
          >
            <span class={ui.proBadge}>Pro</span>&nbsp;Consolidate
          </button>
        </div>
      )}
    </div>
  );
}
