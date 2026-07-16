import type { StyleChange, StylePatch } from '../../types';
import { createPatch } from '../../state/patches';
import type { ResolvedDesign } from '../../state/resolve-design';
import { DEFAULT_GLOBAL_STYLE, type GlobalStyle } from '../../state/resolve-design';

export interface Preset {
  name: string;
  label: string;
  description: string;
  /** Swatches for the preset card. */
  swatches: [string, string, string];
  colorOverrides: Record<string, string>;
  typographyOverrides: Record<string, Partial<Record<'fontFamily' | 'fontWeight', string>>>;
  global: Partial<GlobalStyle>;
}

export const PRESETS: Preset[] = [
  {
    name: 'original',
    label: 'Original',
    description: 'Back to the detected design',
    swatches: ['#6C5CE7', '#FFFFFF', '#18181B'],
    colorOverrides: {},
    typographyOverrides: {},
    global: {},
  },
  {
    name: 'modern-saas',
    label: 'Modern SaaS',
    description: 'Indigo, generous radius, soft depth',
    swatches: ['#6366F1', '#F8FAFC', '#0F172A'],
    colorOverrides: {
      primary: '#6366F1',
      'primary-hover': '#4F46E5',
      surface: '#F8FAFC',
      text: '#0F172A',
      'text-muted': '#64748B',
      border: '#E2E8F0',
    },
    typographyOverrides: {
      h1: { fontWeight: '800' },
      h2: { fontWeight: '700' },
    },
    global: { corner: 'rounded', shadow: 'subtle' },
  },
  {
    name: 'editorial',
    label: 'Editorial',
    description: 'Serif headings, sharp corners, ink on paper',
    swatches: ['#1F2937', '#FCFBF8', '#B45309'],
    colorOverrides: {
      primary: '#1F2937',
      'primary-hover': '#111827',
      background: '#FCFBF8',
      surface: '#F6F4EE',
      text: '#111827',
      border: '#DDD8CC',
    },
    typographyOverrides: {
      h1: { fontFamily: 'Georgia, "Times New Roman", serif' },
      h2: { fontFamily: 'Georgia, "Times New Roman", serif' },
      h3: { fontFamily: 'Georgia, "Times New Roman", serif' },
    },
    global: { corner: 'sharp', shadow: 'none' },
  },
  {
    name: 'soft-minimal',
    label: 'Soft Minimal',
    description: 'Muted pastels, airy spacing, no shadows',
    swatches: ['#8B8BF5', '#FBFBFE', '#4B4B57'],
    colorOverrides: {
      primary: '#8B8BF5',
      'primary-hover': '#7A7AE8',
      background: '#FBFBFE',
      surface: '#F5F5FA',
      text: '#4B4B57',
      'text-muted': '#9494A5',
      border: '#ECECF4',
    },
    typographyOverrides: {
      h1: { fontWeight: '600' },
      h2: { fontWeight: '600' },
    },
    global: { density: 'comfortable', corner: 'rounded', shadow: 'none' },
  },
  {
    name: 'high-contrast',
    label: 'High Contrast',
    description: 'Maximum legibility, strong borders',
    swatches: ['#4338CA', '#FFFFFF', '#000000'],
    colorOverrides: {
      primary: '#4338CA',
      'primary-hover': '#3730A3',
      background: '#FFFFFF',
      surface: '#FFFFFF',
      text: '#000000',
      'text-muted': '#374151',
      border: '#111827',
    },
    typographyOverrides: {
      h1: { fontWeight: '800' },
      body: { fontWeight: '500' },
    },
    global: { corner: 'sharp', shadow: 'none' },
  },
];

/**
 * Builds ONE undoable patch that moves the current design to the preset —
 * including reverting overrides the preset does not define.
 */
export function buildPresetPatch(
  preset: Preset,
  current: ResolvedDesign,
  original: ResolvedDesign,
): StylePatch {
  const changes: StyleChange[] = [];

  for (const color of current.colors) {
    const originalValue = original.colors.find((c) => c.name === color.name)?.value ?? color.value;
    const target = preset.colorOverrides[color.name] ?? originalValue;
    changes.push({
      kind: 'color',
      target: color.name,
      property: 'value',
      value: target,
      previousValue: color.value,
    });
  }

  for (const token of current.typography) {
    const originalToken = original.typography.find((t) => t.role === token.role);
    const overrides = preset.typographyOverrides[token.role] ?? {};
    const targetFamily = overrides.fontFamily ?? originalToken?.fontFamily ?? token.fontFamily;
    const targetWeight = overrides.fontWeight ?? String(originalToken?.fontWeight ?? token.fontWeight);
    changes.push({
      kind: 'typography',
      target: token.role,
      property: 'fontFamily',
      value: targetFamily,
      previousValue: token.fontFamily,
    });
    changes.push({
      kind: 'typography',
      target: token.role,
      property: 'fontWeight',
      value: targetWeight,
      previousValue: String(token.fontWeight),
    });
  }

  for (const key of ['density', 'corner', 'shadow'] as const) {
    const target = preset.global[key] ?? DEFAULT_GLOBAL_STYLE[key];
    changes.push({
      kind: 'global',
      target: key,
      property: key,
      value: target,
      previousValue: current.global[key],
    });
  }

  changes.push({
    kind: 'meta',
    target: 'preset',
    property: 'name',
    value: preset.name,
    previousValue: current.presetName ?? 'original',
  });

  return createPatch(`Applied ${preset.label} preset`, changes);
}
