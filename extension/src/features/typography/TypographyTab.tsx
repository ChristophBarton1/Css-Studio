import { useState } from 'preact/hooks';
import type { TypographyToken } from '../../types';
import { useStudio } from '../../state/context';
import { createPatch, typographyChange } from '../../state/patches';
import ui from '../../styles/ui.module.css';
import { AnalyzeAction, EmptyState } from '../../components/EmptyState';
import styles from './TypographyTab.module.css';

/**
 * Curated starter list — system stacks only, so nothing is downloaded.
 * Webfonts load only after an explicit selection once real pages are wired up.
 */
const FONT_OPTIONS = [
  { label: 'System UI', value: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { label: 'Inter', value: 'Inter' },
  { label: 'Georgia (serif)', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Space Grotesk', value: '"Space Grotesk", system-ui, sans-serif' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", ui-monospace, monospace' },
];

const WEIGHTS = ['300', '400', '500', '600', '700', '800'];
const TRANSFORMS = ['none', 'uppercase', 'capitalize', 'lowercase'];

const ROLE_LABELS: Record<string, string> = {
  h1: 'H1',
  h2: 'H2',
  h3: 'H3',
  h4: 'H4',
  h5: 'H5',
  h6: 'H6',
  body: 'Body',
  small: 'Small',
  button: 'Button',
  link: 'Link',
  code: 'Code',
};

function RoleEditor({ token, original }: { token: TypographyToken; original: TypographyToken }) {
  const studio = useStudio();
  const roleLabel = ROLE_LABELS[token.role] ?? token.role;

  function commitChange(
    property: 'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing' | 'textTransform',
    value: string,
    what: string,
  ): void {
    void studio.commit(createPatch(`Changed ${roleLabel} ${what}`, [typographyChange(token, property, value)]));
  }

  function resetRole(): void {
    void studio.commit(
      createPatch(`Reset ${roleLabel} typography`, [
        typographyChange(token, 'fontFamily', original.fontFamily),
        typographyChange(token, 'fontSize', original.fontSize),
        typographyChange(token, 'fontWeight', String(original.fontWeight)),
        typographyChange(token, 'lineHeight', original.lineHeight),
        typographyChange(token, 'letterSpacing', original.letterSpacing ?? ''),
        typographyChange(token, 'textTransform', original.textTransform ?? ''),
      ]),
    );
  }

  const knownFont = FONT_OPTIONS.some((option) => option.value === token.fontFamily);

  return (
    <div class={styles.editor}>
      <label class={styles.full}>
        <span class={ui.label}>Font family</span>
        <select
          class={ui.select}
          value={knownFont ? token.fontFamily : '__detected'}
          onChange={(event) => {
            const value = (event.target as HTMLSelectElement).value;
            if (value !== '__detected') commitChange('fontFamily', value, 'font');
          }}
        >
          {!knownFont && <option value="__detected">{token.fontFamily} (detected)</option>}
          {FONT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span class={ui.label}>Size</span>
        <input
          class={ui.input}
          value={token.fontSize}
          onChange={(event) => {
            const value = (event.target as HTMLInputElement).value.trim();
            if (value) commitChange('fontSize', value, 'size');
          }}
        />
      </label>
      <label>
        <span class={ui.label}>Weight</span>
        <select
          class={ui.select}
          value={String(token.fontWeight)}
          onChange={(event) =>
            commitChange('fontWeight', (event.target as HTMLSelectElement).value, 'weight')
          }
        >
          {!WEIGHTS.includes(String(token.fontWeight)) && (
            <option value={String(token.fontWeight)}>{token.fontWeight}</option>
          )}
          {WEIGHTS.map((weight) => (
            <option key={weight} value={weight}>
              {weight}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span class={ui.label}>Line height</span>
        <input
          class={ui.input}
          value={token.lineHeight}
          onChange={(event) => {
            const value = (event.target as HTMLInputElement).value.trim();
            if (value) commitChange('lineHeight', value, 'line height');
          }}
        />
      </label>
      <label>
        <span class={ui.label}>Letter spacing</span>
        <input
          class={ui.input}
          placeholder="normal"
          value={token.letterSpacing ?? ''}
          onChange={(event) =>
            commitChange(
              'letterSpacing',
              (event.target as HTMLInputElement).value.trim(),
              'letter spacing',
            )
          }
        />
      </label>
      <label>
        <span class={ui.label}>Transform</span>
        <select
          class={ui.select}
          value={token.textTransform ?? 'none'}
          onChange={(event) =>
            commitChange(
              'textTransform',
              (event.target as HTMLSelectElement).value === 'none'
                ? ''
                : (event.target as HTMLSelectElement).value,
              'transform',
            )
          }
        >
          {TRANSFORMS.map((transform) => (
            <option key={transform} value={transform}>
              {transform}
            </option>
          ))}
        </select>
      </label>
      <div class={styles.full}>
        <button class={ui.btn} onClick={resetRole}>
          Reset role
        </button>
      </div>
    </div>
  );
}

export function TypographyTab() {
  const studio = useStudio();
  const [expanded, setExpanded] = useState<string | null>(null);
  const design = studio.design.value;
  const original = studio.originalDesign.value;

  if (!design || !original) {
    return (
      <EmptyState title="No typography yet" action={<AnalyzeAction />}>
        Analyze the page first — detected text roles appear here.
      </EmptyState>
    );
  }

  return (
    <div>
      {design.typography.map((token) => {
        const originalToken = original.typography.find((t) => t.role === token.role) ?? token;
        const isOpen = expanded === token.role;
        return (
          <div key={token.role}>
            <button
              class={styles.row}
              aria-expanded={isOpen}
              onClick={() => setExpanded(isOpen ? null : token.role)}
            >
              <span class={styles.roleName}>{ROLE_LABELS[token.role] ?? token.role}</span>
              <span class={styles.meta}>
                {token.fontFamily.split(',')[0]} · {token.fontSize} · {token.fontWeight} ·{' '}
                {token.lineHeight}
              </span>
              <span class={styles.count}>×{token.occurrences ?? 0}</span>
            </button>
            {isOpen && <RoleEditor token={token} original={originalToken} />}
          </div>
        );
      })}
    </div>
  );
}
