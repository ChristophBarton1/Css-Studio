import { useEffect, useState } from 'preact/hooks';
import type { AgentPack, ApiError, Capabilities, ExportTarget } from '../../types';
import { useStudio } from '../../state/context';
import ui from '../../styles/ui.module.css';
import { CopyIcon, ExternalIcon } from '../../components/icons';
import { AnalyzeAction, EmptyState } from '../../components/EmptyState';
import {
  buildExportRequest,
  DEFAULT_FORM,
  validateExportForm,
  type ExportFormState,
} from './export-request';
import styles from './ExportTab.module.css';

const TARGET_META: Record<ExportTarget, { label: string; hint: string }> = {
  universal: { label: 'Universal', hint: 'LLM-agnostic prompt' },
  codex: { label: 'Codex', hint: 'AGENTS.md pack' },
  'claude-code': { label: 'Claude Code', hint: 'CLAUDE.md pack' },
  cursor: { label: 'Cursor', hint: '.cursorrules' },
  windsurf: { label: 'Windsurf', hint: '.windsurfrules' },
  lovable: { label: 'Lovable', hint: 'Build-with-URL' },
};

const MODE_LABELS: Record<string, string> = {
  'restyle-existing': 'Restyle existing site',
  'generate-new': 'Generate new project',
  'tokens-only': 'Design tokens only',
  'selected-component': 'Selected component',
  'fix-inconsistencies': 'Fix inconsistencies',
};

