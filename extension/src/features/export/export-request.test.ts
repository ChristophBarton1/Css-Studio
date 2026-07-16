import { describe, expect, it } from 'vitest';
import { MOCK_SNAPSHOT } from '../../core/mock-data';
import { createColorPatch } from '../../state/patches';
import { resolveDesign } from '../../state/resolve-design';
import {
  buildExportRequest,
  DEFAULT_FORM,
  toApiSnapshot,
  validateExportForm,
} from './export-request';

const primary = MOCK_SNAPSHOT.colors[0]!;

describe('toApiSnapshot', () => {
  it('strips UI-only metadata (occurrences, detected elements)', () => {
    const design = resolveDesign(MOCK_SNAPSHOT, [])!;
    const api = toApiSnapshot(design, MOCK_SNAPSHOT, 'Test');
    expect(api.colors.every((c) => !('occurrences' in c))).toBe(true);
    expect(api.typography.every((t) => !('occurrences' in t) && !('letterSpacing' in t))).toBe(true);
    expect('elements' in api).toBe(false);
  });

  it('reflects edits in values, generated CSS, and changed selectors', () => {
    const design = resolveDesign(MOCK_SNAPSHOT, [createColorPatch(primary, '#FF0000')])!;
    const api = toApiSnapshot(design, MOCK_SNAPSHOT, 'Test');
    expect(api.colors.find((c) => c.name === 'primary')?.value).toBe('#FF0000');
    expect(api.generatedCss).toContain('--ss-color-primary: #ff0000;');
    expect(api.changedSelectors).toContain(':root');
  });
});

describe('buildExportRequest', () => {
  it('defaults includeReferenceImage to off and trims instructions', () => {
    const design = resolveDesign(MOCK_SNAPSHOT, [])!;
    const request = buildExportRequest(
      'free',
      { ...DEFAULT_FORM, instructions: '  keep layout  ' },
      design,
      MOCK_SNAPSHOT,
    );
    expect(request.includeReferenceImage).toBe(false);
    expect(request.instructions).toBe('keep layout');
    expect(request.plan).toBe('free');
    expect(request.target).toBe('universal');
  });
});

describe('validateExportForm', () => {
  it('accepts the default form', () => {
    expect(validateExportForm(DEFAULT_FORM)).toBeNull();
  });

  it('rejects oversized instructions', () => {
    expect(
      validateExportForm({ ...DEFAULT_FORM, instructions: 'x'.repeat(10_001) }),
    ).toMatch(/10,000|10.000/);
  });
});
