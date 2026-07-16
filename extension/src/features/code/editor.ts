/**
 * CodeMirror wrapper. This module is ONLY loaded via dynamic `import()` from
 * `CodeTab.tsx`, so CodeMirror stays out of the initial side-panel bundle.
 */
import { css } from '@codemirror/lang-css';
import { EditorView, basicSetup } from 'codemirror';

export interface CssEditor {
  view: EditorView;
  getValue(): string;
  setValue(value: string): void;
  destroy(): void;
}

export function createCssEditor(
  parent: HTMLElement,
  initialDoc: string,
  onChange: (doc: string) => void,
): CssEditor {
  const view = new EditorView({
    doc: initialDoc,
    parent,
    extensions: [
      basicSetup,
      css(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange(update.state.doc.toString());
      }),
      EditorView.theme({
        '&': { fontSize: '12.5px', maxHeight: '260px' },
        '.cm-scroller': { fontFamily: 'var(--ss-font-mono)' },
        '&.cm-focused': { outline: '2px solid var(--ss-accent)' },
      }),
    ],
  });

  return {
    view,
    getValue: () => view.state.doc.toString(),
    setValue: (value: string) =>
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } }),
    destroy: () => view.destroy(),
  };
}

/** Naive CSS pretty-printer — enough for milestone one. */
export function formatCss(source: string): string {
  const compact = source.replace(/\s+/g, ' ').trim();
  let out = '';
  let indent = 0;
  for (const char of compact) {
    if (char === '{') {
      out = `${out.trimEnd()} {\n${'  '.repeat(indent + 1)}`;
      indent += 1;
    } else if (char === '}') {
      indent = Math.max(0, indent - 1);
      out = `${out.trimEnd()}\n${'  '.repeat(indent)}}\n${'  '.repeat(indent)}`;
    } else if (char === ';') {
      out = `${out.trimEnd()};\n${'  '.repeat(indent)}`;
    } else {
      out += char;
    }
  }
  return `${out.trim()}\n`;
}