function downloadCss(css: string): void {
  const blob = new Blob([css], { type: 'text/css' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'style-studio.css';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExportTab() {
  const studio = useStudio();
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [capabilitiesError, setCapabilitiesError] = useState(false);
  const [form, setForm] = useState<ExportFormState>(DEFAULT_FORM);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AgentPack | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState(false);

  const design = studio.design.value;
  const snapshot = studio.snapshot.value;
  const entitlements = studio.entitlements.value;
  const entitlementsLoading = studio.entitlementsStatus.value === 'loading';

  async function loadCapabilities(): Promise<void> {
    setCapabilitiesError(false);
    const response = await studio.api.capabilities();
    if (response.ok) {
      setCapabilities(response.data);
    } else {
      setCapabilitiesError(true);
    }
  }

  // Capability values come from the backend — nothing is hard-coded.
  useEffect(() => {
    void loadCapabilities();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per mount
  }, []);

  if (!design || !snapshot) {
    return (
      <EmptyState title="Nothing to export yet" action={<AnalyzeAction />}>
        Analyze the page and make a change — exports and handoffs are built from your session.
      </EmptyState>
    );
  }

  const request = buildExportRequest(studio.plan.value, form, design, snapshot);
  const validationError = validateExportForm(form);
  const targetLocked = (target: ExportTarget): boolean =>
    entitlements !== null && !entitlements.exportTargets.includes(target);

  async function generate(): Promise<void> {
    setBusy(true);
    setError(null);
    setResult(null);
    const response = await studio.api.exportPreview(request);
    setBusy(false);
    if (response.ok) {
      setResult(response.data);
      setActiveFile(Object.keys(response.data.files)[0] ?? null);
    } else if (response.error.kind === 'upgrade-required') {
      // HTTP 402 is an upgrade state, not a generic error.
      studio.upgradePrompt.value = { source: 'export-target', target: form.target };
    } else {
      setError(response.error);
      if (response.error.kind === 'network' || response.error.kind === 'timeout') {
        studio.offline.value = true;
      }
    }
  }

  async function copyActiveFile(): Promise<void> {
    const content = result && activeFile ? result.files[activeFile] : undefined;
    if (content === undefined) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(true);
      setTimeout(() => setCopiedFile(false), 1500);
    } catch {
      studio.showNotice('Copy failed — clipboard unavailable.');
    }
  }

  return (
    <div>
      {studio.offline.value && (
        <div class={styles.offlineNote} role="status">
          The backend is unreachable. The editor keeps working locally; CSS export below stays
          available. Agent handoffs need a connection (or mock mode in development).
        </div>
      )}

      <section class={ui.section} aria-label="CSS export">
        <h3 class={ui.sectionTitle}>CSS</h3>
        <div class={ui.row}>
          <button class={ui.btn} onClick={() => downloadCss(request.snapshot.generatedCss)}>
            Download .css
          </button>
          <button
            class={ui.btn}
            onClick={() => void navigator.clipboard.writeText(request.snapshot.generatedCss)}
          >
            <CopyIcon />
            Copy CSS
          </button>
          <span class={`${ui.small} ${ui.muted}`}>Free — generated locally</span>
        </div>
      </section>

      <section class={ui.section} aria-label="Agent handoff">
        <h3 class={ui.sectionTitle}>Agent handoff</h3>

        {capabilitiesError && (
          <p class={ui.errorText} role="alert">
            Could not load export options.{' '}
            <button class={`${ui.btn} ${ui.btnSm}`} onClick={() => void loadCapabilities()}>
              Retry
            </button>
          </p>
        )}
        {!capabilities && !capabilitiesError && <p class={ui.muted}>Loading export options…</p>}

        {capabilities && (
          <>
            <div class={styles.targetGrid} role="group" aria-label="Export target">
              {capabilities.targets.map((target) => {
                const meta = TARGET_META[target] ?? { label: target, hint: '' };
                const locked = targetLocked(target);
                return (
                  <button
                    key={target}
                    class={styles.target}
                    aria-pressed={form.target === target}
                    onClick={() => setForm((f) => ({ ...f, target }))}
                  >
                    <span class={styles.targetName}>
                      {meta.label}
                      {locked && <span class={ui.proBadge}>Pro</span>}
                    </span>
                    <span class={styles.targetHint}>{meta.hint}</span>
                  </button>
                );
              })}
            </div>
            {entitlementsLoading && (
              <p class={`${ui.small} ${ui.muted}`}>Checking your plan…</p>
            )}

            <div class={styles.formGrid} style={{ marginTop: 'var(--ss-space-3)' }}>
              <label>
                <span class={ui.label}>Framework</span>
                <select
                  class={ui.select}
                  value={form.framework}
                  onChange={(event) =>
                    setForm((f) => ({
                      ...f,
                      framework: (event.target as HTMLSelectElement)
                        .value as ExportFormState['framework'],
                    }))
                  }
                >
                  {capabilities.frameworks.map((framework) => (
                    <option key={framework} value={framework}>
                      {framework}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span class={ui.label}>Styling</span>
                <select
                  class={ui.select}
                  value={form.styling}
                  onChange={(event) =>
                    setForm((f) => ({
                      ...f,
                      styling: (event.target as HTMLSelectElement)
                        .value as ExportFormState['styling'],
                    }))
                  }
                >
                  {capabilities.styling.map((styling) => (
                    <option key={styling} value={styling}>
                      {styling}
                    </option>
                  ))}
                </select>
              </label>
              <label class={styles.full}>
                <span class={ui.label}>Implementation mode</span>
                <select
                  class={ui.select}
                  value={form.mode}
                  onChange={(event) =>
                    setForm((f) => ({
                      ...f,
                      mode: (event.target as HTMLSelectElement).value as ExportFormState['mode'],
                    }))
                  }
                >
                  {(
                    [
                      'restyle-existing',
                      'generate-new',
                      'tokens-only',
                      'selected-component',
                      'fix-inconsistencies',
                    ] as const
                  ).map((mode) => (
                    <option key={mode} value={mode}>
                      {MODE_LABELS[mode] ?? mode}
                    </option>
                  ))}
                </select>
              </label>
              <label class={styles.full}>
                <span class={ui.label}>Instructions (optional)</span>
                <textarea
                  class={ui.textarea}
                  value={form.instructions}
                  placeholder="Keep the existing layout and functionality."
                  onInput={(event) =>
                    setForm((f) => ({
                      ...f,
                      instructions: (event.target as HTMLTextAreaElement).value,
                    }))
                  }
                />
              </label>
              <label class={`${styles.full} ${ui.checkboxRow}`}>
                <input
                  type="checkbox"
                  checked={form.includeReferenceImage}
                  onChange={(event) =>
                    setForm((f) => ({
                      ...f,
                      includeReferenceImage: (event.target as HTMLInputElement).checked,
                    }))
                  }
                />
                <span class={ui.small}>
                  Include reference screenshot
                  <br />
                  <span class={ui.muted}>
                    Off by default. No image is captured unless you enable this.
                  </span>
                </span>
              </label>
            </div>

            <details class={styles.payload} style={{ margin: 'var(--ss-space-2) 0' }}>
              <summary>What leaves the browser — exact payload</summary>
              <pre class={ui.pre}>{JSON.stringify(request, null, 2)}</pre>
            </details>

            {validationError && (
              <p class={ui.errorText} role="alert">
                {validationError}
              </p>
            )}
            {error && (
              <p class={ui.errorText} role="alert">
                {error.message}{' '}
                <button class={`${ui.btn} ${ui.btnSm}`} onClick={() => void generate()}>
                  Retry
                </button>
              </p>
            )}

            <button
              class={ui.btnPrimary}
              disabled={busy || validationError !== null}
              onClick={() => void generate()}
            >
              {busy ? 'Generating…' : 'Generate preview'}
            </button>
          </>
        )}
      </section>

      {result && (
        <section class={ui.section} aria-label="Export preview result">
          <h3 class={ui.sectionTitle}>Preview — {TARGET_META[result.target]?.label}</h3>
          <div class={styles.fileTabs} role="group" aria-label="Generated files">
            {Object.keys(result.files).map((file) => (
              <button
                key={file}
                class={styles.fileTab}
                aria-pressed={activeFile === file}
                onClick={() => setActiveFile(file)}
              >
                {file}
              </button>
            ))}
          </div>
          {activeFile && <pre class={ui.pre}>{result.files[activeFile]}</pre>}
          <div class={styles.resultActions}>
            <button class={ui.btn} onClick={() => void copyActiveFile()}>
              <CopyIcon />
              {copiedFile ? 'Copied' : 'Copy file'}
            </button>
            {result.handoffUrl && (
              <a class={ui.btnPrimary} href={result.handoffUrl} target="_blank" rel="noreferrer">
                <ExternalIcon />
                Open in Lovable
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
