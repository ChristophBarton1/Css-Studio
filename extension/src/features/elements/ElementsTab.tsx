import { useStudio } from '../../state/context';
import { createElementPatch } from '../../state/patches';
import ui from '../../styles/ui.module.css';
import { AnalyzeAction, EmptyState } from '../../components/EmptyState';
import { TargetIcon } from '../../components/icons';
import styles from './ElementsTab.module.css';

export function ElementsTab() {
  const studio = useStudio();
  const snapshot = studio.snapshot.value;
  const design = studio.design.value;
  const selected = studio.selectedElement.value;

  if (!snapshot || !design) {
    return (
      <EmptyState title="No elements yet" action={<AnalyzeAction />}>
        Analyze the page first — common element roles appear here.
      </EmptyState>
    );
  }

  const overrides = selected ? design.elements[selected.selector] ?? {} : {};

  function currentStyle(property: string): string {
    return overrides[property] ?? selected?.styles[property] ?? '';
  }

  function commitStyle(property: string, value: string, what: string): void {
    if (!selected) return;
    void studio.commit(
      createElementPatch(
        selected.selector,
        property,
        value,
        currentStyle(property),
        `Changed selected element ${what}`,
      ),
    );
  }

  const hidden = currentStyle('display') === 'none';

  return (
    <div>
      <section class={ui.section} aria-label="Element selection">
        <button class={ui.btnPrimary} onClick={() => void studio.selectElement()}>
          <TargetIcon />
          Select on page
        </button>
        <p class={`${ui.small} ${ui.muted}`} style={{ marginBottom: 0 }}>
          {studio.coreMode === 'page'
            ? 'Click, then pick an element on the page. Press Esc to cancel.'
            : 'Selection returns a sample element in this environment.'}
        </p>
      </section>

      {selected && (
        <section class={ui.section} aria-label="Selected element">
          <h3 class={ui.sectionTitle}>Selected element</h3>
          <div class={styles.selectedCard}>
            <div>
              <span class={ui.small}>{selected.summary}</span>
              <br />
              <span class={ui.mono}>{selected.selector}</span>
            </div>
            <div class={styles.controls}>
              <label class={styles.colorControl}>
                <input
                  type="color"
                  value={currentStyle('color') || '#000000'}
                  aria-label="Text color"
                  onChange={(event) =>
                    commitStyle('color', (event.target as HTMLInputElement).value, 'text color')
                  }
                />
                <span class={ui.small}>Text</span>
              </label>
              <label class={styles.colorControl}>
                <input
                  type="color"
                  value={currentStyle('background-color') || '#FFFFFF'}
                  aria-label="Background color"
                  onChange={(event) =>
                    commitStyle(
                      'background-color',
                      (event.target as HTMLInputElement).value,
                      'background',
                    )
                  }
                />
                <span class={ui.small}>Background</span>
              </label>
              <label>
                <span class={ui.label}>Radius</span>
                <input
                  class={ui.input}
                  value={currentStyle('border-radius')}
                  placeholder="10px"
                  onChange={(event) =>
                    commitStyle(
                      'border-radius',
                      (event.target as HTMLInputElement).value.trim(),
                      'radius',
                    )
                  }
                />
              </label>
              <label>
                <span class={ui.label}>Padding</span>
                <input
                  class={ui.input}
                  value={currentStyle('padding')}
                  placeholder="12px 20px"
                  onChange={(event) =>
                    commitStyle('padding', (event.target as HTMLInputElement).value.trim(), 'padding')
                  }
                />
              </label>
            </div>
            <label class={ui.checkboxRow}>
              <input
                type="checkbox"
                checked={hidden}
                onChange={(event) =>
                  commitStyle(
                    'display',
                    (event.target as HTMLInputElement).checked ? 'none' : '',
                    'visibility',
                  )
                }
              />
              <span class={ui.small}>Hide element</span>
            </label>
          </div>
        </section>
      )}

      <section class={ui.section} aria-label="Detected element roles">
        <h3 class={ui.sectionTitle}>Detected roles</h3>
        {(snapshot.elements ?? []).map((role) => (
          <div class={styles.roleRow} key={role.role}>
            <span class={styles.roleLabel}>{role.label}</span>
            <span class={styles.selector}>{role.selector}</span>
            <span class={styles.count}>×{role.occurrences}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
