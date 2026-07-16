import { describe, expect, it } from 'vitest';
import { MOCK_SNAPSHOT } from '../core/mock-data';
import { createColorPatch, createGlobalStylePatch } from './patches';
import { resolveDesign } from './resolve-design';

const primary = MOCK_SNAPSHOT.colors[0]!;

describe('resolveDesign', () => {
  it('returns null without a snapshot', () => {
    expect(resolveDesign(null, [])).toBeNull();
  });

  it('folds a color change onto the snapshot', () => {
    const design = resolveDesign(MOCK_SNAPSHOT, [createColorPatch(primary, '#FF0000')]);
    expect(design?.colors.find((c) => c.name === 'primary')?.value).toBe('#FF0000');
    expect(design?.changedTargets.has('color:primary')).toBe(true);
  });

  it('removing the patch restores the original value', () => {
    const design = resolveDesign(MOCK_SNAPSHOT, []);
    expect(design?.colors.find((c) => c.name === 'primary')?.value).toBe(primary.value);
    expect(design?.changedTargets.size).toBe(0);
  });

  it('later patches win over earlier ones', () => {
    const design = resolveDesign(MOCK_SNAPSHOT, [
      createColorPatch(primary, '#FF0000'),
      createColorPatch({ ...primary, value: '#FF0000' }, '#00FF00'),
    ]);
    expect(design?.colors.find((c) => c.name === 'primary')?.value).toBe('#00FF00');
  });

  it('applies global style changes', () => {
    const design = resolveDesign(MOCK_SNAPSHOT, [
      createGlobalStylePatch('corner', 'rounded', 'soft'),
    ]);
    expect(design?.global.corner).toBe('rounded');
    expect(design?.global.density).toBe('default');
  });
});
