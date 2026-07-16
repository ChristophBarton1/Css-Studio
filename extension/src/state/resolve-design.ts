import type { ColorToken, DesignSnapshot, StylePatch, TypographyToken } from '../types';

export type Density = 'compact' | 'default' | 'comfortable';
export type CornerStyle = 'sharp' | 'soft' | 'rounded';
export type ShadowStyle = 'none' | 'subtle' | 'elevated';

export interface GlobalStyle {
  density: Density;
  corner: CornerStyle;
  shadow: ShadowStyle;
}

export const DEFAULT_GLOBAL_STYLE: GlobalStyle = {
  density: 'default',
  corner: 'soft',
  shadow: 'subtle',
};

/** The current working design: base snapshot with all history patches folded in. */
export interface ResolvedDesign {
  colors: ColorToken[];
  typography: TypographyToken[];
  global: GlobalStyle;
  /** Per-selector CSS property overrides from the Elements tab. */
  elements: Record<string, Record<string, string>>;
  /** User-authored CSS from the Code tab. */
  customCss: string;
  presetName: string | null;
  /** e.g. `color:primary`, `typography:h1`, `element:.hero .btn`, `global:corner` */
  changedTargets: Set<string>;
}

const TYPOGRAPHY_PROPS = new Set([
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textTransform',
]);

export function resolveDesign(
  snapshot: DesignSnapshot | null,
  patches: readonly StylePatch[],
): ResolvedDesign | null {
  if (!snapshot) return null;

  const design: ResolvedDesign = {
    colors: snapshot.colors.map((color) => ({ ...color })),
    typography: snapshot.typography.map((token) => ({ ...token })),
    global: { ...DEFAULT_GLOBAL_STYLE },
    elements: {},
    customCss: '',
    presetName: null,
    changedTargets: new Set<string>(),
  };

  for (const patch of patches) {
    for (const change of patch.changes) {
      switch (change.kind) {
        case 'color': {
          const color = design.colors.find((c) => c.name === change.target);
          if (color) {
            color.value = change.value;
            design.changedTargets.add(`color:${change.target}`);
          }
          break;
        }
        case 'typography': {
          const token = design.typography.find((t) => t.role === change.target);
          if (token && TYPOGRAPHY_PROPS.has(change.property)) {
            if (change.property === 'fontWeight') {
              const weight = Number.parseInt(change.value, 10);
              if (!Number.isNaN(weight)) token.fontWeight = weight;
            } else {
              (token as unknown as Record<string, string>)[change.property] = change.value;
            }
            design.changedTargets.add(`typography:${change.target}`);
          }
          break;
        }
        case 'global': {
          if (change.target === 'density') design.global.density = change.value as Density;
          else if (change.target === 'corner') design.global.corner = change.value as CornerStyle;
          else if (change.target === 'shadow') design.global.shadow = change.value as ShadowStyle;
          design.changedTargets.add(`global:${change.target}`);
          break;
        }
        case 'element': {
          const overrides = (design.elements[change.target] ??= {});
          overrides[change.property] = change.value;
          design.changedTargets.add(`element:${change.target}`);
          break;
        }
        case 'css': {
          design.customCss = change.value;
          design.changedTargets.add('css:custom');
          break;
        }
        case 'meta': {
          if (change.target === 'preset') {
            design.presetName = change.value === 'original' ? null : change.value;
          }
          break;
        }
      }
    }
  }

  return design;
}
