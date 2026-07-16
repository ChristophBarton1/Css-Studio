/** Message contract between the side panel and the in-page core. */
import type { DesignSnapshot, SelectedElement, TypographyToken } from '../types';
import type { CornerStyle, Density, ResolvedDesign, ShadowStyle } from '../state/resolve-design';

/**
 * The panel resolves its patch history into this serializable diff; the page
 * side only renders it. Only *changed* values are included so untouched parts
 * of the page keep their original styles.
 */
export interface ApplyPayload {
  /** color token name → new value */
  colors: Record<string, string>;
  /** full current values for roles the user changed */
  typography: TypographyToken[];
  global: {
    corner?: CornerStyle;
    shadow?: ShadowStyle;
    density?: Density;
  };
  /** selector → css property → value */
  elements: Record<string, Record<string, string>>;
  customCss: string;
}

export type CoreRequest =
  | { type: 'ss:ping' }
  | { type: 'ss:analyze' }
  | { type: 'ss:apply'; payload: ApplyPayload }
  | { type: 'ss:reset' }
  | { type: 'ss:select' };

export type CoreResponse<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

export type AnalyzeResult = Omit<DesignSnapshot, 'id' | 'capturedAt'>;
export type SelectResult = SelectedElement;

/** Extracts the changed-only diff from the resolved design. */
export function buildApplyPayload(design: ResolvedDesign): ApplyPayload {
  const payload: ApplyPayload = {
    colors: {},
    typography: [],
    global: {},
    elements: design.elements,
    customCss: design.customCss,
  };

  for (const target of design.changedTargets) {
    const [kind, ...rest] = target.split(':');
    const name = rest.join(':');
    if (kind === 'color') {
      const color = design.colors.find((c) => c.name === name);
      if (color) payload.colors[name] = color.value;
    } else if (kind === 'typography') {
      const token = design.typography.find((t) => t.role === name);
      if (token) payload.typography.push(token);
    } else if (kind === 'global') {
      if (name === 'corner') payload.global.corner = design.global.corner;
      else if (name === 'shadow') payload.global.shadow = design.global.shadow;
      else if (name === 'density') payload.global.density = design.global.density;
    }
  }

  return payload;
}
