import type { ColorToken } from '../../types';

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed
      .split('')
      .map((c) => c + c)
      .join('')
      .toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toUpperCase()}`;
  }
  return null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

export function rgbLabel(hex: string): string {
  const rgb = hexToRgb(hex);
  return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : hex;
}

function distance(a: string, b: string): number {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) return Number.POSITIVE_INFINITY;
  return Math.sqrt((rgbA.r - rgbB.r) ** 2 + (rgbA.g - rgbB.g) ** 2 + (rgbA.b - rgbB.b) ** 2);
}

/** Finds visually near-identical color pairs (Pro consolidation suggestion). */
export function findNearDuplicates(
  colors: ColorToken[],
  threshold = 16,
): Array<[ColorToken, ColorToken]> {
  const pairs: Array<[ColorToken, ColorToken]> = [];
  for (let i = 0; i < colors.length; i += 1) {
    for (let j = i + 1; j < colors.length; j += 1) {
      const a = colors[i];
      const b = colors[j];
      if (a && b && distance(a.value, b.value) <= threshold) {
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
}

export const COLOR_ROLE_ORDER = [
  'brand',
  'background',
  'surface',
  'foreground',
  'muted-foreground',
  'border',
  'success',
  'warning',
  'danger',
];

export const COLOR_ROLE_LABELS: Record<string, string> = {
  brand: 'Brand',
  background: 'Background',
  surface: 'Surface',
  foreground: 'Foreground',
  'muted-foreground': 'Muted foreground',
  border: 'Border',
  success: 'Success',
  warning: 'Warning',
  danger: 'Danger',
};
