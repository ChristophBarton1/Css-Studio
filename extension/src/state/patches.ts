import type { ColorToken, StyleChange, StylePatch, TypographyToken } from '../types';
import type { GlobalStyle } from './resolve-design';

let patchCounter = 0;

export function createPatchId(): string {
  patchCounter += 1;
  return `patch_${patchCounter}_${Date.now().toString(36)}`;
}

export function createPatch(label: string, changes: StyleChange[]): StylePatch {
  return {
    id: createPatchId(),
    label,
    changes: changes.filter((change) => change.value !== change.previousValue),
  };
}

export function colorChange(color: ColorToken, value: string): StyleChange {
  return {
    kind: 'color',
    target: color.name,
    property: 'value',
    value,
    previousValue: color.value,
  };
}

export function createColorPatch(color: ColorToken, value: string): StylePatch {
  return createPatch(`Changed ${color.name} color`, [colorChange(color, value)]);
}

export function typographyChange(
  token: TypographyToken,
  property: 'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing' | 'textTransform',
  value: string,
): StyleChange {
  const previous = token[property];
  return {
    kind: 'typography',
    target: token.role,
    property,
    value,
    previousValue: previous === undefined ? '' : String(previous),
  };
}

export function createGlobalStylePatch(
  key: keyof GlobalStyle,
  value: string,
  previousValue: string,
): StylePatch {
  const labels: Record<keyof GlobalStyle, string> = {
    density: 'Changed density',
    corner: 'Changed corner style',
    shadow: 'Changed shadow style',
  };
  return createPatch(labels[key], [
    { kind: 'global', target: key, property: key, value, previousValue },
  ]);
}

export function createElementPatch(
  selector: string,
  property: string,
  value: string,
  previousValue: string,
  label: string,
): StylePatch {
  return createPatch(label, [
    { kind: 'element', target: selector, property, value, previousValue },
  ]);
}

export function createCustomCssPatch(css: string, previousCss: string): StylePatch {
  return createPatch('Edited custom CSS', [
    { kind: 'css', target: 'custom', property: 'css', value: css, previousValue: previousCss },
  ]);
}
