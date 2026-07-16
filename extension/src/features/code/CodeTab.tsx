import { useEffect, useRef, useState } from 'preact/hooks';
import { useStudio } from '../../state/context';
import { generateCss } from '../../state/generate-css';
import { createCustomCssPatch } from '../../state/patches';
import ui from '../../styles/ui.module.css';
import { CopyIcon } from '../../components/icons';
import { AnalyzeAction, EmptyState } from '../../components/EmptyState';
import type { CssEditor } from './editor';
import styles from './CodeTab.module.css';

/** Non-blocking sanity check — unbalanced braces etc. never prevent Apply. */
function validateCss(source: string): string | null {
  const open = (source.match(/\{/g) ?? []).length;
  const close = (source.match(/\}/g) ?? []).length;
  if (open !== close) {
    return `Braces look unbalanced (${open} opening, ${close} closing). Valid declarations still apply.`;
  }
  return null;
}

export function CodeTab() {
  const studio = useStudio();
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<CssEditor | null>(null);
  const formatRef = useRef<((source: string) => string) | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [copied, setCopied] = useState<'generated' | 'custom' | null>(null);

  const design = studio.design.value;
  const snapshot = studio.snapshot.value;
  const appliedCss = design?.customCss ?? '';
  // The draft survives tab switches because it lives in the store.
  const draft = studio.codeDraft.value ?? appliedCss;
  const validation = validateCss(draft);
  const generated = design && snapshot ? generateCss(design, snapshot) : '';

  // CodeMirror is imported dynamically the first time this tab renders,
  // keeping it out of the initial side-panel chunk.
  useEffect(() => {
    if (!design) return;
    let disposed = false;
    void import('./editor').then((module) => {
      if (disposed || !hostRef.current) return;
      formatRef.current = module.formatCss;
      editorRef.current = module.createCssEditor(hostRef.current, draft, (doc) => {
        studio.codeDraft.value = doc;
      });
      setEditorReady(true);
    });
    return () => {
      disposed = true;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once per analyzed design
  }, [design !== null]);

  if (!design || !snapshot) {
    return (
      <EmptyState title="No code yet" action={<AnalyzeAction />}>
        Analyze the page first — generated CSS and a custom CSS editor appear here.
      </EmptyState>
    );
  }

  async function copy(text: string, which: 'generated' | 'custom'): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      studio.showNotice('Copy failed — clipboard unavailable.');
    }
  }

  function applyDraft(): void {
    const value = editorRef.current?.getValue() ?? draft;
    void studio.commit(createCustomCssPatch(value, appliedCss));
    studio.codeDraft.value = value;
  }

  function revertDraft(): void {
    studio.codeDraft.value = null;
    editorRef.current?.setValue(appliedCss);
  }

  function formatDraft(): void {
    const format = formatRef.current;
    if (!format || !editorRef.current) return;
    const formatted = format(editorRef.current.getValue());
    editorRef.current.setValue(formatted);
    studio.codeDraft.value = formatted;
  }

  const dirty = draft !== appliedCss;

  return (
    <div>
      <div class={styles.modeRow} role="group" aria-label="Code mode">
        <span class={styles.modeChipActive}>CSS</span>
        <button
          class={styles.modeChip}
          style={{ cursor: 'pointer' }}
          title="SCSS editing is planned for Pro"
          onClick={() => (studio.upgradePrompt.value = { source: 'scss' })}
        >
          SCSS · planned <span class={ui.proBadge}>Pro</span>
        </button>
        <span class={`${ui.small} ${ui.muted}`}>Tailwind is an export target</span>
      </div>

      <section class={ui.section} aria-label="Generated CSS">
        <h3 class={ui.sectionTitle}>
          Generated CSS
          <button
            class={`${ui.btn} ${ui.btnSm}`}
            onClick={() => void copy(generated, 'generated')}
            aria-label="Copy generated CSS"
          >
            <CopyIcon />
            {copied === 'generated' ? 'Copied' : 'Copy'}
          </button>
        </h3>
        <pre class={ui.pre}>{generated}</pre>
        <p class={`${ui.small} ${ui.muted}`} style={{ marginBottom: 0 }}>
          Produced from your visual edits — read-only here.
        </p>
      </section>

      <section class={ui.section} aria-label="Your CSS">
        <h3 class={ui.sectionTitle}>Your CSS</h3>
        <div class={styles.editorHost} ref={hostRef}>
          {!editorReady && <div class={styles.loading}>Loading editor…</div>}
        </div>
        {validation && (
          <p class={styles.validation} role="status">
            {validation}
          </p>
        )}
        <div class={styles.actions}>
          <button class={ui.btn} disabled={!editorReady} onClick={formatDraft}>
            Format
          </button>
          <button class={ui.btnPrimary} disabled={!dirty} onClick={applyDraft}>
            Apply
          </button>
          <button class={ui.btn} disabled={!dirty} onClick={revertDraft}>
            Revert
          </button>
          <button
            class={ui.btn}
            onClick={() => void copy(editorRef.current?.getValue() ?? draft, 'custom')}
          >
            <CopyIcon />
            {copied === 'custom' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </section>
    </div>
  );
}
